from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from telegram_service import TelegramValidator
import os
from dotenv import load_dotenv
from supabase_client import supabase
import uuid
import asyncio

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

validator = TelegramValidator()

class VoteRequest(BaseModel):
    dni: str
    digito_verificador: str
    opcion_id: str
    user_token: str

def check_modulo_11(dni: str, dv: str) -> bool:
    if len(dni) != 8 or not dni.isdigit():
        return False
    multipliers = [3, 2, 7, 6, 5, 4, 3, 2]
    total = sum(int(d) * m for d, m in zip(dni, multipliers))
    mod = total % 11
    lookup = "67890112345"
    try:
        expected = lookup[mod]
        if dv.upper() == 'K' and expected == '1':
            return True
        return dv == expected
    except:
        return False

class SendCodeRequest(BaseModel):
    phone_number: str

class VerifyCodeRequest(BaseModel):
    phone_number: str
    phone_code_hash: str
    phone_code: str

async def process_vote_queue():
    while True:
        try:
            if supabase is None:
                await asyncio.sleep(5)
                continue
                
            # Buscar 1 ticket pendiente
            response = supabase.table('cola_votos').select('*').eq('estado', 'pendiente').order('created_at').limit(1).execute()
            
            if not response.data:
                await asyncio.sleep(2)
                continue
                
            ticket = response.data[0]
            ticket_id = ticket['id']
            dni = ticket['dni']
            dv = ticket.get('dv', ticket.get('digito_verificador', '')) # Support both column names just in case
            
            # Cambiar a procesando
            supabase.table('cola_votos').update({"estado": "procesando", "mensaje": "Validando con JNE/RENIEC..."}).eq('id', ticket_id).execute()
            
            # 1. Verificar si ya votó
            voto_resp = supabase.table('votos').select('id').eq('dni', dni).execute()
            if len(voto_resp.data) > 0:
                supabase.table('cola_votos').update({"estado": "rechazado", "mensaje": "Este DNI ya ha emitido un voto."}).eq('id', ticket_id).execute()
                await asyncio.sleep(5)
                continue
                
            # 2. Consultar a Telegram MTProto (Userbot)
            try:
                # Timeout estricto de 30s
                validation = await asyncio.wait_for(
                    validator.consultar_dni(dni, dv),
                    timeout=30.0
                )
            except asyncio.TimeoutError:
                print("Timeout del worker esperando a Telegram.")
                supabase.table('cola_votos').update({"estado": "rechazado", "mensaje": "Tiempo de espera agotado. Los servidores de validación están muy saturados."}).eq('id', ticket_id).execute()
                await asyncio.sleep(5)
                continue
            except Exception as e:
                print(f"Error técnico consultando a Telegram: {e}")
                supabase.table('cola_votos').update({"estado": "rechazado", "mensaje": "Los servidores de validación están experimentando demoras."}).eq('id', ticket_id).execute()
                await asyncio.sleep(5)
                continue
                
            if not validation.get("success"):
                supabase.table('cola_votos').update({"estado": "rechazado", "mensaje": validation.get("error", "Error en la validación.")}).eq('id', ticket_id).execute()
                await asyncio.sleep(5)
                continue
                
            # 3. Registrar Voto
            try:
                supabase.table('votos').insert({
                    'dni': dni,
                    'opcion_id': ticket['candidato_id']
                }).execute()
                supabase.table('cola_votos').update({"estado": "aprobado", "mensaje": "¡Tu voto ha sido registrado exitosamente!"}).eq('id', ticket_id).execute()
            except Exception as e:
                print(f"Error DB (inserción): {e}")
                supabase.table('cola_votos').update({"estado": "rechazado", "mensaje": "Error interno al registrar el voto en los servidores centrales."}).eq('id', ticket_id).execute()

            # Cooldown anti-spam (5 segundos requeridos por la arquitectura)
            await asyncio.sleep(5)
            
        except Exception as e:
            print(f"Error general en el worker: {e}")
            await asyncio.sleep(5)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(process_vote_queue())

@app.on_event("shutdown")
async def shutdown_event():
    if validator.client and validator.client.is_connected():
        await validator.client.disconnect()

@app.post("/api/votar")
async def enqueue_vote(request: VoteRequest):
    # Validación matemática rigurosa Modulo 11
    if not check_modulo_11(request.dni, request.digito_verificador):
        raise HTTPException(status_code=400, detail="El DNI o el dígito verificador son inválidos matemáticamente. Posible intento de spam.")
        
    try:
        response = supabase.table('cola_votos').insert({
            'dni': request.dni,
            'dv': request.digito_verificador,
            'candidato_id': request.opcion_id,
            'user_token': request.user_token,
            'estado': 'pendiente',
            'mensaje': 'En cola de validación'
        }).execute()
        
        return JSONResponse(status_code=202, content={"message": "Ticket encolado exitosamente", "ticket_id": response.data[0]['id']})
    except Exception as e:
        error_msg = str(e)
        print(f"Error encolando: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {error_msg}. Verifica si creaste la tabla 'cola_votos'.")

@app.get("/api/cola/{user_token}")
async def get_queue_status(user_token: str):
    try:
        response = supabase.table('cola_votos').select('*').eq('user_token', user_token).order('created_at', desc=True).execute()
        return response.data
    except Exception as e:
        print(f"Error obteniendo cola: {e}")
        return []



@app.get("/api/results")
async def get_results():
    if supabase is None:
        return JSONResponse(status_code=500, content={"detail": "Error de base de datos local."})
        
    try:
        # Get all candidates
        cand_response = supabase.table('candidatos').select('*').neq('name', '___telegram_session___').order('id').execute()
        candidates = cand_response.data or []
        
        # Get all votes
        votes_response = supabase.table('votos').select('opcion_id').execute()
        votes = votes_response.data or []
        
        # Count votes
        vote_counts = {}
        for v in votes:
            vote_counts[v['opcion_id']] = vote_counts.get(v['opcion_id'], 0) + 1
            
        results = []
        for i, c in enumerate(candidates):
            results.append({
                "name": f"Candidato {i+1}",
                "votos": vote_counts.get(c['id'], 0)
            })
            
        return results
    except Exception as e:
        print(f"Error fetching results: {e}")
        return []

@app.post("/api/telegram/send-code")
async def telegram_send_code(request: SendCodeRequest):
    result = await validator.send_code(request.phone_number)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result

@app.post("/api/telegram/verify-code")
async def telegram_verify_code(request: VerifyCodeRequest):
    result = await validator.verify_code(request.phone_number, request.phone_code_hash, request.phone_code)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
