from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Body
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from telegram_service import TelegramValidator
import os
from dotenv import load_dotenv
from supabase_client import supabase
import uuid
import asyncio
import re
import unicodedata
import secrets
import json
import hashlib
import io
import base64
from cryptography.fernet import Fernet
import pandas as pd

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

validator = TelegramValidator()

# --- Configuración de Encriptación ---
_raw_key = os.environ.get("ENCRYPTION_KEY", "uO6vO02Q7aI92nZb3pA72t1VwK6zN8X_9-8wD3Yn-A=") 
try:
    FERNET_KEY = base64.urlsafe_b64encode(_raw_key.encode().ljust(32)[:32])
    cipher_suite = Fernet(FERNET_KEY)
except Exception:
    FERNET_KEY = Fernet.generate_key()
    cipher_suite = Fernet(FERNET_KEY)
# -------------------------------------



class SendCodeRequest(BaseModel):
    phone_number: str

class VerifyCodeRequest(BaseModel):
    phone_number: str
    phone_code_hash: str
    phone_code: str

def normalizar_texto(texto: str) -> str:
    """Normaliza texto eliminando acentos, tildes, espacios redundantes y convirtiendo a mayúsculas."""
    if not texto:
        return ""
    nfkd = unicodedata.normalize('NFKD', texto)
    sin_tildes = "".join(c for c in nfkd if not unicodedata.combining(c))
    return " ".join(sin_tildes.upper().split())

async def process_vote_queue():
    """
    Worker en segundo plano con validación LOCAL, masiva y encriptada.
    """
    print("[Worker] Motor de validación asíncrono LOCAL iniciado.")
    while True:
        try:
            if supabase is None:
                await asyncio.sleep(5)
                continue
                
            # Buscar 1 ticket pendiente (FIFO)
            response = supabase.table('cola_votos').select('*').eq('estado', 'pendiente').order('created_at').limit(1).execute()
            
            if not response.data:
                await asyncio.sleep(2)
                continue
                
            ticket = response.data[0]
            ticket_id = ticket['id']
            dni = str(ticket.get('dni', '')).strip()
            candidato_id = ticket.get('candidato_id')
            
            print(f"[Worker] Evaluando ticket {ticket_id} para DNI {dni} (candidato_id: {candidato_id})...")
            
            # --- VALIDACIÓN LOCAL EN PADRÓN ---
            dni_hash = hashlib.sha256(dni.encode()).hexdigest()
            
            padron_res = supabase.table('padron_electoral').select('*').eq('dni_hash', dni_hash).execute()
            
            if not padron_res.data or len(padron_res.data) == 0:
                print(f"[Worker] DNI {dni} (hash: {dni_hash[:8]}...) NO figura en el padrón local.")
                supabase.table('cola_votos').update({
                    "estado": "rechazado", 
                    "mensaje": "Tu DNI no figura en el padrón electoral de La Peca."
                }).eq('id', ticket_id).execute()
                await asyncio.sleep(1)
                continue
                
            ciudadano = padron_res.data[0]
            
            if ciudadano.get('ya_voto'):
                print(f"[Worker] DNI {dni} ya votó previamente (padrón). Rechazando ticket.")
                supabase.table('cola_votos').update({
                    "estado": "rechazado", 
                    "mensaje": "Este DNI ya ha emitido su voto en el proceso electoral."
                }).eq('id', ticket_id).execute()
                await asyncio.sleep(1)
                continue
                
            # 1. Verificar si ya votó previamente (en votos o tickets_usados por seguridad extra)
            voto_resp = supabase.table('votos').select('id').eq('dni', dni).execute()
            if voto_resp.data and len(voto_resp.data) > 0:
                print(f"[Worker] DNI {dni} ya votó previamente (votos). Rechazando ticket.")
                supabase.table('cola_votos').update({
                    "estado": "rechazado", 
                    "mensaje": "Este DNI ya ha emitido un voto en este proceso electoral."
                }).eq('id', ticket_id).execute()
                await asyncio.sleep(1)
                continue

            # NOTA: La validación de Telegram MTProto está comentada como fallback.
            # ==============================================================
            # try:
            #     validation = await asyncio.wait_for(validator.consultar_dni(dni), timeout=35.0)
            # except Exception: pass
            # ==============================================================

            # 3. Cumple todos los requisitos: Registrar voto
            print(f"[Worker] ¡DNI {dni} aprobado en Padrón Local! Registrando voto para candidato_id={candidato_id}...")
            try:
                # Actualizar el padrón primero
                from datetime import datetime, timezone
                now_iso = datetime.now(timezone.utc).isoformat()
                
                supabase.table('padron_electoral').update({
                    "ya_voto": True,
                    "fecha_voto": now_iso
                }).eq('dni_hash', dni_hash).execute()
                
                # Registrar ticket usado para evitar doble voto futuro (compatibilidad)
                supabase.table('tickets_usados').insert({'ticket': dni}).execute()
                
                # Registrar el voto exactamente para el candidato elegido
                # (Ya no tenemos edad ni género precisos del bot, podemos extraer del padrón si los agregáramos, 
                # o poner por defecto para estadísticas).
                supabase.table('votos').insert({
                    'dni': dni,
                    'opcion_id': candidato_id,
                    'edad': 30, # Default temporal para que no falle estadísticas
                    'genero': 'NO_ESPECIFICADO'
                }).execute()
                
                # Actualizar estado en la cola a aprobado
                supabase.table('cola_votos').update({
                    "estado": "aprobado", 
                    "mensaje": "¡Tu voto ha sido registrado exitosamente!"
                }).eq('id', ticket_id).execute()
                print(f"[Worker] Voto asignado exitosamente al candidato {candidato_id} para DNI {dni}.")
            except Exception as insert_err:
                print(f"[Worker] Error insertando voto/ticket: {insert_err}")
                supabase.table('cola_votos').update({
                    "estado": "rechazado", 
                    "mensaje": "Ocurrió un error registrando tu voto. Intenta nuevamente."
                }).eq('id', ticket_id).execute()

            # Cooldown de 1s entre cada iteración del worker para mayor velocidad
            await asyncio.sleep(1)
            
        except Exception as e:
            print(f"[Worker] Excepción en bucle: {e}")
            await asyncio.sleep(5)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(process_vote_queue())

