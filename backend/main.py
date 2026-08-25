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

class SendCodeRequest(BaseModel):
    phone_number: str

class VerifyCodeRequest(BaseModel):
    phone_number: str
    phone_code_hash: str
    phone_code: str

temp_clients = {}

queue_list = []
queue_lock = asyncio.Lock()
ticket_status = {}

async def process_vote_queue():
    while True:
        if not queue_list:
            await asyncio.sleep(1)
            continue
            
        async with queue_lock:
            ticket_id, request_data = queue_list.pop(0)
            
        ticket_status[ticket_id]["status"] = "PROCESSING"
        
        # 1. Verificar si ya votó
        if supabase is None:
            ticket_status[ticket_id] = {"status": "ERROR", "message": "Error de conexión con la base de datos."}
            continue
            
        try:
            response = supabase.table('votos').select('id').eq('dni', request_data.dni).execute()
            if len(response.data) > 0:
                ticket_status[ticket_id] = {"status": "ERROR", "message": "Este DNI ya ha emitido un voto."}
                continue
        except Exception as e:
            print(f"Error DB (verificación): {e}")
            ticket_status[ticket_id] = {"status": "ERROR", "message": "Error interno al verificar el DNI."}
            continue
            
        # 2. Consultar a Telegram MTProto (Userbot)
        try:
            # Agregamos un timeout estricto de 40s a nivel del worker para evitar que un cuelgue de red bloquee toda la cola
            validation = await asyncio.wait_for(
                validator.consultar_dni(request_data.dni, request_data.digito_verificador),
                timeout=40.0
            )
        except asyncio.TimeoutError:
            print("Timeout del worker esperando a Telegram.")
            ticket_status[ticket_id] = {"status": "ERROR", "message": "Tiempo de espera agotado. Los servidores de validación JNE/RENIEC están muy saturados."}
            continue
        except Exception as e:
            print(f"Error técnico consultando a Telegram: {e}")
            ticket_status[ticket_id] = {"status": "ERROR", "message": "Los servidores de validación JNE/RENIEC están experimentando demoras."}
            continue
            
        if not validation.get("success"):
            ticket_status[ticket_id] = {"status": "ERROR", "message": validation.get("error", "Error en la validación.")}
            continue
            
        # 3. Registrar Voto
        try:
            supabase.table('votos').insert({
                'dni': request_data.dni,
                'opcion_id': request_data.opcion_id
            }).execute()
            ticket_status[ticket_id] = {"status": "SUCCESS", "message": "¡Tu voto ha sido registrado exitosamente!"}
        except Exception as e:
            print(f"Error DB (inserción): {e}")
            ticket_status[ticket_id] = {"status": "ERROR", "message": "Error interno al registrar el voto en los servidores centrales."}


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(process_vote_queue())

@app.on_event("shutdown")
async def shutdown_event():
    if validator.client and validator.client.is_connected():
        await validator.client.disconnect()

@app.post("/api/vote/enqueue")
async def enqueue_vote(request: VoteRequest):
    ticket_id = str(uuid.uuid4())
    ticket_status[ticket_id] = {"status": "IN_QUEUE", "message": "En cola"}
    
    async with queue_lock:
        queue_list.append((ticket_id, request))
        
    return {"ticket_id": ticket_id}

@app.get("/api/vote/status/{ticket_id}")
async def get_vote_status(ticket_id: str):
    if ticket_id not in ticket_status:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
        
    status = ticket_status[ticket_id]["status"]
    message = ticket_status[ticket_id].get("message", "")
    
    position = 0
    if status == "IN_QUEUE":
        async with queue_lock:
            for i, (tid, req) in enumerate(queue_list):
                if tid == ticket_id:
                    position = i + 1
                    break
                    
    return {"status": status, "position": position, "message": message}

@app.get("/api/vote/queue-length")
async def get_queue_length():
    async with queue_lock:
        length = len(queue_list)
    return {"length": length}

# El endpoint antiguo /api/vote lo quitamos o dejamos para retrocompatibilidad, pero lo ideal es usar enqueue.
@app.post("/api/vote")
async def vote(request: VoteRequest):
    raise HTTPException(status_code=400, detail="Por favor, actualice la página. El sistema de votación ha sido actualizado con un sistema de cola.")


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
