import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL", "").strip()
key: str = os.environ.get("SUPABASE_KEY", "").strip()

supabase: Client | None = None

if url and key and url.startswith("http"):
    try:
        supabase = create_client(url, key)
    except Exception as e:
        print(f"Error initializing Supabase client: {e}")
else:
    print("Warning: SUPABASE_URL or SUPABASE_KEY is missing or invalid in .env")

def get_supabase() -> Client:
    if not supabase:
        raise ValueError("Supabase credentials not configured in .env or invalid URL")
    return supabase

def check_ticket_used(ticket: str) -> bool:
    try:
        db = get_supabase()
        response = db.table("tickets_usados").select("*").eq("ticket", ticket).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"Error checking ticket in Supabase: {e}")
        # Default to True if DB fails to prevent abuse, or handle differently based on strictness.
        return True

def register_vote(ticket: str, option_id: int) -> bool:
    try:
        db = get_supabase()
        # 1. Insert ticket as used para evitar que vuelva a votar
        db.table("tickets_usados").insert({"ticket": ticket}).execute()
        
        # 2. Insertar el voto (solo la opcion_id, para mantener el voto anónimo y evitar errores de esquema)
        db.table("votos").insert({"opcion_id": option_id}).execute()
        return True
    except Exception as e:
        print(f"Error registering vote in Supabase: {e}")
        return False

def get_results() -> dict:
    try:
        db = get_supabase()
        # Fetch all votes and aggregate
        response = db.table("votos").select("opcion_id").execute()
        votes = response.data
        
        results = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for v in votes:
            opt_raw = v.get("opcion_id")
            try:
                opt = int(opt_raw)
                if opt in results:
                    results[opt] += 1
            except (ValueError, TypeError):
                # Ignorar si hay datos corruptos que no se puedan convertir a int
                pass
                
        return results
    except Exception as e:
        print(f"Error getting results from Supabase: {e}")
        return {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
