import os
from supabase import create_client, Client

# 1. Buscamos la URL y la Llave en el orden especificado.
supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")

supabase: Client | None = None

if not supabase_url or not supabase_key:
    print("ADVERTENCIA: Credenciales de Supabase no encontradas (URL o Key faltantes)")
else:
    try:
        # 2. Envolvemos la creación en un try/except
        supabase = create_client(supabase_url, supabase_key)
    except Exception as e:
        print(f"Error inicializando cliente de Supabase: {e}")
        supabase = None
