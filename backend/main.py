from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
import asyncio
from contextlib import asynccontextmanager

from telegram_service import start_telegram_client, consultar_ticket_bot
from validator import extract_data_from_bot_response, validate_vote_rules
from supabase_client import check_ticket_used, register_vote, get_results

# Definición del ciclo de vida de la app para iniciar Telethon
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Iniciando aplicación y conectando a Telegram...")
    # Creamos un task para no bloquear el arranque completo si requiere input (aunque si requiere input, bloqueará aquí en terminal)
    # Lo ideal es que el usuario haya ejecutado un script de login primero, pero lo hacemos aquí para el MVP.
    await start_telegram_client()
    yield
    # Shutdown (cerrar cliente etc si fuera necesario, Telethon maneja salidas graciosas)
    print("Apagando aplicación...")

app = FastAPI(title="La Peca Voting API", lifespan=lifespan)

# Configurar CORS para permitir que el frontend local se comunique
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, restringir al dominio del frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos Pydantic para los requests
class VoteRequest(BaseModel):
    ticket: str = Field(..., min_length=8, max_length=8, description="Número de ticket de 8 dígitos")
    control_digit: str = Field(..., min_length=1, max_length=1, description="Dígito o letra de control")
    option_id: int = Field(..., ge=1, le=5, description="ID del candidato (1-5)")

class VoteResponse(BaseModel):
    success: bool
    message: str

@app.post("/api/vote", response_model=VoteResponse)
async def submit_vote(vote: VoteRequest):
    # 1. Verificar si el ticket ya fue usado en la BD
    if check_ticket_used(vote.ticket):
        raise HTTPException(status_code=400, detail="Este ticket ya ha sido utilizado para votar.")

    # 2. Consultar al bot de Telegram
    bot_response_text = await consultar_ticket_bot(vote.ticket)
    if not bot_response_text:
         raise HTTPException(status_code=500, detail="No se pudo obtener respuesta del bot validador de Telegram.")

    # 3. Extraer datos con Regex
    bot_control_digit, bot_score, bot_location = extract_data_from_bot_response(bot_response_text)
    print(f"[VALIDACIÓN] Datos extraídos -> Dígito: '{bot_control_digit}', Edad: {bot_score}, Distrito: '{bot_location}'")

    # 4. Validar reglas de negocio
    is_valid, validation_message = validate_vote_rules(
        input_ticket=vote.ticket,
        input_control_digit=vote.control_digit,
        bot_control_digit=bot_control_digit,
        bot_score=bot_score,
        bot_location=bot_location
    )

    if not is_valid:
        print(f"[VALIDACIÓN FALLIDA] Motivo: {validation_message}")
        raise HTTPException(status_code=400, detail=validation_message)
    
    print("[VALIDACIÓN EXITOSA] Procediendo a registrar el voto...")

    # 5. Registrar el voto en Supabase
    success = register_vote(vote.ticket, vote.option_id)
    
    if success:
        return VoteResponse(success=True, message="¡Tu voto ha sido registrado exitosamente!")
    else:
        raise HTTPException(status_code=500, detail="Error interno al registrar el voto en la base de datos.")

@app.get("/api/results")
async def fetch_results():
    results = get_results()
    # Formatear para recharts (array de objetos)
    formatted_results = [
        {"name": f"Candidato {i}", "votos": results.get(i, 0)} for i in range(1, 6)
    ]
    return formatted_results

if __name__ == "__main__":
    # Importante: al ejecutar esto en consola la primera vez, Telethon pedirá número y código.
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
