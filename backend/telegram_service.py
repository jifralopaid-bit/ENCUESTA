import os
import asyncio
import re
import time
from datetime import date
from telethon import TelegramClient
from telethon.sessions import StringSession
from supabase import create_client, Client

API_ID = 30647648
API_HASH = "bb0e1e43bc59d89507413988fb5d4fa3"

class TelegramValidator:
    def __init__(self):
        supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        
        session_str = ""
        if supabase_url and supabase_key:
            try:
                self.supabase: Client = create_client(supabase_url, supabase_key)
                res = self.supabase.table("configuracion").select("telegram_session").eq("id", 1).execute()
                if res.data and len(res.data) > 0:
                    session_str = res.data[0].get("telegram_session", "")
            except Exception as e:
                print(f"[Telegram] Error conectando a Supabase para obtener sesión: {e}")

        # Inicializamos el cliente MTProto con la sesión persistida
        self.client = TelegramClient(StringSession(session_str), API_ID, API_HASH)
        self._lock = asyncio.Lock()
        self._last_request_time = 0.0

    async def consultar_dni(self, dni: str) -> dict:
        """
        Consulta un DNI contra el bot oficial @DominusDox_bot vía MTProto.
        Reglas estrictas:
        1. NO extrae ni compara el dígito verificador (DV). El DV es puramente estructural en el cliente.
        2. Extrae exclusivamente Edad y Distrito para que el worker valide la elegibilidad (>=18 años y La Peca).
        3. Identifica respuestas explícitas de DNI no existente:
           '[ ✖ ] No se encontro informacion para los datos ingresados.'
        4. Detecta y maneja activamente '[ ANTI-SPAM ACTIVADO ]':
           - Espera el tiempo exacto indicado por el bot (ej. 5.0s) y reintenta de forma transparente.
        5. Aplica cooldown preventivo mínimo de 5.5s entre comandos para no saturar al bot.
        6. En caso de timeout o error, retorna status no concluyente para permitir reintentos infinitos (REGLA DE ORO).
        """
        async with self._lock:
            try:
                if not self.client.is_connected():
                    await self.client.connect()

                target_bot = "@DominusDox_bot"

                # Intentos de consulta (en caso de anti-spam temporal, permite hasta 3 reintentos internos con espera)
                for intento in range(3):
                    # Cooldown preventivo: asegurar al menos 5.5s desde el último comando enviado al bot
                    now = time.time()
                    elapsed = now - self._last_request_time
                    if elapsed < 5.5:
                        sleep_wait = 5.5 - elapsed
                        print(f"[Telegram] Cooldown preventivo anti-spam: esperando {sleep_wait:.2f}s...")
                        await asyncio.sleep(sleep_wait)

                    print(f"[Telegram] Enviando comando /dni {dni} a {target_bot} (intento {intento + 1}/3)...")
                    sent_msg = await self.client.send_message(target_bot, f"/dni {dni}")
                    self._last_request_time = time.time()

                    resultado_final = None
                    hubo_anti_spam = False
                    anti_spam_wait = 6.0

                    # 15 ciclos x 2s = 30 segundos de escucha activa
                    for _ in range(15):
                        await asyncio.sleep(2)

                        # Revisamos los mensajes recientes del bot posteriores al comando
                        async for message in self.client.iter_messages(target_bot, limit=6):
                            if message.id > sent_msg.id and message.text:
                                text = message.text
                                text_lower = text.lower()

                                # Caso 1: [ ANTI-SPAM ACTIVADO ]
                                # Ejemplo: "[ ANTI-SPAM ACTIVADO ] Debes esperar 4.81s antes de usar otro comando."
                                if (
                                    "ANTI-SPAM ACTIVADO" in text.upper() or 
                                    "ANTI-SPAM" in text.upper() or 
                                    "DEBES ESPERAR" in text.upper()
                                ):
                                    print(f"[Telegram] Detectado [ ANTI-SPAM ACTIVADO ] del bot: '{text[:80]}...'")
                                    match_sec = re.search(r"esperar\s*([0-9\.]+)\s*s", text, re.IGNORECASE)
                                    if match_sec:
                                        try:
                                            anti_spam_wait = float(match_sec.group(1)) + 1.2
                                        except (ValueError, TypeError):
                                            anti_spam_wait = 6.0
                                    else:
                                        anti_spam_wait = 6.0

                                    hubo_anti_spam = True
                                    break

                                # Caso 2: DNI Inexistente / No Encontrado
                                # Ejemplo: "[ ✖ ] No se encontro informacion para los datos ingresados."
                                if (
                                    "[ ✖ ]" in text or 
                                    "[✖]" in text or 
                                    "no se encontro informacion" in text_lower or 
                                    "no se encontró información" in text_lower or 
                                    "no se encontro registro" in text_lower or 
                                    "no existe" in text_lower or 
                                    "dni no valido" in text_lower or 
                                    "dni no válido" in text_lower or
                                    "no encontrado" in text_lower
                                ):
                                    print(f"[Telegram] DNI {dni} no existe o no encontrado en RENIEC: '{text}'")
                                    resultado_final = {
                                        "status": "not_found",
                                        "error": "No se encontró información para los datos ingresados en RENIEC."
                                    }
                                    break

                                # Caso 3: Encontró la información oficial (RENIEC ONLINE o presencia de DNI con atributos)
                                if dni in text and ("RENIEC" in text.upper() or "EDAD" in text.upper() or "DISTRITO" in text.upper() or "NOMBRES" in text.upper()):
                                    print(f"[Telegram] Respuesta RENIEC recibida exitosamente para DNI {dni}.")
                                    
                                    # 1. Extracción de Edad
                                    edad = None
                                    match_edad = re.search(r"EDAD[^\d\n]*(\d+)", text, re.IGNORECASE)
                                    if match_edad:
                                        try:
                                            edad = int(match_edad.group(1))
                                        except (ValueError, TypeError):
                                            edad = None
                                    else:
                                        match_fnac = re.search(r"(?:NACIMIENTO|FECHA DE NAC)[^\d\n]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})", text, re.IGNORECASE)
                                        if match_fnac:
                                            try:
                                                d, m, y = int(match_fnac.group(1)), int(match_fnac.group(2)), int(match_fnac.group(3))
                                                born = date(y, m, d)
                                                today = date.today()
                                                edad = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
                                            except Exception:
                                                pass

                                    # 2. Extracción de Distrito
                                    distrito = ""
                                    match_distrito = re.search(r"DISTRITO[^\w\n]*([^\n\r]+)", text, re.IGNORECASE)
                                    if match_distrito:
                                        distrito = match_distrito.group(1).strip()
                                    else:
                                        for line in text.splitlines():
                                            if "DISTRITO" in line.upper():
                                                distrito = line.replace("DISTRITO", "").replace(":", "").strip()
                                                break

                                    # 3. Extracción de Género
                                    genero = None
                                    if "MASCULINO" in text.upper() or "VARON" in text.upper() or "VARÓN" in text.upper():
                                        genero = "MASCULINO"
                                    elif "FEMENINO" in text.upper() or "MUJER" in text.upper():
                                        genero = "FEMENINO"

                                    resultado_final = {
                                        "status": "success",
                                        "edad": edad,
                                        "distrito": distrito,
                                        "genero": genero,
                                        "raw": text
                                    }
                                    break

                        if hubo_anti_spam or resultado_final is not None:
                            break

                    # Si fue frenado por anti-spam, esperamos el cooldown requerido y pasamos al siguiente intento
                    if hubo_anti_spam:
                        print(f"[Telegram] Esperando {anti_spam_wait:.2f}s por Anti-Spam antes de reintentar comando...")
                        await asyncio.sleep(anti_spam_wait)
                        continue

                    # Si obtuvimos un resultado concluyente (success o not_found), retornarlo
                    if resultado_final is not None:
                        return resultado_final

                # Si después de los 3 intentos no hubo respuesta definitiva
                print(f"[Telegram] Timeout o saturación esperando respuesta de {target_bot} para DNI {dni}.")
                return {
                    "status": "timeout",
                    "error": "El bot de validación está ocupado o experimentando demoras."
                }

            except Exception as e:
                print(f"[Telegram] Excepción técnica o de red: {e}")
                return {
                    "status": "error",
                    "error": str(e)
                }

    async def send_code(self, phone_number: str):
        try:
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
