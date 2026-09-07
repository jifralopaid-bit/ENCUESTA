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
    Worker en segundo plano con Tolerancia a Fallos y Aprobación Exclusiva:
    1. Erradicación del Dígito Verificador (DV):
       - El DV es una simulación estructural y JAMÁS es motivo de comparación ni rechazo.
       - No se compara ningún DV del bot ni de la base de datos.
    2. Criterios de Aprobación Exclusivos:
       Una vez que el bot retorna exitosamente la ficha de RENIEC:
       a) Edad: Debe ser >= 18 años.
       b) Ubicación: El distrito debe contener 'LA PECA'.
       - Si cumple ambas, el voto se aprueba.
       - Si falla alguna, se rechaza por ese motivo específico (menor de edad o distrito no válido).
    3. Tolerancia a Fallos Confirmada:
       - Si ocurre un TimeoutError, demora o el bot no responde: el estado del ticket NO se altera
         (permanece estrictamente en 'pendiente') y se hace 'continue' para reintentarlo en la siguiente vuelta.
    4. DNI no encontrado:
       - Si el bot confirma explícitamente que el DNI no existe en RENIEC, se rechaza.
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
            
            print(f"[Worker] Evaluando ticket {ticket_id} para DNI {dni} (candidato_id: {candidato_id})...")
            
            # 1. Verificar si ya votó previamente (en votos o tickets_usados)
            voto_resp = supabase.table('votos').select('id').eq('dni', dni).execute()
            ticket_resp = supabase.table('tickets_usados').select('ticket').eq('ticket', dni).execute()
            if (voto_resp.data and len(voto_resp.data) > 0) or (ticket_resp.data and len(ticket_resp.data) > 0):
                print(f"[Worker] DNI {dni} ya votó previamente. Rechazando ticket.")
                supabase.table('cola_votos').update({
                    "estado": "rechazado", 
                    "mensaje": "Este DNI ya ha emitido un voto en este proceso electoral."
                }).eq('id', ticket_id).execute()
                await asyncio.sleep(5)
                continue
                
            # 2. Consultar a Telegram MTProto
            # NOTA CRÍTICA: NO hacemos UPDATE previo a 'procesando' para que, ante cualquier timeout o demora,
            # el ticket quede estrictamente intacto en estado 'pendiente'.
            validation = None
            try:
                validation = await asyncio.wait_for(
                    validator.consultar_dni(dni),
                    timeout=35.0
                )
            except (asyncio.TimeoutError, Exception) as e:
                print(f"[Worker] Timeout o demora en Telegram para DNI {dni}: {e}")
                # TOLERANCIA A FALLOS: No se hace ningún UPDATE. El ticket queda intacto en 'pendiente'.
                await asyncio.sleep(5)
                continue

            status = validation.get("status") if validation else "error"
            error_text = str(validation.get("error", "")).lower()

            # REGLA 4: Si telegram_service arroja error de tiempo de espera agotado, timeout o saturados:
            # El worker DEBE hacer continue SIN HACER NINGÚN UPDATE a la tabla cola_votos.
            if (
                status in ["timeout", "error"] or
                "tiempo de espera agotado" in error_text or
                "timeout" in error_text or
                "saturados" in error_text or
                "demoras" in error_text or
                "anti-spam" in error_text or
                "ocupado" in error_text
            ):
                print(f"[Worker] Tolerancia a fallos: respuesta no concluyente ({validation.get('error')}). Se omite UPDATE. Ticket {ticket_id} permanece intacto en 'pendiente'.")
                await asyncio.sleep(5)
                continue

            # SOLO se actualiza a 'rechazado' si el bot confirma explícitamente:
            
            # Caso A: DNI no encontrado / inexistente
            if status == "not_found":
                print(f"[Worker] DNI {dni} confirmado como no existente por RENIEC.")
                supabase.table('cola_votos').update({
                    "estado": "rechazado", 
                    "mensaje": "No se encontró información para los datos ingresados en RENIEC."
                }).eq('id', ticket_id).execute()
                await asyncio.sleep(5)
                continue

            # Caso B: Datos oficiales recibidos: validar edad y distrito
            if status == "success":
                edad = validation.get("edad")
                distrito = validation.get("distrito", "")
                raw_text = validation.get("raw", "")

                # 1. Menor de edad
                if edad is None or edad < 18:
                    print(f"[Worker] DNI {dni} rechazado: menor de edad ({edad}).")
                    supabase.table('cola_votos').update({
                        "estado": "rechazado", 
                        "mensaje": "El elector debe ser mayor de edad (18+)."
                    }).eq('id', ticket_id).execute()
                    await asyncio.sleep(5)
                    continue

                # 2. Distrito fuera de La Peca
                distrito_norm = normalizar_texto(distrito)
                raw_norm = normalizar_texto(raw_text)

                if "LA PECA" not in distrito_norm and "LA PECA" not in raw_norm:
                    print(f"[Worker] DNI {dni} rechazado: distrito '{distrito}' no es La Peca.")
                    supabase.table('cola_votos').update({
                        "estado": "rechazado", 
                        "mensaje": "El elector no registra domicilio en el distrito de La Peca."
                    }).eq('id', ticket_id).execute()
                    await asyncio.sleep(5)
                    continue

                # 3. Cumple todos los requisitos: Registrar voto
                print(f"[Worker] ¡DNI {dni} aprobado! Registrando voto para candidato_id={candidato_id}...")
                try:
                    # Registrar ticket usado para evitar doble voto futuro
                    supabase.table('tickets_usados').insert({'ticket': dni}).execute()
                    
                    # Registrar el voto exactamente para el candidato elegido
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
                    print(f"[Worker] Voto asignado exitosamente al candidato {candidato_id} para DNI {dni}.")
                except Exception as insert_err:
                    print(f"[Worker] Error insertando voto/ticket: {insert_err}")
                    supabase.table('cola_votos').update({
                        "estado": "rechazado", 
                        "mensaje": "Este DNI ya ha emitido un voto previamente."
                    }).eq('id', ticket_id).execute()

            # Cooldown de 5s entre cada iteración del worker
            await asyncio.sleep(5)
            
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
async def enqueue_vote(request: VoteRequest):
    """
    Endpoint de encolado de votos:
    - Validación puramente estructural: DNI = 8 números exactos, DV = 1 carácter.
    - Se verifica rigurosamente que opcion_id recibido se almacene como candidato_id.
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
            
        # 2. Encolar ticket asegurando candidato_id exacto
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
        # Obtener candidatos ordenados por orden oficial
        cand_response = supabase.table('candidatos').select('*').neq('name', '___telegram_session___').order('orden').execute()
        candidates = cand_response.data or []
        
        # Obtener todos los votos
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
            results.append({
                "id": c['id'],
                "name": c['name'],
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
