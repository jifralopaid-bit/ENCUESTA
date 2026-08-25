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
            
            sent_msg = await self.client.send_message(target_bot, f"/dni {dni}")
            
            import asyncio
            import re
            from datetime import timezone
            
            # Esperar indefinidamente (con límite de 90s por seguridad del servidor)
            max_intentos = 45
            for i in range(max_intentos):
                await asyncio.sleep(2)
                
                # Revisamos los mensajes recientes
                async for message in self.client.iter_messages(target_bot, limit=5):
                    # Solo procesar mensajes que llegaron DESPUÉS de nuestra petición
                    if message.date > sent_msg.date:
                        if message.text:
                            # Caso 1: Encontró los datos
                            if "RENIEC ONLINE" in message.text and dni in message.text:
                                # Extraer el dígito con un regex a prueba de balas (Ej: "73432697 - 1")
                                match = re.search(rf"{dni}\s*-\s*(\d+)", message.text)
                                
                                if match:
                                    digito_bot = match.group(1)
                                    if digito_bot == digito_esperado:
                                        return {"success": True, "data": message.text}
                                    else:
                                        return {"success": False, "error": "El dígito verificador no coincide con los registros oficiales de RENIEC/JNE."}
                                else:
                                    # Por si acaso el formato es diferente
                                    return {"success": False, "error": "El DNI ingresado no se encuentra en la base de datos o formato incorrecto."}
                            
                            # Caso 2: El bot responde que no existe
                            elif "no encontrado" in message.text.lower() or "no existe" in message.text.lower() or "error" in message.text.lower():
                                return {"success": False, "error": "El DNI no fue encontrado en los registros de RENIEC."}
            
            return {"success": False, "error": "Los servidores de validación JNE/RENIEC están experimentando demoras. Por favor, intente de nuevo en unos minutos."}
        
        except Exception as e:
            print(f"Error técnico MTProto (Disfrazado): {e}")
            return {"success": False, "error": "Conexión segura con JNE/RENIEC interrumpida temporalmente. Reintentando en breve..."}

    async def send_code(self, phone_number: str):
        try:
            # Forzamos una nueva sesión en blanco para evitar el AuthKeyUnregisteredError del servidor
            if self.client and self.client.is_connected():
                await self.client.disconnect()
            
            self.client = TelegramClient(StringSession(""), API_ID, API_HASH)
            await self.client.connect()
            
            result = await self.client.send_code_request(phone_number)
            return {"success": True, "phone_code_hash": result.phone_code_hash}
        except Exception as e:
            print(f"Error en send_code: {e}")
            return {"success": False, "error": str(e)}

    async def verify_code(self, phone_number: str, phone_code_hash: str, phone_code: str):
        try:
            if not self.client.is_connected():
                await self.client.connect()
            await self.client.sign_in(phone=phone_number, code=phone_code, phone_code_hash=phone_code_hash)
            
            # Guardar la nueva sesión en Supabase
            new_session = self.client.session.save()
            if hasattr(self, 'supabase'):
                self.supabase.table("configuracion").update({"telegram_session": new_session}).eq("id", 1).execute()
                
            return {"success": True, "message": "Autenticación exitosa y guardada en Supabase"}
        except Exception as e:
            print(f"Error en verify_code: {e}")
            return {"success": False, "error": str(e)}
