-- fase2_auditoria.sql
-- Este script agrega la columna "estado" a la tabla de votos para soportar revocación y restablecimiento
-- sin perder la información del voto original.

-- 1. Agregar la columna 'estado' si no existe
ALTER TABLE public.votos
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'valido';

-- 2. Asegurar que los votos existentes tengan el estado 'valido'
UPDATE public.votos
SET estado = 'valido'
WHERE estado IS NULL;

-- 3. (Opcional) Restricción para asegurar que solo haya 'valido' o 'revocado'
ALTER TABLE public.votos
ADD CONSTRAINT check_estado_voto CHECK (estado IN ('valido', 'revocado'));
