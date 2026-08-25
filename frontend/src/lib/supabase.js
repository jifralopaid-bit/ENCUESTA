import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabaseClient = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Faltan credenciales de base de datos. Verifica import.meta.env.VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
} else {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = supabaseClient;