@app.on_event("shutdown")
async def shutdown_event():
    if validator.client and validator.client.is_connected():
        await validator.client.disconnect()

@app.post("/api/votar")
async def registrar_voto(payload: dict = Body(...)):
    """
    Endpoint de validación y encolado de votos:
    - Validación puramente estructural: DNI = 8 números exactos.
    - Se verifica rigurosamente en el padrón local.
    """
    if supabase is None:
        return JSONResponse(status_code=500, content={"detail": "Error de conexión a la base de datos."})

    try:
        # 1. Extracción y limpieza manual (Adiós error 422)
        dni_crudo = payload.get("dni", "")
        dni_limpio = str(dni_crudo).strip()

        # 2. Capturar el ID sin importar su tipo (int, str, UUID)
        id_crudo = payload.get("candidato_id") or payload.get("opcion_id")
        if not id_crudo:
            raise HTTPException(status_code=400, detail="No se envió el ID del candidato.")
        
        candidato_id_final = str(id_crudo).strip()

        if not dni_limpio:
            raise HTTPException(status_code=400, detail="El DNI es obligatorio.")

        # 1. Validación estructural estricta: DNI = 8 números exactos
        if not re.match(r'^\d{8}$', dni_limpio):
            raise HTTPException(status_code=400, detail="Formato inválido. El DNI debe tener 8 números exactos.")
            
        # 2. Manejo Seguro del Hash y validación en padrón
        dni_hash = hashlib.sha256(dni_limpio.encode('utf-8')).hexdigest()
        
        res = supabase.table('padron_electoral').select('*').eq('dni_hash', dni_hash).execute()
        
        # Validar que exista data y evitar IndexError
        estado_ticket = 'pendiente'
        mensaje_ticket = 'En cola de validación'

        if not res.data or len(res.data) == 0:
            estado_ticket = 'rechazado'
            mensaje_ticket = 'El DNI no figura en el padrón electoral oficial.'
        elif res.data[0].get('ya_voto') == True:
            estado_ticket = 'rechazado'
            mensaje_ticket = 'Este DNI ya emitió un voto en este proceso electoral.'
            
        # 3. Encolar ticket asegurando candidato_id exacto y proveyendo dv para evitar error not-null
        user_token = payload.get('user_token', 'default_token')
        dv_value = str(payload.get('dv', '')).strip()

        response = supabase.table('cola_votos').insert({
            'dni': dni_limpio,
            'dv': dv_value,
            'candidato_id': candidato_id_final,
            'user_token': user_token,
            'estado': estado_ticket,
            'mensaje': mensaje_ticket
        }).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="No se pudo generar el ticket en la cola.")

        return JSONResponse(status_code=200, content={
            "message": "Ticket encolado exitosamente", 
            "ticket_id": response.data[0]['id']
        })
    except HTTPException:
        # Relanzamos excepciones HTTP para no capturarlas como genéricas 500
        raise
    except Exception as e:
        print(f"Error crítico 500: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error del servidor: {str(e)}")

