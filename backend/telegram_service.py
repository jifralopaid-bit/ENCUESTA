import os
from telethon import TelegramClient
from telethon.sessions import StringSession
from supabase import create_client, Client

API_ID = 30647648
API_HASH = "bb0e1e43bc59d89507413988fb5d4fa3"

class TelegramValidator:
    def __init__(self):
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        session_str = ""
        if supabase_url and supabase_key:
            try:
                self.supabase: Client = create_client(supabase_url, supabase_key)
                res = self.supabase.table("configuracion").select("telegram_session").eq("id", 1).execute()
                if res.data and len(res.data) > 0:
                    session_str = res.data[0].get("telegram_session", "")
            except Exception as e:
                print(f"Error conectando a Supabase para la sesión: {e}")

        # Inicializamos el cliente MTProto con la sesión de usuario
        self.client = TelegramClient(StringSession(session_str), API_ID, API_HASH)

    async def consultar_dni(self, dni: str):
        try:
            if not self.client.is_connected():
                await self.client.connect()

            # Enviar el comando al bot oficial @DominusDox_bot
            target_bot = "@DominusDox_bot"
            print(f"Enviando comando /dni {dni} a {target_bot}...")
            
            await self.client.send_message(target_bot, f"/dni {dni}")
            
            # Esperar unos segundos a que el bot responda con la ficha Reniec
            import asyncio
            await asyncio.sleep(4)

            # Obtener los últimos mensajes del chat con el bot
            async for message in self.client.iter_messages(target_bot, limit=2):
                if message.text and "RENIEC ONLINE" in message.text:
                    return {"success": True, "data": message.text}

            return {"success": False, "error": "El bot no respondió con los datos de RENIEC a tiempo."}
        
        except Exception as e:
            print(f"Error en consulta MTProto: {e}")
            return {"success": False, "error": str(e)}
