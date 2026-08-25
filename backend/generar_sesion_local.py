import asyncio
import os
from telethon import TelegramClient
from telethon.sessions import StringSession
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Usamos estrictamente las credenciales oficiales de Telegram Desktop para evadir los bloqueos
API_ID = 2040
API_HASH = "b18441a1ff607e10a989891a5462e627"

# Credenciales de Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

async def main():
    print("--- GENERADOR DE SESIÓN MTPROTO PARA TELEGRAM ---")
    phone = input("Ingresa tu número de teléfono con código de país (Ej: +51925789073): ").strip()
    
    # Engañamos a Telegram haciéndonos pasar por la app oficial de Windows para forzar el código
    client = TelegramClient(
        StringSession(''), 
        API_ID, 
        API_HASH,
        device_model="Desktop",
        system_version="Windows 10",
        app_version="4.14.9",
        lang_code="es",
        system_lang_code="es-ES"
    )
    
    await client.connect()
    
    if not await client.is_user_authorized():
        print("Solicitando código a Telegram...")
        # send_code_request a veces falla si el número está baneado o restringido, aquí forzamos
        await client.send_code_request(phone)
        code = input("Ingresa el código que recibiste en tu Telegram oficial: ").strip()
        try:
            await client.sign_in(phone, code)
        except Exception as e:
            print(f"Error al iniciar sesión: {e}")
            return

    session_string = client.session.save()
    print("\n[ÉXITO] ¡Sesión generada correctamente!")
    print(f"String Session: {session_string[:30]}...")

    # Guardar automáticamente en Supabase
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
            data = {"id": 1, "telegram_session": session_string}
            supabase.table("configuracion").upsert(data).execute()
            print("[SUPABASE] ¡Sesión guardada exitosamente en la tabla 'configuracion'!")
        except Exception as err:
            print(f"[SUPABASE ERROR] No se pudo guardar en la base de datos: {err}")
    
    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
