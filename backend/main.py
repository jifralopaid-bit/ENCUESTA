from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from telegram_service import TelegramValidator
import os
from dotenv import load_dotenv
from supabase_client import supabase
import uuid
import asyncio
import re
import unicodedata

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

class VoteRequest(BaseModel):
    dni: str
    digito_verificador: str
    opcion_id: str
    user_token: str
    is_retry: bool = False

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
    Worker en segundo plano tolerante a fallos (Fault-Tolerant):
    1. Simula el DV ignorando el cálculo de Módulo 11.
    2. Valida la identidad ignorando el DV que devuelva el bot:
       - Edad >= 18 (sino rechaza: 'El elector debe ser mayor de edad (18+).')
       - Distrito contiene 'LA PECA' sin distinguir mayúsculas ni tildes (sino rechaza: 'El elector no registra domicilio en el distrito de La Peca.')
    3. Si cumple ambos: registra en tickets_usados, votos y aprueba en cola_votos.
    4. REGLA DE ORO (Cola de reintento infinito):
       - Si bot responde explícitamente no existe o [ ✖ ] -> 'rechazado'.
       - Si ocurre Timeout, desconexión o fallo de red -> VUELVE A 'pendiente' para reintento infinito.
    5. Cooldown de 5s al final de cada ciclo para no saturar al bot.
    """
    print("[Worker] Motor de validación asíncrono iniciado correctamente.")
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
            dv = str(ticket.get('dv', ticket.get('digito_verificador', ''))).strip()
            candidato_id = ticket.get('candidato_id')
            
            print(f"[Worker] Procesando ticket {ticket_id} para DNI {dni}...")
            
            # Cambiar a procesando
            supabase.table('cola_votos').update({
                "estado": "procesando", 
                "mensaje": "Validando con JNE/RENIEC..."
            }).eq('id', ticket_id).execute()
            
            # 1. Verificar si ya votó previamente (en votos o tickets_usados)
            voto_resp = supabase.table('votos').select('id').eq('dni', dni).execute()
            ticket_resp = supabase.table('tickets_usados').select('ticket').eq('ticket', dni).execute()
            if (voto_resp.data and len(voto_resp.data) > 0) or (ticket_resp.data and len(ticket_resp.data) > 0):
                print(f"[Worker] DNI {dni} ya votó previamente. Rechazando ticket.")
                supabase.table('cola_votos').update({
                    "estado": "rechazado", 
                    "mensaje": "Este DNI ya ha emitido un voto."
                }).eq('id', ticket_id).execute()
                await asyncio.sleep(5)
                continue
                
            # 2. Consultar a Telegram MTProto con tolerancia a fallos
            validation = None
            try:
                validation = await asyncio.wait_for(
                    validator.consultar_dni(dni),
                    timeout=35.0
                )
            except (asyncio.TimeoutError, Exception) as e:
                # REGLA DE ORO: Si timeout o error de red, NO rechazar el ticket.
                print(f"[Worker] REGLA DE ORO - Timeout/excepción en Telegram para DNI {dni}: {e}")
                try:
                    supabase.table('cola_votos').update({
                        "estado": "pendiente", 
                        "mensaje": "Servidores de validación ocupados. Reintentando..."
                    }).eq('id', ticket_id).execute()
                except Exception as db_err:
                    print(f"[Worker] Error revirtiendo ticket a pendiente: {db_err}")
                await asyncio.sleep(5)
                continue

            status = validation.get("status") if validation else "error"
            
            # 3. Tolerancia a fallos: Respuestas no concluyentes vuelven a 'pendiente'
            if status in ["timeout", "error"]:
                print(f"[Worker] REGLA DE ORO - Validación no concluyente ({status}): {validation.get('error')}. Reintentando ticket en siguiente ciclo...")
                try:
                    supabase.table('cola_votos').update({
                        "estado": "pendiente", 
                        "mensaje": "Esperando respuesta oficial de RENIEC. Reintentando..."
                    }).eq('id', ticket_id).execute()
                except Exception as db_err:
                    print(f"[Worker] Error revirtiendo ticket a pendiente: {db_err}")
                await asyncio.sleep(5)
                continue

            # 4. Si el bot responde explícitamente que no existe o [ ✖ ] -> DNI Falso -> Rechazar
            if status == "not_found":
                print(f"[Worker] DNI {dni} no encontrado en registros oficiales.")
                supabase.table('cola_votos').update({
                    "estado": "rechazado", 
                    "mensaje": "No se encontró información para los datos ingresados en RENIEC."
                }).eq('id', ticket_id).execute()
                await asyncio.sleep(5)
                continue

            # 5. Validación Estricta de Identidad
            if status == "success":
                # NOTA: Se ignora completamente el dígito verificador devuelto por el bot
                edad = validation.get("edad")
                distrito = validation.get("distrito", "")
                raw_text = validation.get("raw", "")
                
                # Regla: Edad obligatoria y >= 18
                if edad is None or edad < 18:
                    print(f"[Worker] DNI {dni} rechazado: no es mayor de edad (Edad: {edad}).")
                    supabase.table('cola_votos').update({
                        "estado": "rechazado", 
                        "mensaje": "El elector debe ser mayor de edad (18+)."
                    }).eq('id', ticket_id).execute()
                    await asyncio.sleep(5)
                    continue

                # Regla: Distrito obligatorio y debe contener "LA PECA" (sin tildes, mayúsculas o minúsculas)
                distrito_norm = normalizar_texto(distrito)
                raw_norm = normalizar_texto(raw_text)
                
                if "LA PECA" not in distrito_norm and "LA PECA" not in raw_norm:
                    print(f"[Worker] DNI {dni} rechazado: no pertenece a La Peca (Distrito: '{distrito}').")
                    supabase.table('cola_votos').update({
                        "estado": "rechazado", 
                        "mensaje": "El elector no registra domicilio en el distrito de La Peca."
                    }).eq('id', ticket_id).execute()
                    await asyncio.sleep(5)
                    continue

                # Cumple ambos (>=18 y "LA PECA"): Registrar voto y ticket usado
                print(f"[Worker] ¡DNI {dni} aprobado! Registrando voto y guardando ticket...")
                try:
                    # Guardar ticket en tickets_usados (evitar doble voto futuro)
                    supabase.table('tickets_usados').insert({
                        'ticket': dni
                    }).execute()
                    
                    # Registrar voto en la tabla votos
                    supabase.table('votos').insert({
                        'dni': dni,
                        'opcion_id': candidato_id,
                        'digito_verificador': dv
                    }).execute()
                    
                    # Actualizar estado en la cola a aprobado
                    supabase.table('cola_votos').update({
                        "estado": "aprobado", 
                        "mensaje": "¡Tu voto ha sido registrado exitosamente!"
                    }).eq('id', ticket_id).execute()
                    print(f"[Worker] Voto aprobado exitosamente para DNI {dni}.")
                except Exception as insert_err:
                    print(f"[Worker] Error en inserción de voto/ticket: {insert_err}")
                    supabase.table('cola_votos').update({
                        "estado": "rechazado", 
                        "mensaje": "Este DNI ya ha emitido un voto previamente."
                    }).eq('id', ticket_id).execute()

            # Cooldown anti-saturación obligatorio de 5s al final de cada iteración
            await asyncio.sleep(5)
            
        except Exception as e:
            print(f"[Worker] Excepción no controlada en bucle: {e}")
            await asyncio.sleep(5)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(process_vote_queue())

@app.on_event("shutdown")
async def shutdown_event():
    if validator.client and validator.client.is_connected():
        await validator.client.disconnect()

@app.post("/api/votar")
async def enqueue_vote(request: VoteRequest):
    """
    Endpoint de encolado de votos:
    - Validación puramente estructural con Regex: DNI = 8 números exactos, DV = 1 carácter.
    - Se elimina cualquier cálculo matemático de Módulo 11.
    - El servidor asume que el DV es correcto estructuralmente y lo encola como 'pendiente'.
    """
    if supabase is None:
        return JSONResponse(status_code=500, content={"detail": "Error de conexión a la base de datos."})

    try:
        dni_clean = request.dni.strip()
        dv_clean = request.digito_verificador.strip()

        # 1. Validación estructural estricta: DNI = 8 números exactos, DV = 1 carácter
        if not re.match(r'^\d{8}$', dni_clean) or len(dv_clean) != 1:
            return JSONResponse(
                status_code=400, 
                content={"detail": "Formato inválido. El DNI debe tener 8 números exactos y el dígito verificador 1 carácter."}
            )
            
        # 2. Verificar de inmediato si este DNI ya ha votado
        try:
            voto_previo = supabase.table('votos').select('id').eq('dni', dni_clean).execute()
            ticket_previo = supabase.table('tickets_usados').select('ticket').eq('ticket', dni_clean).execute()
            if (voto_previo.data and len(voto_previo.data) > 0) or (ticket_previo.data and len(ticket_previo.data) > 0):
                return JSONResponse(
                    status_code=400, 
                    content={"detail": "Este DNI ya ha emitido un voto en este proceso electoral."}
                )
        except Exception as check_err:
            print(f"Advertencia chequeando duplicado en /api/votar: {check_err}")

        # 3. Encolar ticket en estado 'pendiente'
        response = supabase.table('cola_votos').insert({
            'dni': dni_clean,
            'dv': dv_clean.upper(),
            'candidato_id': request.opcion_id,
            'user_token': request.user_token,
            'estado': 'pendiente',
            'mensaje': 'En cola de validación'
        }).execute()
        
        if not response.data:
            return JSONResponse(status_code=500, content={"detail": "No se pudo generar el ticket en la cola."})

        return JSONResponse(status_code=202, content={
            "message": "Ticket encolado exitosamente", 
            "ticket_id": response.data[0]['id']
        })
    except Exception as e:
        print(f"Error DB Cola: {e}")
        return JSONResponse(status_code=500, content={"detail": "Error al procesar tu turno. Intenta nuevamente."})

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
        
        supabase.table("solicitudes_revocacion").update({"estado": "aprobado"}).eq("id", id).execute()
        
        return JSONResponse(status_code=200, content={"message": "Revocación aprobada exitosamente."})
    except Exception as e:
        print(f"Error aprobando revocacion: {e}")
        return JSONResponse(status_code=500, content={"detail": "Error al aprobar revocación."})

@app.get("/api/results")
async def get_results():
    if supabase is None:
        return JSONResponse(status_code=500, content={"detail": "Error de base de datos local."})
        
    try:
        # Get all candidates
        cand_response = supabase.table('candidatos').select('*').neq('name', '___telegram_session___').order('id').execute()
        candidates = cand_response.data or []
        
        # Get all votes
        votes_response = supabase.table('votos').select('opcion_id').execute()
        votes = votes_response.data or []
        
        # Count votes
        vote_counts = {}
        for v in votes:
            vote_counts[v['opcion_id']] = vote_counts.get(v['opcion_id'], 0) + 1
            
        results = []
        for i, c in enumerate(candidates):
            results.append({
                "name": f"Candidato {i+1}",
                "votos": vote_counts.get(c['id'], 0)
            })
            
        return results
    except Exception as e:
        print(f"Error fetching results: {e}")
        return []

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