@app.get("/api/cola/{user_token}")
async def get_queue_status(user_token: str):
    try:
        response = supabase.table('cola_votos').select('*').eq('user_token', user_token).order('created_at', desc=True).execute()
        return response.data
    except Exception as e:
        print(f"Error obteniendo cola: {e}")
        return []

@app.delete("/api/cola/{item_id}")
async def delete_queue_item(item_id: str):
    try:
        supabase.table('cola_votos').delete().eq('id', item_id).execute()
        return JSONResponse(status_code=200, content={"message": "Item eliminado"})
    except Exception as e:
        print(f"Error borrando item {item_id}: {e}")
        return JSONResponse(status_code=500, content={"detail": "Error al eliminar el registro."})

@app.put("/api/cola/{item_id}/retry")
async def retry_queue_item(item_id: str):
    try:
        supabase.table('cola_votos').update({"estado": "pendiente", "mensaje": "En cola para reintento"}).eq('id', item_id).execute()
        return JSONResponse(status_code=200, content={"message": "Item reencolado"})
    except Exception as e:
        print(f"Error reintentando item {item_id}: {e}")
        return JSONResponse(status_code=500, content={"detail": "Error al reintentar."})

@app.post("/api/revocacion")
async def solicitar_revocacion(dni: str = Form(...), telefono: str = Form(...), foto: UploadFile = File(...)):
    if supabase is None:
        return JSONResponse(status_code=500, content={"detail": "Error de base de datos."})
        
    try:
        file_bytes = await foto.read()
        file_ext = foto.filename.split('.')[-1] if foto.filename and '.' in foto.filename else 'jpg'
        file_name = f"{dni}_{uuid.uuid4().hex[:8]}.{file_ext}" 
        
        # Subir a Supabase Storage
        supabase.storage.from_("evidencias_dni").upload(
            path=file_name,
            file=file_bytes,
            file_options={"content-type": foto.content_type}
        )
        
        # Obtener URL pública
        foto_url = supabase.storage.from_("evidencias_dni").get_public_url(file_name)
        
        # Insertar en tabla
        supabase.table("solicitudes_revocacion").insert({
            "dni": dni,
            "telefono": telefono,
            "foto_url": foto_url,
            "estado": "pendiente"
        }).execute()
        
        return JSONResponse(status_code=200, content={"message": "Solicitud enviada correctamente."})
    except Exception as e:
        print(f"Error en revocacion: {e}")
        return JSONResponse(status_code=500, content={"detail": "Error al enviar solicitud."})

