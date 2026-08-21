import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // get_results logic from python
    const { data: votos, error } = await supabase
      .from('votos')
      .select('opcion_id');

    if (error) {
      throw error;
    }

    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    votos.forEach(voto => {
      const optId = voto.opcion_id;
      if (counts[optId] !== undefined) {
        counts[optId]++;
      }
    });

    const formatted_results = [];
    for (let i = 1; i <= 5; i++) {
      formatted_results.push({
        name: `Candidato ${i}`,
        votos: counts[i]
      });
    }

    return res.status(200).json(formatted_results);

  } catch (error) {
    console.error("API Results Error:", error);
    return res.status(500).json({ detail: 'Error interno del servidor al obtener resultados.' });
  }
}
