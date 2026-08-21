import { createClient } from '@supabase/supabase-js';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

const API_ID = 2040;
const API_HASH = 'b18441a1ff607e10a989891a5462e627';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Función para extraer y validar (igual que validator.py)
function validateBotResponse(text, inputControlDigit) {
  if (!text) return { valid: false, message: "Sin respuesta del bot." };
  
  const textClean = text.replace(/[\*`]/g, '');
  
  // Extraer Dígito Verificador
  const digitMatch = textClean.match(/DNI.*?-\s*([0-9Kk])/i);
  const botDigit = digitMatch ? digitMatch[1].toUpperCase() : null;
  
  // Extraer Edad
  const ageMatch = textClean.match(/EDAD.*?(\d+)\s*A[ÑN]OS/i);
  const score = ageMatch ? parseInt(ageMatch[1], 10) : null;
  
  // Extraer Distrito
  const locationMatches = [...textClean.matchAll(/DISTRITO.*?[➾=>⇒:]\s*([A-Za-z\s]+)/gi)];
  let location = null;
  if (locationMatches.length > 0) {
    location = locationMatches[locationMatches.length - 1][1].split('\n')[0].trim().toUpperCase();
  }

  if (!botDigit || score === null || !location) {
    return { valid: false, message: "No se pudo extraer toda la información." };
  }
  
  if (String(inputControlDigit).toUpperCase() !== botDigit) {
    return { valid: false, message: `El dígito de control no coincide. Esperado: ${botDigit}, Ingresado: ${inputControlDigit}` };
  }
  
  if (score < 18) {
    return { valid: false, message: `Debes ser mayor de edad para votar. Edad registrada: ${score} años.` };
  }
  
  if (location !== "LA PECA") {
    return { valid: false, message: `Solo pueden votar residentes del distrito de LA PECA. Tu distrito es: ${location}.` };
  }
  
  return { valid: true };
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { ticket, control_digit, option_id } = req.body;

    if (!ticket || !control_digit || !option_id) {
      return res.status(400).json({ detail: 'Faltan datos requeridos.' });
    }

    // 1. Verificar si el ticket ya votó
    const { data: existingVote } = await supabase
      .from('votos')
      .select('id')
      .eq('dni', ticket)
      .single();

    if (existingVote) {
      return res.status(400).json({ detail: "Este ticket ya ha sido utilizado para votar." });
    }

    // 2. Obtener Sesión de Telegram
    const { data: settingsData, error: settingsError } = await supabase
      .from('candidatos')
      .select('proposal')
      .eq('name', '___telegram_session___')
      .single();

    if (!settingsData || !settingsData.proposal) {
      return res.status(500).json({ detail: 'El sistema no está conectado a Telegram. Contacte al administrador.' });
    }

    const sessionString = settingsData.proposal;
    const stringSession = new StringSession(sessionString);
    const client = new TelegramClient(stringSession, API_ID, API_HASH, {
      connectionRetries: 3,
    });

    await client.connect();

    // 3. Consultar al Bot
    await client.sendMessage('@Reniec_2024_bot', { message: ticket });
    
    // Esperar respuesta (simple polling)
    let botResponse = null;
    let attempts = 0;
    while (attempts < 15) { // Esperar hasta 15 segundos
      await new Promise(r => setTimeout(r, 1000));
      const messages = await client.getMessages('@Reniec_2024_bot', { limit: 1 });
      if (messages.length > 0) {
        const msg = messages[0].message;
        if (msg && msg !== ticket && (msg.includes('DNI') || msg.includes('EDAD'))) {
          botResponse = msg;
          break;
        }
      }
      attempts++;
    }

    await client.disconnect();

    if (!botResponse) {
      return res.status(500).json({ detail: 'El bot validador de RENIEC no respondió a tiempo.' });
    }

    console.log("Bot Response:", botResponse);

    // 4. Validar reglas de negocio
    const validation = validateBotResponse(botResponse, control_digit);
    if (!validation.valid) {
      return res.status(400).json({ detail: validation.message });
    }

    // 5. Registrar voto
    const { error: insertError } = await supabase
      .from('votos')
      .insert({ dni: ticket, opcion_id: option_id });

    if (insertError) {
      console.error(insertError);
      return res.status(500).json({ detail: 'Error al registrar el voto en la base de datos.' });
    }

    return res.status(200).json({ success: true, message: '¡Tu voto ha sido registrado exitosamente!' });

  } catch (error) {
    console.error("API Vote Error:", error);
    return res.status(500).json({ detail: 'Error interno del servidor.' });
  }
}
