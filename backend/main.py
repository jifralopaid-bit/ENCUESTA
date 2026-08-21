from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from telegram_service import TelegramValidator
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase init
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_ANON_KEY")

if not supabase_url or not supabase_key:
    raise RuntimeError("Faltan credenciales de Supabase en el archivo .env")

supabase: Client = create_client(supabase_url, supabase_key)

validator = TelegramValidator()

class VoteRequest(BaseModel):
    ticket: str
    control_digit: str
    option_id: int

@app.on_event("startup")
async def startup_event():
    await validator.start()

@app.on_event("shutdown")
async def shutdown_event():
    await validator.stop()

@app.post("/api/vote")
async def vote(request: VoteRequest):
    # 1. Verificar si ya votó
    response = supabase.table('votos').select('id').eq('dni', request.ticket).execute()
    if len(response.data) > 0:
        raise HTTPException(status_code=400, detail="Este DNI ya ha emitido un voto.")

    # 2. Consultar a Telegram MTProto (Userbot)
    try:
        validation = await validator.validate_dni(request.ticket, request.control_digit)
    except Exception as e:
        print(f"Error consultando a Telegram: {e}")
        raise HTTPException(status_code=500, detail="El bot validador de RENIEC no respondió a tiempo.")

    if not validation["valid"]:
        raise HTTPException(status_code=400, detail=validation["message"])

    # 3. Registrar Voto
    try:
        supabase.table('votos').insert({
            'dni': request.ticket,
            'opcion_id': request.option_id
        }).execute()
    except Exception as e:
        print(f"Error insertando voto: {e}")
        raise HTTPException(status_code=500, detail="Error al registrar el voto en la base de datos.")

    return {"success": True, "message": "¡Tu voto ha sido registrado exitosamente!"}
