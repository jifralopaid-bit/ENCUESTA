# Plataforma de Votación Cultural - La Peca

Plataforma Full-Stack para gestionar votaciones de un evento cultural, con validación de tickets a través de un Bot de Telegram usando MTProto (Telethon).

## Estructura del Proyecto

- `frontend/`: Aplicación React + Vite + Tailwind CSS.
- `backend/`: API Python (FastAPI) + Telethon + Supabase.

## Requisitos Previos

- Node.js (v18+)
- Python (3.9+)
- Una cuenta de Supabase con un proyecto creado.

## 1. Configuración de la Base de Datos (Supabase)

1. En tu proyecto de Supabase, ve al **SQL Editor** y ejecuta el siguiente script para crear las tablas necesarias:

```sql
-- Tabla para registrar tickets usados y evitar duplicados
CREATE TABLE tickets_usados (
  ticket VARCHAR(8) PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para almacenar los votos
CREATE TABLE votos (
  id SERIAL PRIMARY KEY,
  ticket VARCHAR(8) REFERENCES tickets_usados(ticket),
  opcion_id INTEGER NOT NULL CHECK (opcion_id >= 1 AND opcion_id <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

2. Obtén tu `SUPABASE_URL` y `SUPABASE_KEY` (anon key) desde la sección de configuración de API en Supabase.

## 2. Configuración del Backend

1. Navega a la carpeta `backend`:
   ```bash
   cd backend
   ```
2. Crea un entorno virtual (opcional pero recomendado):
   ```bash
   python -m venv venv
   source venv/Scripts/activate  # En Windows
   ```
3. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```
4. Configura las variables de entorno en el archivo `.env`:
   ```env
   SUPABASE_URL=tu_supabase_url_aqui
   SUPABASE_KEY=tu_supabase_key_aqui
   ```
5. **Autenticación Inicial de Telegram:** La primera vez que ejecutes el servidor, Telethon te pedirá que inicies sesión.
   ```bash
   python main.py
   ```
   - Te pedirá tu número de teléfono (incluye el código de país, ej. `+51...`).
   - Te pedirá el código de verificación que Telegram te envíe.
   - Una vez ingresado, se creará un archivo `la_peca_session.session` y el servidor iniciará en `http://localhost:8000`.

## 3. Configuración del Frontend

1. Abre otra terminal y navega a la carpeta `frontend`:
   ```bash
   cd frontend
   ```
2. (Si no lo has hecho) Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
4. Abre la aplicación en tu navegador (usualmente en `http://localhost:5173`).

## Reglas de Validación Soportadas

El sistema consulta al `@BotValidadorTest` en Telegram por cada voto y extrae mediante expresiones regulares:
1. **Dígito de Control:** Debe coincidir con el ingresado por el usuario.
2. **Puntaje:** Debe ser mayor o igual a 18.
3. **Sede:** Debe ser estrictamente "LA PECA".
4. **Unicidad:** Se valida contra la tabla `tickets_usados` en Supabase.
