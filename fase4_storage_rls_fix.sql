-- Fix para solucionar "new row violates row-level security policy" al subir archivos
-- Ejecuta este script en el SQL Editor de tu panel de Supabase.

-- 1. Permitir a usuarios anónimos subir archivos al bucket 'archivos_electorales'
CREATE POLICY "Permitir_subida_anonima_archivos_electorales"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
    bucket_id = 'archivos_electorales'
);

-- 2. Permitir lectura pública de los archivos de ese bucket (para que se puedan ver las fotos y PDFs)
CREATE POLICY "Permitir_lectura_publica_archivos_electorales"
ON storage.objects
FOR SELECT
TO public
USING (
    bucket_id = 'archivos_electorales'
);

-- Opcional: Permitir borrar o actualizar archivos si el administrador necesita reemplazarlos
CREATE POLICY "Permitir_update_anonimo_archivos_electorales"
ON storage.objects
FOR UPDATE
TO anon
USING (
    bucket_id = 'archivos_electorales'
);

CREATE POLICY "Permitir_delete_anonimo_archivos_electorales"
ON storage.objects
FOR DELETE
TO anon
USING (
    bucket_id = 'archivos_electorales'
);
