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
    allow_origins=["https://encuesta-wine.vercel.app", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase init
supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("VITE_SUPABASE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")

if not supabase_url or not supabase_key:
    print("ADVERTENCIA: Credenciales de Supabase no encontradas")
    supabase = None
else:
    supabase: Client = create_client(supabase_url, supabase_key)

validator = TelegramValidator()

class VoteRequest(BaseModel):
    ticket: str
    control_digit: str
    option_id: int

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
        raise HTTPException(status_code=500, detail="Base de datos no configurada.")

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

@app.get("/api/results")
async def get_results():
    if supabase is None:
        return []
        
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

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
