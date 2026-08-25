from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from telegram_service import TelegramValidator
import os
from dotenv import load_dotenv
from supabase_client import supabase

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

@app.on_event("startup")
async def startup_event():
    try:
        await validator.start()
    except Exception as e:
        print(f"Advertencia: No se pudo iniciar Telegram en el arranque. Detalles: {e}")
        # NO crashear la aplicación. La API debe seguir viva aunque Telegram falle.

@app.on_event("shutdown")
async def shutdown_event():
    await validator.stop()

@app.post("/api/vote")
async def vote(request: VoteRequest):
    if supabase is None:
        return JSONResponse(status_code=500, content={"detail": "Error de base de datos local."})

    # 1. Verificar si ya votó
    try:
        response = supabase.table('votos').select('id').eq('dni', request.dni).execute()
        if len(response.data) > 0:
            raise HTTPException(status_code=400, detail="Este DNI ya ha emitido un voto.")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error DB (verificación): {e}")
        return JSONResponse(status_code=500, content={"detail": f"Error interno de base de datos: {str(e)}"})

    # 2. Consultar a Telegram MTProto (Userbot)
    try:
        validation = await validator.validate_dni(request.dni, request.digito_verificador)
    except Exception as e:
        print(f"Error consultando a Telegram: {e}")
        raise HTTPException(status_code=500, detail="El bot validador de RENIEC no respondió a tiempo.")

    if not validation["valid"]:
        raise HTTPException(status_code=400, detail=validation["message"])

    # 3. Registrar Voto
    try:
        supabase.table('votos').insert({
            'dni': request.dni,
            'opcion_id': request.opcion_id
        }).execute()
    except Exception as e:
        print(f"Error DB (inserción): {e}")
        return JSONResponse(status_code=500, content={"detail": f"Error interno de base de datos: {str(e)}"})

    return {"success": True, "message": "¡Tu voto ha sido registrado exitosamente!"}

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

from telethon import TelegramClient
from telethon.sessions import StringSession

@app.post("/api/telegram/send-code")
async def send_code(req: SendCodeRequest):
    if supabase is None:
        raise HTTPException(status_code=500, detail="Base de datos no conectada")
    
    client = TelegramClient(StringSession(''), validator.api_id, validator.api_hash)
    await client.connect()
    
    try:
        sent = await client.send_code_request(req.phone_number)
        temp_clients[req.phone_number] = client
        return {"phone_code_hash": sent.phone_code_hash}
    except Exception as e:
        await client.disconnect()
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/telegram/verify-code")
async def verify_code(req: VerifyCodeRequest):
    if req.phone_number not in temp_clients:
        raise HTTPException(status_code=400, detail="Debe solicitar un código SMS primero.")
        
    client = temp_clients[req.phone_number]
    
    try:
        await client.sign_in(req.phone_number, req.phone_code, phone_code_hash=req.phone_code_hash)
        session_string = client.session.save()
        
        if supabase:
            supabase.table('configuracion').update({'telegram_session': session_string}).eq('id', 1).execute()
            
        # Reiniciar validador principal
        await validator.stop()
        await validator.start()
        
        # Cleanup
        del temp_clients[req.phone_number]
        
        return {"success": True, "message": "Bot conectado exitosamente a través del backend."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