@app.get("/api/admin/revocaciones")
async def get_revocaciones():
    try:
        response = supabase.table("solicitudes_revocacion").select("*").eq("estado", "pendiente").order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        print(f"Error fetching revocaciones: {e}")
        return []

@app.post("/api/admin/revocaciones/{id}/aprobar")
async def aprobar_revocacion(id: str):
    try:
        req_res = supabase.table("solicitudes_revocacion").select("dni").eq("id", id).execute()
        if not req_res.data:
            return JSONResponse(status_code=404, content={"detail": "Solicitud no encontrada"})
        
        dni_afectado = req_res.data[0]["dni"]
        
        supabase.table("votos").delete().eq("dni", dni_afectado).execute()
        supabase.table("tickets_usados").delete().eq("ticket", dni_afectado).execute()
        supabase.table("cola_votos").delete().eq("dni", dni_afectado).execute()
        
        dni_hash = hashlib.sha256(dni_afectado.encode()).hexdigest()
        supabase.table("padron_electoral").update({"ya_voto": False}).eq("dni_hash", dni_hash).execute()
        
        supabase.table("solicitudes_revocacion").update({"estado": "aprobado"}).eq("id", id).execute()
        
        return JSONResponse(status_code=200, content={"message": "Revocación aprobada exitosamente."})
    except Exception as e:
        print(f"Error aprobando revocacion: {e}")
        return JSONResponse(status_code=500, content={"detail": "Error al aprobar revocación."})

class VotoManual(BaseModel):
    cantidad: int

