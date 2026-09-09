-- fase3_rls_update.sql
-- Este script permite que el backend (usando la clave anon) pueda actualizar la columna "estado"
-- de los votos para que el botón "Revocar / Restablecer" funcione correctamente.

CREATE POLICY "Permitir_update_api_votos"
ON public.votos
FOR UPDATE TO anon
USING (true)
WITH CHECK (true);
