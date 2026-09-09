-- Fase 1: Blindaje Supabase (RLS y Doble Ciego)

-- 1. Modificar tabla `votos` para cambiar a `dni_hash` y agregar demografía
ALTER TABLE public.votos RENAME COLUMN dni TO dni_hash;
ALTER TABLE public.votos ADD COLUMN IF NOT EXISTS edad integer;
ALTER TABLE public.votos ADD COLUMN IF NOT EXISTS genero text;

-- 2. Habilitar RLS en `votos` y `padron_electoral`
ALTER TABLE public.votos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.padron_electoral ENABLE ROW LEVEL SECURITY;

-- 3. Políticas para `votos`
DROP POLICY IF EXISTS "Permitir INSERT a todos en votos" ON public.votos;
DROP POLICY IF EXISTS "Solo admins leen votos" ON public.votos;
DROP POLICY IF EXISTS "Permitir lectura publica de votos" ON public.votos;

-- Regla 1: La API pública (Backend y frontend) SOLO puede hacer INSERT en votos
CREATE POLICY "Permitir INSERT a todos en votos"
ON public.votos
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Regla 2: Solo los usuarios autenticados (Panel Admin) pueden leer los votos estadísticos
CREATE POLICY "Solo admins leen votos"
ON public.votos
FOR SELECT
TO authenticated
USING (true);

-- 4. Políticas para `padron_electoral`
DROP POLICY IF EXISTS "Permitir select padron" ON public.padron_electoral;
DROP POLICY IF EXISTS "Permitir update padron backend" ON public.padron_electoral;
DROP POLICY IF EXISTS "Lectura publica padron" ON public.padron_electoral;

-- El backend (usando anon key) necesita poder buscar en el padrón para validar el voto
CREATE POLICY "Permitir select padron"
ON public.padron_electoral
FOR SELECT
TO anon, authenticated
USING (true);

-- El backend necesita actualizar "ya_voto = true" cuando el voto es procesado exitosamente
CREATE POLICY "Permitir update padron backend"
ON public.padron_electoral
FOR UPDATE
TO anon, authenticated
USING (true);
