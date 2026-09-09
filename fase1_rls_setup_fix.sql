-- Fix: Permitir que el backend (que usa la Anon Key) pueda leer e insertar correctamente
DROP POLICY IF EXISTS "Permitir INSERT a todos en votos" ON public.votos;
DROP POLICY IF EXISTS "Solo admins leen votos" ON public.votos;

-- Como el backend usa la clave Anon, temporalmente necesita poder leer los votos para el Dashboard
CREATE POLICY "Permitir SELECT a anon"
ON public.votos
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Permitir INSERT a anon"
ON public.votos
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
