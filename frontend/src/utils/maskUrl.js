const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vexjqvxxsyiuybxetlnq.supabase.co';
const PUBLIC_STORAGE_PATH = `${SUPABASE_URL}/storage/v1/object/public/`;

export const maskUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  
  if (url.startsWith(PUBLIC_STORAGE_PATH)) {
    return url.replace(PUBLIC_STORAGE_PATH, '/archivo/');
  }
  
  return url;
};
