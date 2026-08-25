import os
import re
import json
import asyncio
from telethon import TelegramClient
from telethon.sessions import StringSession
from dotenv import load_dotenv
from supabase_client import supabase

load_dotenv()

class TelegramValidator:
    def __init__(self):
        self.api_id = 30647648
        self.api_hash = 'bb0e1e43bc59d89507413988fb5d4fa3'
        self.bot_username = '@DOMINUSDOX_BOT'
        self.supabase = supabase
        
        self.client = None

    async def start(self):
        try:
            if self.supabase is None:
                print("Advertencia: No hay conexión a Supabase. TelegramValidator no puede obtener la sesión.")
                return

            # Read StringSession from Supabase
            response = self.supabase.table('configuracion').select('telegram_session').eq('id', 1).execute()
            if len(response.data) == 0:
                raise RuntimeError("No hay sesión de Telegram guardada en la base de datos.")
                
            session_string = response.data[0].get('telegram_session', "")
            
            if not session_string:
                raise RuntimeError("Sesión inválida en la base de datos.")

            try:
                self.client = TelegramClient(StringSession(session_string), self.api_id, self.api_hash)
                await self.client.connect()
                
                if not await self.client.is_user_authorized():
                    print("Advertencia: La sesión de Telegram ha expirado o es inválida. Falta el archivo .session o es incorrecto.")
                    self.client = None
                    return
                    
                print("TelegramClient conectado exitosamente a través de StringSession.")
            except Exception as e:
                print(f"Advertencia: Error crítico al iniciar Telegram: {e}. Falta el archivo .session o la red falló.")
                self.client = None
        except Exception as e:
            print(f"Advertencia: Falló la inicialización de sesión desde Supabase u otro error general: {e}")
            self.client = None

    async def stop(self):
        if self.client:
            await self.client.disconnect()

    async def validate_dni(self, ticket: str, input_control_digit: str):
        try:
            print("1. Iniciando cliente de Telethon...")
            if not self.client or not self.client.is_connected():
                await self.start()
                
            if not self.client or not self.client.is_connected():
                raise Exception("No se pudo establecer la conexión a Telegram.")

            print("2. Telethon conectado.")
            
            command = f"/dni {ticket}"
            print(f"3. Enviando DNI al bot: {command}")
            
            # Send message to bot
            await self.client.send_message(self.bot_username, command)
            
            print("4. Esperando respuesta del bot...")
            
            async def poll_for_response():
                while True:
                    await asyncio.sleep(1)
                    messages = await self.client.get_messages(self.bot_username, limit=1)
                    if messages:
                        msg = messages[0].message
                        if msg and msg != command and ("DNI" in msg or "EDAD" in msg):
                            return msg
                            
            try:
                bot_response = await asyncio.wait_for(poll_for_response(), timeout=15.0)
                print(f"Respuesta del bot recibida.")
            except asyncio.TimeoutError:
                print("TIMEOUT: El bot no respondió")
                return {"valid": False, "message": "El bot validador de RENIEC no respondió a tiempo."}
                
            # Parse response using required regex
            text_clean = re.sub(r'[\*`]', '', bot_response)
            
            # Dígito
            digit_match = re.search(r'DNI.*?-\s*([0-9Kk])', text_clean, re.IGNORECASE)
            bot_digit = digit_match.group(1).upper() if digit_match else None
            
            # Edad
            age_match = re.search(r'EDAD.*?(\d+)\s*A[ÑN]OS', text_clean, re.IGNORECASE)
            score = int(age_match.group(1)) if age_match else None
            
            # Distrito (Last match)
            location_matches = re.findall(r'DISTRITO.*?[➾=>⇒:]\s*([A-Za-z\s]+)', text_clean, re.IGNORECASE)
            location = None
            if location_matches:
                location = location_matches[-1].split('\n')[0].strip().upper()
                
            if not bot_digit or score is None or not location:
                print(f"Error parseando mensaje del bot: {text_clean}")
                return {"valid": False, "message": "No se pudo extraer toda la información del bot validador."}
                
            if str(input_control_digit).upper() != bot_digit:
                return {"valid": False, "message": f"El dígito de control no coincide. Esperado: {bot_digit}, Ingresado: {input_control_digit}"}
                
            if score < 18:
                return {"valid": False, "message": f"Debes ser mayor de edad para votar. Edad registrada: {score} años."}
                
            if location != "LA PECA":
                return {"valid": False, "message": f"Solo pueden votar residentes del distrito de LA PECA. Tu distrito es: {location}."}
                
            print("5. Validación completada con éxito.")
            return {"valid": True}

        except Exception as e:
            print(f"ERROR CRÍTICO EN TELEGRAM: {str(e)}")
            return {"valid": False, "message": "Error interno de conexión con el validador."}