class ConfiguracionRequest(BaseModel):
    mostrar_resultados_publicos: bool

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/auth/login")
async def admin_login(req: LoginRequest):
    try:
        if not supabase:
            return JSONResponse(status_code=500, content={"detail": "Error de base de datos."})
            
        # Validar en base de datos PostgreSQL mediante pgcrypto y RPC
        res = supabase.rpc('verificar_admin', {
            'email_input': req.email, 
            'password_input': req.password
        }).execute()
        
        if not res.data:
            raise HTTPException(status_code=401, detail="Credenciales incorrectas.")
            
        # Generar un token (simplificado, que el front guardará)
        token = secrets.token_hex(32)
        return {"access_token": token, "message": "Login exitoso"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error en login: {e}")
        raise HTTPException(status_code=401, detail="Credenciales incorrectas.")

@app.get("/api/admin/estadisticas")
async def get_estadisticas():
    if supabase is None:
        return JSONResponse(status_code=500, content={"detail": "Error de base de datos local."})
    
    try:
        cand_resp = supabase.table('candidatos').select('*').neq('name', '___telegram_session___').execute()
        candidates = cand_resp.data or []
        
        votos_resp = supabase.table('votos').select('*').execute()
        votos = votos_resp.data or []
        
        total_reales = len(votos)
        total_manuales = sum((c.get('votos_manuales') or 0) for c in candidates)
        
        genero_count = {"MASCULINO": 0, "FEMENINO": 0, "NO_ESPECIFICADO": 0}
        edad_count = {"18-29 Jóvenes": 0, "30-49 Adultos": 0, "50+ Adultos Mayores": 0}
        preferencias = {c['id']: {"name": c['name'], "MASCULINO": 0, "FEMENINO": 0} for c in candidates}
        
        for v in votos:
            gen = v.get('genero')
            if gen == 'MASCULINO':
                genero_count['MASCULINO'] += 1
            elif gen == 'FEMENINO':
                genero_count['FEMENINO'] += 1
            else:
                genero_count['NO_ESPECIFICADO'] += 1
                
            edad = v.get('edad')
            if edad is not None:
                if 18 <= edad <= 29:
                    edad_count["18-29 Jóvenes"] += 1
                elif 30 <= edad <= 49:
                    edad_count["30-49 Adultos"] += 1
                elif edad >= 50:
                    edad_count["50+ Adultos Mayores"] += 1
            
            opc = v.get('opcion_id')
            if opc in preferencias and (gen == 'MASCULINO' or gen == 'FEMENINO'):
                preferencias[opc][gen] += 1
                
        return {
            "total_votos_reales": total_reales,
            "total_votos_manuales": total_manuales,
            "genero": [{"name": k, "value": v} for k, v in genero_count.items()],
            "edades": [{"name": k, "value": v} for k, v in edad_count.items()],
            "preferencias": list(preferencias.values())
        }
    except Exception as e:
        print(f"Error estadísticas: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.put("/api/admin/config/resultados")
async def update_resultados_config(req: ConfiguracionRequest):
    try:
        supabase.table("configuracion").update({"mostrar_resultados_publicos": req.mostrar_resultados_publicos}).eq("id", 1).execute()
        return {"success": True}
    except Exception as e:
        print(f"Error update config: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.post("/api/admin/candidatos/{id}/votos-manuales")
async def inyectar_votos_manuales(id: str, req: VotoManual):
    try:
        candidato_id = int(id) if id.isdigit() else id
        response = supabase.rpc('actualizar_votos_manuales', {'p_candidato_id': candidato_id, 'p_cantidad': req.cantidad}).execute()
        return JSONResponse(status_code=200, content={"success": True})
    except Exception as e:
        print(f"Error inyectar votos: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.get("/api/results")
async def get_results():
    if supabase is None:
        return JSONResponse(status_code=500, content={"detail": "Error de base de datos local."})
        
    try:
        config_res = supabase.table('configuracion').select('mostrar_resultados_publicos').eq('id', 1).execute()
        mostrar = True
        if config_res.data and len(config_res.data) > 0:
            mostrar = config_res.data[0].get('mostrar_resultados_publicos', True)

        # Obtener candidatos ordenados por orden oficial
        cand_response = supabase.table('candidatos').select('*').neq('name', '___telegram_session___').order('orden').execute()
        candidates = cand_response.data or []

        # Obtener todos los votos reales
        votes_response = supabase.table('votos').select('opcion_id').execute()
        votes = votes_response.data or []
        
        # Conteo exacto por candidate ID
        vote_counts = {}
        for v in votes:
            opc = v.get('opcion_id')
            if opc:
                vote_counts[opc] = vote_counts.get(opc, 0) + 1
            
        results = []
        for c in candidates:
            votos_reales = vote_counts.get(c['id'], 0)
            votos_manuales = c.get('votos_manuales', 0)
            
            # El campo 'votos' público será 0 si está oculto, o la suma si está visible
            votos_publicos = 0 if not mostrar else (votos_reales + votos_manuales)
            
            results.append({
                "id": c['id'],
                "name": c['name'],
                "votos": votos_publicos,
                "votos_reales": votos_reales,
                "votos_manuales": votos_manuales,
                "image_url": c.get('image_url'),
                "logo_partido_url": c.get('logo_partido_url')
            })
            
        return {
            "resultados_ocultos": not mostrar,
            "data": results
        }
    except Exception as e:
        print(f"Error fetching results: {e}")
        return {"resultados_ocultos": False, "data": []}

@app.post("/api/telegram/send-code")
async def telegram_send_code(request: SendCodeRequest):
    result = await validator.send_code(request.phone_number)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result

@app.post("/api/telegram/verify-code")
async def telegram_verify_code(request: VerifyCodeRequest):
    result = await validator.verify_code(request.phone_number, request.phone_code_hash, request.phone_code)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

@app.post("/api/admin/padron/upload")
async def upload_padron(file: UploadFile = File(...)):
    if not file.filename.endswith(('.csv', '.xlsx')):
        return JSONResponse(status_code=400, content={"detail": "Solo se permiten archivos .csv o .xlsx"})
        
    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            # sep=None y engine='python' auto-detecta si es coma o punto y coma
            df = pd.read_csv(io.BytesIO(contents), sep=None, engine='python', dtype=str)
        else:
            df = pd.read_excel(io.BytesIO(contents), dtype=str)
            
        # Limpiar nombres de columnas (quitar espacios, BOM y pasar a mayúsculas)
        df.columns = [str(c).replace('\ufeff', '').replace('\xef\xbb\xbf', '').strip().upper() for c in df.columns]
        
        # Verificar si existe la columna DNI
        if 'DNI' not in df.columns:
            return JSONResponse(status_code=400, content={"detail": f"No se encontró la columna 'DNI'. Columnas detectadas: {', '.join(df.columns)}"})

        batch = []
        for _, row in df.iterrows():
            dni_raw = str(row.get('DNI', '')).strip().split('.')[0]
            if not dni_raw or len(dni_raw) < 8 or dni_raw.lower() == 'nan':
                continue
            
            nombre = str(row.get('NOMBRE', row.get('NOMBRES', ''))).strip()
            ap_pat = str(row.get('APELLIDO PATERNO', '')).strip()
            ap_mat = str(row.get('APELLIDO MATERNO', '')).strip()
            
            # Si el CSV dice 'nan', lo ignoramos
            if nombre.lower() == 'nan': nombre = ''
            if ap_pat.lower() == 'nan': ap_pat = ''
            if ap_mat.lower() == 'nan': ap_mat = ''
            
            nombre_completo = f"{nombre} {ap_pat} {ap_mat}".strip()
            if not nombre_completo:
                nombre_completo = "SIN NOMBRE"
            
            dni_hash = hashlib.sha256(dni_raw.encode()).hexdigest()
            datos = {"dni": dni_raw, "nombres": nombre_completo}
            
            datos_json = json.dumps(datos)
            datos_encriptados = cipher_suite.encrypt(datos_json.encode()).decode('utf-8')
            
            batch.append({
                "dni_hash": dni_hash,
                "datos_encriptados": datos_encriptados,
                "ya_voto": False
            })
            
        if not batch:
            return JSONResponse(status_code=400, content={"detail": "No se encontraron registros válidos. Verifica que los DNI tengan 8 dígitos."})

        total_inserted = 0
        for i in range(0, len(batch), 500):
            chunk = batch[i:i+500]
            if chunk:
                # Upsert is supported in Supabase using on_conflict
                res = supabase.table('padron_electoral').upsert(chunk, on_conflict='dni_hash').execute()
                total_inserted += len(chunk)
                
        return {"message": "Padrón cargado exitosamente", "registros_procesados": total_inserted}
    except Exception as e:
        print(f"Error cargando padrón: {e}")
        return JSONResponse(status_code=500, content={"detail": f"Error al procesar el archivo: {str(e)}"})

@app.get("/api/admin/padron/audit")
async def get_padron_audit():
    try:
        res = supabase.table('padron_electoral').select('datos_encriptados, fecha_voto').eq('ya_voto', True).execute()
        resultados = []
        for row in res.data:
            try:
                enc_data = row['datos_encriptados']
                if isinstance(enc_data, str) and enc_data.startswith('\\x'):
                    enc_data = bytes.fromhex(enc_data[2:])
                elif isinstance(enc_data, str):
                    enc_data = enc_data.encode('utf-8')
                    
                decrypted = cipher_suite.decrypt(enc_data)
                datos = json.loads(decrypted.decode('utf-8'))
                
                resultados.append({
                    "dni": datos.get("dni"),
                    "nombres": datos.get("nombres"),
                    "fecha_voto": row.get("fecha_voto")
                })
            except Exception as e:
                print(f"Error desencriptando registro: {e}")
                
        # Ordenar por fecha_voto descendente (más recientes primero)
        resultados.sort(key=lambda x: x.get('fecha_voto') or '', reverse=True)
        return resultados
    except Exception as e:
        print(f"Error auditoria: {e}")
        return JSONResponse(status_code=500, content={"detail": "Error obteniendo auditoría"})
