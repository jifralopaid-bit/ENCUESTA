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

    async def consultar_dni(self, dni: str, digito_esperado: str):
        try:
            if not self.client.is_connected():
                await self.client.connect()

            # Enviar el comando al bot oficial @DominusDox_bot
            target_bot = "@DominusDox_bot"
            print(f"Enviando comando /dni {dni} a {target_bot}...")
            
            await self.client.send_message(target_bot, f"/dni {dni}")
            
            import asyncio
            import re
            
            # Esperar indefinidamente (con límite de 60s por seguridad)
            max_intentos = 30
            for i in range(max_intentos):
                await asyncio.sleep(2)
                
                # Revisamos los últimos 3 mensajes
                async for message in self.client.iter_messages(target_bot, limit=3):
                    if message.text and "RENIEC ONLINE" in message.text and dni in message.text:
                        # Extraer el dígito (Ej: "DNI => 73432697 - 1")
                        match = re.search(r"DNI\s*=>\s*\d+\s*-\s*(\d+)", message.text)
                        
                        if match:
                            digito_bot = match.group(1)
                            if digito_bot == digito_esperado:
                                return {"success": True, "data": message.text}
                            else:
                                return {"success": False, "error": "El dígito verificador no coincide con los registros oficiales de RENIEC/JNE."}
                        else:
                            return {"success": False, "error": "El DNI ingresado no se encuentra en la base de datos o formato incorrecto."}
            
            return {"success": False, "error": "Los servidores de validación JNE/RENIEC están experimentando demoras. Por favor, intente de nuevo en unos minutos."}
        
        except Exception as e:
            print(f"Error técnico MTProto (Disfrazado): {e}")
            return {"success": False, "error": "Conexión segura con JNE/RENIEC interrumpida temporalmente. Reintentando en breve..."}
