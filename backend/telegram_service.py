import os
import re
import json
import asyncio
from telethon import TelegramClient
from telethon.sessions import StringSession
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

class TelegramValidator:
    def __init__(self):
        self.api_id = 30647648
        self.api_hash = 'bb0e1e43bc59d89507413988fb5d4fa3'
        self.bot_username = '@DOMINUSDOX_BOT'
        
        supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
        self.client = None

    async def start(self):
        # Read StringSession from Supabase
        response = self.supabase.table('candidatos').select('proposal').eq('name', '___telegram_session___').execute()
        if len(response.data) == 0:
            raise RuntimeError("No hay sesión de Telegram guardada en la base de datos.")
            
        proposal_str = response.data[0]['proposal']
        session_string = ""
        
        try:
            config = json.loads(proposal_str)
            session_string = config.get("session", "")
            self.bot_username = config.get("botUsername", self.bot_username)
        except:
            session_string = proposal_str
            
        if not session_string:
            raise RuntimeError("Sesión inválida en la base de datos.")

        self.client = TelegramClient(StringSession(session_string), self.api_id, self.api_hash)
        await self.client.connect()
        
        if not await self.client.is_user_authorized():
            raise RuntimeError("La sesión de Telegram ha expirado o es inválida.")
            
        print("TelegramClient conectado exitosamente a través de StringSession.")

    async def stop(self):
        if self.client:
            await self.client.disconnect()

    async def validate_dni(self, ticket: str, input_control_digit: str):
        if not self.client or not self.client.is_connected():
            await self.start()
            
        command = f"/dni {ticket}"
        
        # Send message to bot
        await self.client.send_message(self.bot_username, command)
        
        # Poll for response
        bot_response = None
        for _ in range(10): # Esperar hasta 10 segundos
            await asyncio.sleep(1)
            messages = await self.client.get_messages(self.bot_username, limit=1)
            if messages:
                msg = messages[0].message
                if msg and msg != command and ("DNI" in msg or "EDAD" in msg):
                    bot_response = msg
                    break
                    
        if not bot_response:
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
            print(f"Error parsing. Msg: {text_clean}")
            return {"valid": False, "message": "No se pudo extraer toda la información del bot validador."}
            
        if str(input_control_digit).upper() != bot_digit:
            return {"valid": False, "message": f"El dígito de control no coincide. Esperado: {bot_digit}, Ingresado: {input_control_digit}"}
            
        if score < 18:
            return {"valid": False, "message": f"Debes ser mayor de edad para votar. Edad registrada: {score} años."}
            
        if location != "LA PECA":
            return {"valid": False, "message": f"Solo pueden votar residentes del distrito de LA PECA. Tu distrito es: {location}."}
            
        return {"valid": True}
