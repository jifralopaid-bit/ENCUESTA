import asyncio
# pyrefly: ignore [missing-import]
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError

API_ID = 30647648
API_HASH = "bb0e1e43bc59d89507413988fb5d4fa3"
BOT_USERNAME = "@DominusDox_bot"
SESSION_NAME = "la_peca_session"

client = TelegramClient(SESSION_NAME, API_ID, API_HASH)

async def start_telegram_client():
    await client.start()
    print("Cliente de Telegram iniciado y autenticado correctamente.")

async def consultar_ticket_bot(ticket: str) -> str:
    if not client.is_connected():
        await client.connect()

    bot_entity = await client.get_entity(BOT_USERNAME)
    command = f"/dni {ticket}"
    print(f"\n[TELEGRAM] Enviando al bot: {command}")
    
    # Enviamos el comando y guardamos el mensaje enviado para comparar fechas/ids
    sent_msg = await client.send_message(bot_entity, command)
    
    print("[TELEGRAM] Esperando respuesta del bot de forma continua (sin límite de tiempo)...")
    
    response_text = ""
    segundos = 0
    # Espera continua sin límite de tiempo
    while not response_text:
        await asyncio.sleep(1.0)
        segundos += 1
        
        # Barra de progreso visual en terminal
        prog = (segundos % 20) + 1
        barra = "█" * prog + "░" * (20 - prog)
        print(f"\r[TELEGRAM] [{barra}] Esperando al bot... {segundos}s transcurridos", end="", flush=True)
        
        messages = await client.get_messages(bot_entity, limit=5)
        for msg in messages:
            # Debe ser un mensaje recibido (no enviado por nosotros) y posterior a nuestro comando
            if not msg.out and msg.text and msg.id > sent_msg.id:
                # Verificamos si contiene datos útiles
                if any(k in msg.text.upper() for k in ["DOMINUS", "RENIEC", "NACIMIENTO", "DISTRITO", "DNI"]):
                    response_text = msg.text
                    print(f"\n[TELEGRAM] ¡Texto del bot capturado con éxito en {segundos}s!")
                    print(f"[TELEGRAM] Mensaje detectado:\n---\n{msg.text}\n---")
                    break
                    
    return response_text