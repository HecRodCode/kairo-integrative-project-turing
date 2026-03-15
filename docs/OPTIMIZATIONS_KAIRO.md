# ⚡ Optimizaciones — Kairo Platform
**Fecha:** 14 de marzo de 2026  
**Auditor:** QA técnico independiente  
**Alcance:** Performance, arquitectura, seguridad, mantenibilidad  
**Nota:** Estas son oportunidades de mejora, no bugs. El sistema funciona, pero puede funcionar mejor.

---

## Índice

1. [Resumen por impacto](#resumen-por-impacto)
2. [Base de datos](#-base-de-datos)
3. [Backend Node.js](#-backend-nodejs)
4. [Backend Python](#-backend-python)
5. [Frontend](#-frontend)
6. [Arquitectura general](#-arquitectura-general)
7. [Seguridad](#-seguridad)
8. [Mantenibilidad y DX](#-mantenibilidad-y-dx)
9. [Tabla de impacto vs esfuerzo](#tabla-de-impacto-vs-esfuerzo)

---

## Resumen por impacto

| Área | Optimizaciones | Ganancia esperada |
|------|---------------|-------------------|
| Base de datos | 6 | Queries 3-10x más rápidas |
| Backend Node.js | 9 | Latencia -40%, throughput +60% |
| Backend Python | 5 | Tiempo de generación -30% |
| Frontend | 8 | First load -50%, UX mejorada |
| Arquitectura | 5 | Resiliencia y escalabilidad |
| Seguridad | 4 | Superficie de ataque reducida |
| Mantenibilidad | 6 | Velocidad de desarrollo +40% |

---

## 🗄 Base de Datos

---

### OPT-DB-01 · Índices compuestos faltantes para queries críticas

**Problema:** Los queries más frecuentes del sistema filtran por combinaciones de columnas, pero solo existen índices simples.

```sql
-- Query de getCoderDashboard — ejecuta esto sin índice compuesto:
WHERE u.role = 'coder' AND u.clan = $1

-- Query de getRiskReports — sin índice compuesto:
WHERE rf.coder_id = u.id AND rf.resolved = false

-- Query de listAssignmentsCoder — sin índice compuesto:
WHERE a.is_active = true AND (a.scope = 'all' OR (a.scope = 'clan' AND a.clan_id = $1))

-- Query de getActivePlan — sin índice compuesto:
WHERE coder_id = $1 AND is_active = true
```

**Fix — agregar en una migración:**
```sql
-- Para filtros de clan + rol (dashboard TL)
CREATE INDEX idx_users_clan_role ON users(clan, role);

-- Para flags de riesgo activos
CREATE INDEX idx_risk_active ON risk_flags(coder_id, resolved) WHERE resolved = false;

-- Para plan activo por coder
CREATE INDEX idx_plans_coder_active ON complementary_plans(coder_id, is_active) WHERE is_active = true;

-- Para notificaciones no leídas
CREATE INDEX idx_feedback_coder_unread ON tl_feedback(coder_id) WHERE is_read = false;

-- Para assignments activos por clan
CREATE INDEX idx_assignments_scope_clan ON assignments(scope, clan_id) WHERE is_active = true;

-- Para actividades por plan
CREATE INDEX idx_exercises_plan_day ON exercises(plan_id, day_number);
```

**Impacto:** Los queries de dashboard TL y coder pasan de full table scan a index scan. En tablas con 1000+ registros la diferencia es de segundos a milisegundos.

---

### OPT-DB-02 · Índice GIN faltante en columnas JSONB consultadas

**Problema:** `moodle_progress.weeks_completed` y `complementary_plans.plan_content` son JSONB que se leen frecuentemente pero no tienen índice GIN.

```sql
-- Sin índice GIN, Postgres hace sequential scan en el JSONB completo
SELECT * FROM moodle_progress WHERE weeks_completed @> '[{"week": 1}]';
```

**Fix:**
```sql
CREATE INDEX idx_moodle_weeks_gin ON moodle_progress USING GIN (weeks_completed);
CREATE INDEX idx_plans_content_gin ON complementary_plans USING GIN (plan_content);
```

**Impacto:** Búsquedas dentro de JSONB 5-20x más rápidas cuando el dataset crece.

---

### OPT-DB-03 · Vista `v_coder_dashboard` con 7 JOINs sin materializar

**Problema:** La vista tiene 7 LEFT JOINs y se ejecuta completa cada vez que el dashboard carga. Con 50 coders activos simultáneos genera trabajo redundante en la DB.

```sql
-- La vista actual recalcula todo en cada SELECT:
CREATE VIEW v_coder_dashboard AS
SELECT ... FROM users u
LEFT JOIN soft_skills_assessment ssa ON u.id = ssa.coder_id
LEFT JOIN moodle_progress mp ON u.id = mp.coder_id
LEFT JOIN modules m ON mp.module_id = m.id
LEFT JOIN complementary_plans cp ON u.id = cp.coder_id AND cp.is_active = TRUE
LEFT JOIN plan_activities pa ON cp.id = pa.plan_id
LEFT JOIN activity_progress ap ON pa.id = ap.activity_id AND ap.coder_id = u.id
WHERE u.role = 'coder'
GROUP BY ...  -- 7 campos de agrupación
```

**Fix:**
```sql
-- Convertir a vista materializada con refresh periódico
CREATE MATERIALIZED VIEW mv_coder_dashboard AS
  -- mismo SELECT --
WITH DATA;

-- Índice en la vista materializada
CREATE UNIQUE INDEX ON mv_coder_dashboard(id);

-- Refresh automático cuando cambia activity_progress
-- (via trigger o cron cada 5 min en producción)
CREATE OR REPLACE FUNCTION refresh_coder_dashboard()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_coder_dashboard;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

**Impacto:** El dashboard TL pasa de recalcular 7 JOINs por request a leer datos pre-calculados. Especialmente notable cuando el TL recarga varias veces seguidas.

---

### OPT-DB-04 · `completed_days` en `complementary_plans` crece ilimitado como JSONB

**Problema:** El campo `completed_days` en `complementary_plans` almacena un objeto JSONB que crece con cada día completado:

```json
{
  "1": {"completedAt": "2026-03-01T..."},
  "2": {"completedAt": "2026-03-02T..."},
  ...
  "20": {"completedAt": "2026-03-20T..."}
}
```

Cada UPDATE reescribe el objeto JSONB completo aunque solo cambie un campo. Además no existe la columna en el schema actual (es uno de los bugs del audit), lo que indica que se está guardando en `plan_content` también, duplicando datos.

**Fix:** Crear tabla separada para el progreso por día:
```sql
CREATE TABLE plan_day_completions (
  id          SERIAL PRIMARY KEY,
  plan_id     INT NOT NULL REFERENCES complementary_plans(id) ON DELETE CASCADE,
  day_number  SMALLINT NOT NULL CHECK (day_number BETWEEN 1 AND 20),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (plan_id, day_number)
);
CREATE INDEX idx_day_completions_plan ON plan_day_completions(plan_id);
```

**Impacto:** INSERTs puntuales en lugar de UPDATE de objeto JSONB completo. Queries de conteo de días completados pasan de `jsonb_object_keys` a `COUNT(*)`.

---

### OPT-DB-05 · Tabla `session` de express-session sin limpieza automática

**Problema:** `connect-pg-simple` crea la tabla `session` en PostgreSQL pero no hay mecanismo de limpieza de sesiones expiradas. Con el tiempo la tabla crece indefinidamente.

**Fix:** Activar el pruning automático que ya trae `connect-pg-simple`:
```js
// backend-node/src/server.js
const sessionStore = new PgSession({
  conString: sessionStoreUrl,
  tableName: 'session',
  createTableIfMissing: true,
  pruneSessionInterval: 60 * 15, // ← agregar: limpiar cada 15 min
  errorLog: (err) => console.error('[SessionStore]', err.message),
});
```

**Impacto:** La tabla `session` no crece indefinidamente. Queries de validación de sesión son más rápidas cuando la tabla es pequeña.

---

### OPT-DB-06 · Pool de conexiones subdimensionado para producción en Railway

**Problema:** El pool está configurado con `max: 10` que es razonable para desarrollo pero puede ser bajo en producción con múltiples workers.

```js
// backend-node/src/config/database.js
const pool = new Pool({
  max: 10,                    // ← bajo para producción con carga real
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  statement_timeout: 30000,
});
```

Supabase en el tier gratuito tiene límite de conexiones concurrentes. El pooler de Supabase (PgBouncer) ya gestiona esto, pero la configuración local del pool de Node no lo refleja.

**Fix:**
```js
const pool = new Pool({
  max: process.env.NODE_ENV === 'production' ? 5 : 10,
  // En producción con Supabase pooler, menos conexiones directas son más eficientes
  // El pooler de Supabase multiplica las conexiones del lado del servidor
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // ← reducir de 30s a 10s para fallar rápido
  statement_timeout: 15000,       // ← reducir de 30s a 15s
});
```

---

## 🟢 Backend Node.js

---

### OPT-NODE-01 · Sin middleware de compresión — respuestas JSON sin comprimir

**Problema:** El servidor Express no usa compresión. Las respuestas del dashboard (que pueden tener 5-15KB de JSON) se envían sin comprimir.

```js
// server.js — no hay esto:
import compression from 'compression';
app.use(compression());
```

**Fix:**
```js
import compression from 'compression';
// Agregar ANTES de los middlewares de rutas:
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6 // balance entre CPU y tamaño
}));
```

**Instalar:** `npm install compression`  
**Impacto:** Respuestas JSON grandes (dashboard, lista de coders) reducen tamaño ~70%. En conexiones móviles la diferencia es perceptible.

---

### OPT-NODE-02 · Sin headers de seguridad HTTP (Helmet)

**Problema:** Express no configura headers de seguridad básicos. Sin `Helmet`, el servidor no envía `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, etc.

```js
// server.js — no hay esto:
import helmet from 'helmet';
app.use(helmet());
```

**Fix:**
```js
import helmet from 'helmet';
app.use(helmet({
  contentSecurityPolicy: false, // ajustar según el frontend
  crossOriginEmbedderPolicy: false,
}));
```

**Instalar:** `npm install helmet`  
**Impacto:** Protección automática contra clickjacking, MIME sniffing, y otros vectores comunes.

---

### OPT-NODE-03 · Morgan en modo `dev` en producción

**Problema:** Morgan está configurado en modo `dev` que colorea y formatea para terminal. En producción debería usar formato `combined` (estándar Apache) o `json` para ser consumido por herramientas de logging.

```js
// server.js
app.use(morgan('dev')); // ← siempre 'dev', en producción debería ser diferente
```

**Fix:**
```js
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
```

**Impacto:** Logs en producción legibles por herramientas como Datadog, Papertrail, Railway logs. Reduce ruido en producción.

---

### OPT-NODE-04 · `getUserClan` hace query a DB en cada llamada — sin caché en request

**Problema:** `getUserClan` en `resourceControllers.js` hace un `SELECT clan FROM users WHERE id = $1` cada vez que se llama. En funciones como `uploadResource`, se llama múltiples veces en el mismo request lifecycle:

```js
// resourceControllers.js — 3 queries separadas al mismo user en el mismo flujo:
async function uploadResource(req, res) {
  const tlClan = await getUserClan(tlId);          // query 1
  // ...
  const tlResult = await query('SELECT full_name FROM users WHERE id = $1', [tlId]); // query 2
  // ...
  const coderResult = await query(`SELECT id FROM users WHERE role = 'coder' AND clan = $1`, [tlClan]); // query 3
}
```

**Fix:** Una sola query que trae todo lo necesario del TL al inicio del request:
```js
async function uploadResource(req, res) {
  const tlId = req.user?.id;
  
  // Una sola query en lugar de 3:
  const { rows } = await query(
    'SELECT clan, full_name FROM users WHERE id = $1',
    [tlId]
  );
  const { clan: tlClan, full_name: tlName } = rows[0] ?? {};
  
  if (!tlClan) return res.status(400).json({ error: 'El TL no tiene clan asignado.' });
  // ... resto de la función
}
```

**Impacto:** Reduce de 3 a 1 los roundtrips a la DB en cada upload de recurso.

---

### OPT-NODE-05 · `getCoderDashboard` hace 7 queries paralelas pero algunas son dependientes

**Problema:** El dashboard lanza 7 queries con `Promise.all`, lo cual es correcto. Pero el resultado de `userResult` (que trae `current_module_id`) no se usa para enriquecer las demás queries. Todo se resuelve independientemente aunque podrían compartir datos.

```js
// coderControllers.js — bien estructurado, pero el query 4 (plan) 
// podría filtrarse mejor si usara el module_id del query 1:
const [userResult, softSkillsResult, progressResult, planResult, ...] = await Promise.all([
  query(`SELECT u.current_module_id ...`),  // query 1 trae module_id
  query(`SELECT ...`),                       // query 2
  query(`SELECT ...`),                       // query 3
  query(`SELECT id, targeted_soft_skill ...  -- query 4 no usa module_id del query 1
         FROM complementary_plans
         WHERE coder_id = $1 AND is_active = true`, [userId]),
  // ...
]);
```

**Fix menor:** Usar una sola query con CTE para los datos más relacionados:
```sql
WITH user_data AS (
  SELECT u.*, m.name AS module_name, m.total_weeks, m.is_critical
  FROM users u
  LEFT JOIN modules m ON m.id = u.current_module_id
  WHERE u.id = $1
),
active_plan AS (
  SELECT id, targeted_soft_skill, generated_at,
         moodle_status_snapshot->>'plan_type' AS plan_type
  FROM complementary_plans
  WHERE coder_id = $1 AND is_active = true
  ORDER BY generated_at DESC LIMIT 1
)
SELECT * FROM user_data, active_plan;
```

**Impacto:** Reduce de 7 a 5 roundtrips a DB en cada carga del dashboard.

---

### OPT-NODE-06 · `completeDay` en `coderControllers.js` — race condition potencial

**Problema:** La función lee `completed_days`, modifica el objeto en memoria y escribe de vuelta. Si dos requests llegan simultáneamente (doble-click), ambos leen el mismo estado inicial y uno sobrescribe al otro.

```js
// coderControllers.js
const check = await query(`SELECT completed_days FROM complementary_plans WHERE id = $1`, [planId]);
const current = check.rows[0].completed_days || {};
current[String(dayNum)] = { completedAt: new Date().toISOString() };
await query(`UPDATE complementary_plans SET completed_days = $1 WHERE id = $2`, [JSON.stringify(current), planId]);
// ↑ Entre el SELECT y el UPDATE, otro request puede leer el mismo estado
```

**Fix — usar UPDATE atómico con jsonb_set:**
```sql
UPDATE complementary_plans
SET completed_days = jsonb_set(
  COALESCE(completed_days, '{}'::jsonb),
  ARRAY[$1::text],
  $2::jsonb,
  true  -- create_missing = true
)
WHERE id = $3 AND coder_id = $4 AND is_active = true
RETURNING completed_days;
```

**Impacto:** Elimina race condition en doble-click. El UPDATE es atómico a nivel DB.

---

### OPT-NODE-07 · `authService` en el frontend no usa `AbortController` en todos los fetch

**Problema:** `auth-service.js` tiene un wrapper `fetchWithTimeout` con `AbortController`, pero `getMe()` usa `cachedFetch` que no tiene timeout:

```js
// auth-service.js
async getMe() {
  return cachedFetch(`${API_BASE}/auth/me`, { credentials: 'include' });
  // ↑ sin timeout — si el servidor no responde, el browser espera indefinidamente
},
```

**Fix:**
```js
async getMe() {
  return fetchWithTimeout(
    `${API_BASE}/auth/me`,
    { credentials: 'include' },
    10_000  // 10 segundos máximo
  );
},
```

---

### OPT-NODE-08 · Múltiples declaraciones de `PYTHON_API` en distintos controllers

**Problema:** La URL del microservicio Python se declara localmente en 5 archivos distintos:

```js
// coderControllers.js:
const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

// diagnosticControllers.js:
const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

// exerciseControllers.js:
const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

// iaControllers.js:
// (usa pythonApiService.js que también lo redeclara)

// resourceControllers.js:
const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';
```

Si cambia el puerto o la URL, hay que cambiarlo en 5 lugares.

**Fix:** Centralizar en `config.js` o en `pythonApiService.js` y que todos lo importen:
```js
// backend-node/src/config/index.js (nuevo archivo)
export const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';
export const NODE_ENV = process.env.NODE_ENV || 'development';

// En cada controller, en lugar de redeclarar:
import { PYTHON_API_URL } from '../config/index.js';
```

---

### OPT-NODE-09 · `cachedFetch` en el frontend — TTL de 5 segundos es muy corto para datos estables

**Problema:** `fetchCache.js` usa 5 segundos de TTL por defecto. El perfil de un usuario cambia raramente pero se refetch cada 5 segundos si se navega entre páginas.

```js
// fetchCache.js
const DEFAULT_TTL = 5_000; // 5 segundos
```

`profileService.js` ya usa 10 segundos, pero `authService.getMe()` y `authService.checkAuth()` usan el default o 5 segundos respectivamente.

**Fix:** Diferenciar TTL por tipo de dato:
```js
export const CACHE_TTL = {
  AUTH_CHECK: 10_000,    // 10s — sesión cambia poco
  USER_PROFILE: 30_000,  // 30s — perfil cambia muy poco
  DASHBOARD: 5_000,      // 5s — datos de progreso, más frecuentes
  STATIC: 60_000,        // 1min — módulos, clanes — no cambian
};
```

---

## 🐍 Backend Python

---

### OPT-PY-01 · Clientes Groq y Supabase se crean por cada request

**Problema:** En `cards.py` y `reports.py` se crean clientes nuevos en cada llamada al endpoint. La inicialización de estos clientes hace validación de API keys y establecimiento de conexiones:

```python
# cards.py — ejecutado en CADA request:
def _get_clients():
    return (
        Groq(api_key=os.getenv("GROQ_API_KEY")),          # ← nuevo cliente por request
        create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))  # ← idem
    )
```

**Fix — inicializar una sola vez al startup:**
```python
# backend-python/app/services/clients.py (nuevo archivo)
import os
from groq import Groq
from supabase import create_client, Client

_groq_client: Groq | None = None
_supabase_client: Client | None = None

def get_groq() -> Groq:
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY no configurada")
        _groq_client = Groq(api_key=api_key)
    return _groq_client

def get_supabase() -> Client:
    global _supabase_client
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")
        if not url or not key:
            raise ValueError("SUPABASE_URL o SUPABASE_SERVICE_KEY no configuradas")
        _supabase_client = create_client(url, key)
    return _supabase_client
```

**Impacto:** Elimina overhead de inicialización de cliente en cada request. Especialmente relevante bajo carga.

---

### OPT-PY-02 · Prompts de IA se construyen como strings en cada request — sin caché parcial

**Problema:** `build_interpretive_prompt()` y `build_analytical_prompt()` en `prompt_builder.py` construyen strings de 2-3KB en cada llamada. Partes del prompt son invariantes (instrucciones de formato, reglas de adaptación por estilo) y podrían pre-calcularse.

```python
# prompt_builder.py — esto se recalcula aunque el learning_style sea siempre 'visual':
def build_interpretive_prompt(context: Dict) -> str:
    ss     = context.get("soft_skills", {})
    style  = _get_style(ss.get("learning_style", "mixed"))  # lookup dict → ok
    # ...
    return f"""
### ROL
Eres Kairo, el Arquitecto Educativo de Riwi...
{style["tech_format"]}   # ← string largo, invariante por estilo
{style["soft_format"]}   # ← idem
...
"""
```

**Fix:** Pre-calcular el template base por learning_style y solo interpolar las partes variables:
```python
from functools import lru_cache

@lru_cache(maxsize=10)  # 5 estilos * 2 tipos de plan = 10 combinaciones máximo
def _get_base_template(plan_type: str, learning_style: str) -> str:
    """Pre-compila la parte invariante del prompt."""
    style = _get_style(learning_style)
    return f"""
### ROL
Eres Kairo...
### REGLAS DE ADAPTACIÓN
{style["tech_format"]}
{style["soft_format"]}
"""
```

**Impacto:** Las partes invariantes del prompt (~60% del string) se calculan una vez. Mejora marginal en latencia, más impacto en claridad del código.

---

### OPT-PY-03 · `generate_plan_with_ai` es `async` pero usa Groq síncrono

**Problema:** La función está declarada como `async` pero el cliente Groq de Python usa la API síncrona internamente. FastAPI ejecuta esto en el event loop bloqueando otros requests durante la generación.

```python
# ia_services.py
async def generate_plan_with_ai(context: Dict) -> Dict:
    # ...
    response = client.chat.completions.create(...)  # ← llamada síncrona bloqueante
    # ↑ Bloquea el event loop de FastAPI hasta que Groq responda (5-30 segundos)
```

**Fix:** Usar `asyncio.to_thread` para mover la llamada bloqueante a un thread pool:
```python
import asyncio

async def generate_plan_with_ai(context: Dict) -> Dict:
    # ...
    def _call_groq():
        return client.chat.completions.create(
            model=MODEL,
            messages=[...],
            temperature=0.7,
            max_tokens=8192,
        )
    
    # Ejecuta la llamada síncrona en un thread pool, sin bloquear el event loop:
    response = await asyncio.to_thread(_call_groq)
    raw_text = response.choices[0].message.content
```

**Impacto:** FastAPI puede atender otros requests mientras espera respuesta de Groq. En escenarios con varios coders generando planes simultáneamente, la diferencia es significativa.

---

### OPT-PY-04 · Sin caché de ejercicios en memoria — siempre va a DB

**Problema:** `get_exercise()` en `supabase_service.py` consulta la DB en cada request para verificar caché. En producción con muchos coders en el mismo día del plan, la mayoría son cache hits pero igualmente generan una query.

```python
def get_exercise(self, plan_id: int, day_number: int) -> Optional[Dict]:
    try:
        r = self.client.table("exercises")
            .select("...")
            .eq("plan_id", plan_id)
            .eq("day_number", day_number)
            .single()
            .execute()
        return r.data
    except Exception:
        return None
```

**Fix:** Agregar caché en memoria con TTL corto:
```python
from functools import lru_cache
from datetime import datetime, timedelta

_exercise_cache: dict = {}
_EXERCISE_CACHE_TTL = timedelta(hours=1)

def get_exercise(self, plan_id: int, day_number: int) -> Optional[Dict]:
    cache_key = f"{plan_id}:{day_number}"
    cached = _exercise_cache.get(cache_key)
    
    if cached and datetime.now() < cached["expires"]:
        return cached["data"]
    
    try:
        r = self.client.table("exercises")...execute()
        if r.data:
            _exercise_cache[cache_key] = {
                "data": r.data,
                "expires": datetime.now() + _EXERCISE_CACHE_TTL
            }
        return r.data
    except Exception:
        return None
```

**Impacto:** Cache hits frecuentes en producción eliminan roundtrip a Supabase. Especialmente útil si varios coders abren el mismo ejercicio.

---

### OPT-PY-05 · Logging innecesariamente verbose en producción

**Problema:** `supabase_service.py` y `ia_services.py` loggean cada operación con `logger.info()`. En producción con muchos requests, esto genera I/O de log innecesario.

```python
# supabase_service.py — info en cada operación:
logger.info(f"Supabase client initialized.")
logger.info(f"Plan saved: id={plan_id} for coder {coder_id}")
logger.info(f"Deactivated previous plans for coder {coder_id}")
```

**Fix:**
```python
# Usar DEBUG para operaciones normales, INFO solo para eventos significativos:
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logging.basicConfig(level=getattr(logging, LOG_LEVEL))

logger.debug(f"Plan saved: id={plan_id} for coder {coder_id}")  # DEBUG en operaciones normales
logger.info(f"Plan generation failed for coder {coder_id}")     # INFO solo para eventos notables
logger.error(...)                                                 # ERROR para fallos reales
```

---

## 🖥 Frontend

---

### OPT-FE-01 · CSS monolítico — todas las páginas cargan todos los estilos

**Problema:** Cada página carga múltiples archivos CSS independientes. `dashboardCoder.html` carga `global.css` + `dashboardCoder.css` (700+ líneas cada uno). No hay minificación ni bundling.

```html
<!-- dashboard.html -->
<link rel="stylesheet" href="../../../assets/css/global.css" />
<link rel="stylesheet" href="../../../assets/css/dashboardCoder.css" />
<!-- 2 requests HTTP, ~50KB sin comprimir -->
```

**Fix a corto plazo** (sin build tool):
```html
<!-- Usar atributo media para cargar CSS no crítico después: -->
<link rel="stylesheet" href="global.css" />
<link rel="stylesheet" href="dashboardCoder.css" media="print" onload="this.media='all'" />
```

**Fix a largo plazo:** Introducir un bundler simple (Vite o esbuild) que concatene y minifique en build time.

**Impacto:** First Contentful Paint mejora en conexiones lentas. CSS minificado reduce tamaño ~30%.

---

### OPT-FE-02 · Font Awesome completo cargado — solo se usa ~10% de los iconos

**Problema:** Todas las páginas cargan Font Awesome 6 completo desde CDN (~1.4MB sin comprimir, ~180KB gzip):

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
```

Solo se usan ~30-40 iconos de los miles disponibles.

**Fix:** Usar Font Awesome con subset o reemplazar por SVG inline para los iconos más usados:
```html
<!-- Cargar solo las categorías necesarias: -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/solid.min.css" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/brands.min.css" />
<!-- Evitar all.min.css que incluye regular, light, thin, etc. -->
```

**Impacto:** Reduce carga de CSS de ~180KB a ~60KB gzip. Mejora tiempo de carga en ~0.3-0.8s en 3G.

---

### OPT-FE-03 · Google Fonts bloqueando render

**Problema:** Todas las páginas cargan Google Fonts de forma bloqueante:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
```

Esta es una petición externa que bloquea el primer render si Google Fonts tarda.

**Fix:**
```html
<!-- Preconectar para reducir latencia DNS -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- Cargar con display=optional para no bloquear si no carga en tiempo -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=optional" rel="stylesheet" />
<!-- Eliminar wght@300 si no se usa — reduce tamaño de la fuente descargada -->
```

**Impacto:** El texto se muestra inmediatamente con la fuente del sistema si Google Fonts no carga en tiempo. Elimina el FOIT (Flash of Invisible Text).

---

### OPT-FE-04 · `dashboardCoder.js` — múltiples fetches secuenciales en init

**Problema:** El init del dashboard coder hace fetch del dashboard completo, pero el avatar se carga después en una llamada separada:

```js
// dashboardCoder.js
const session = await guards.requireCompleted();  // fetch 1: checkAuth
// ...
loadMyAvatar().catch(...);  // fetch 2: /api/profile (separado)
await loadDashboard();      // fetch 3: /api/coder/dashboard
```

Tres roundtrips en init cuando podrían ser dos (el dashboard podría incluir el avatar URL).

**Fix a corto plazo:** Lanzar avatar y dashboard en paralelo:
```js
// En lugar de secuencial:
const session = await guards.requireCompleted();
await Promise.all([
  loadMyAvatar(),
  loadDashboard()
]);
```

**Impacto:** Reduce el tiempo de init visible del dashboard en ~300-500ms.

---

### OPT-FE-05 · `notificationsSSE.js` — reconexión exponencial sin límite máximo efectivo

**Problema:** El backoff exponencial crece hasta 60 segundos máximo, pero en Railway con un servidor caído, el cliente intentará reconectarse indefinidamente:

```js
this._retryDelay = Math.min(this._retryDelay * 2, 60000);
// Sin límite de intentos — el cliente sigue intentando para siempre
```

**Fix:**
```js
const MAX_RETRY_ATTEMPTS = 10;

if (this._retryCount >= MAX_RETRY_ATTEMPTS) {
  console.warn('[SSE] Máximo de intentos alcanzado. SSE deshabilitado.');
  return; // Dejar de intentar
}

this._retryCount = (this._retryCount || 0) + 1;
this._retryDelay = Math.min(this._retryDelay * 2, 60000);
```

**Impacto:** Evita que el cliente genere requests infinitas contra un servidor caído. Reduce carga en Railway durante deployments.

---

### OPT-FE-06 · `loadDashboard` recarga toda la data cuando llega cualquier notificación

**Problema:** El evento SSE recarga el dashboard completo cuando llega cualquier notificación de tipo `feedback` o `assignment`:

```js
// dashboardCoder.js
window.addEventListener('kairo-notification', (e) => {
  const n = e.detail;
  if (n.type === 'feedback' || n.type === 'assignment') {
    loadDashboard(); // ← recarga TODO: 7 queries paralelas a la DB
  }
});
```

Recibir un feedback hace 7 queries a la DB cuando solo se necesita actualizar la sección de notificaciones.

**Fix:**
```js
window.addEventListener('kairo-notification', (e) => {
  const n = e.detail;
  if (n.type === 'feedback') {
    // Solo actualizar la sección de feedback, no recargar todo:
    addFeedbackItemToDOM(n.data);
    renderNotificationBadge({ unread: (currentUnread + 1) });
  } else if (n.type === 'assignment') {
    // Mostrar toast informativo, el usuario puede navegar a Actividades
    showToast('Nueva actividad publicada', 'info');
  }
});
```

**Impacto:** Elimina 7 queries a DB por cada notificación recibida. Especialmente notable en aulas con TL activo enviando feedback a varios coders.

---

### OPT-FE-07 · Imágenes sin atributos de dimensión — CLS (Cumulative Layout Shift)

**Problema:** El logo en el sidebar no tiene `width` y `height` explícitos en algunos templates:

```html
<!-- sidebar — sin dimensiones explícitas en varios HTML: -->
<img src="../../../assets/img/logo.png" alt="Kairo" class="sidebar-logo" />
```

El CSS le da dimensiones pero el browser no las conoce antes de que cargue la imagen, causando layout shift.

**Fix:**
```html
<img src="../../../assets/img/logo.png" alt="Kairo" class="sidebar-logo" 
     width="120" height="120" loading="lazy" />
```

**Impacto:** Elimina layout shift visible al cargar. Mejora CLS score de Lighthouse.

---

### OPT-FE-08 · `onboarding-ui.js` — `sessionManager.getUser()` llamado en cada re-render

**Problema:** Durante el onboarding, `_renderStepper` y `_updateProgress` se llaman en cada respuesta. Cada uno accesa `localStorage` via `sessionManager.getUser()`:

```js
// onboarding-ui.js — en cada pregunta respondida:
_renderStepper(q.blockId);  // accede localStorage
_renderQuestion(q);          // accede localStorage  
_updateProgress();            // accede localStorage
```

`localStorage` es síncrono pero acceder en cada render acumula en 30 preguntas.

**Fix:** Cachear el usuario al inicio del flujo:
```js
async init() {
  this.currentUser = await getUser(); // una sola vez
  // ...
  // En los renders, usar this.currentUser directamente
}
```

---

## 🏗 Arquitectura General

---

### OPT-ARCH-01 · Fire-and-forget sin cola ni reintentos para generación de planes

**Problema:** La generación de planes IA se hace con `fetch` fire-and-forget sin ningún mecanismo de retry:

```js
// diagnosticControllers.js
fetch(`${PYTHON_API}/generate-plan`, { method: 'POST', body: ... })
  .catch((err) => console.error('[Plan Gen] Python unreachable:', err.message));
  // ↑ Si Python está caído o tarda más de lo esperado, el plan NUNCA se genera
  // El coder espera el plan y nunca llega
```

Si el microservicio Python está reiniciando (deploy en Railway), el plan se pierde silenciosamente.

**Fix a corto plazo:** Guardar el intento en la DB y reintentarlo:
```js
// Guardar estado pendiente antes del fire-and-forget:
await query(
  `INSERT INTO plan_generation_queue (coder_id, module_id, status) VALUES ($1, $2, 'pending')`,
  [userId, moduleId]
);

// Python marca como completado cuando termina
// Un cron job cada 5 min reintenta los que llevan más de 2 min en 'pending'
```

**Fix a largo plazo:** Usar una cola de trabajos (pg-boss, BullMQ con Redis) para garantizar entrega.

**Impacto:** Elimina la pérdida silenciosa de planes cuando Python está en cold start o reiniciando.

---

### OPT-ARCH-02 · Sin caché de segundo nivel — Redis/in-memory para datos estables

**Problema:** Datos que casi nunca cambian se consultan a la DB en cada request:
- Lista de módulos (`modules` table) — cambia una vez por semestre
- Info del clan de un usuario — cambia raramente
- Configuración de weeks por módulo — estática

**Fix:** Node-cache o un Map en memoria para datos semi-estáticos:
```js
// backend-node/src/config/cache.js
import NodeCache from 'node-cache';
export const appCache = new NodeCache({ stdTTL: 3600 }); // 1 hora default

// En database.js o un service:
export async function getModules() {
  const cached = appCache.get('modules');
  if (cached) return cached;
  
  const { rows } = await query('SELECT * FROM modules ORDER BY id');
  appCache.set('modules', rows);
  return rows;
}
```

**Instalar:** `npm install node-cache`  
**Impacto:** Elimina queries repetitivas a tablas estáticas. La tabla `modules` se consulta en cada generación de plan.

---

### OPT-ARCH-03 · Sin health check en el microservicio Python desde Node

**Problema:** Cuando Node hace llamadas a Python (generación de planes, ejercicios), no verifica si Python está disponible antes de hacer el request. Si Python está en cold start, el request falla con un error genérico después del timeout.

```js
// pythonApiService.js — lanza el request directamente sin verificar disponibilidad
const response = await fetch(`${PYTHON_API_URL}${endpoint}`, { ... });
// Si Python está en cold start, esto espera 30-60 segundos y luego falla
```

**Fix:** Circuit breaker simple:
```js
// backend-node/src/services/pythonApiService.js
let pythonHealthy = null;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30_000; // 30 segundos

async function isPythonAvailable() {
  const now = Date.now();
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) return pythonHealthy;
  
  try {
    const r = await fetch(`${PYTHON_API_URL}/health`, { signal: AbortSignal.timeout(3000) });
    pythonHealthy = r.ok;
  } catch {
    pythonHealthy = false;
  }
  lastHealthCheck = now;
  return pythonHealthy;
}
```

**Impacto:** Falla rápido (3 segundos) en lugar de esperar el timeout completo (30-60 segundos) cuando Python está caído.

---

### OPT-ARCH-04 · SSE connections sin límite por usuario

**Problema:** `notificationService.js` permite múltiples conexiones SSE del mismo usuario sin límite:

```js
export function addClient(userId, res) {
  if (!clients.has(userId)) clients.set(userId, []);
  clients.get(userId).push({ res, heartbeatInterval }); // ← push ilimitado
}
```

Si un usuario tiene múltiples tabs abiertas, genera múltiples conexiones persistentes al servidor, cada una con su heartbeat de 25 segundos.

**Fix:**
```js
const MAX_CONNECTIONS_PER_USER = 3;

export function addClient(userId, res) {
  if (!clients.has(userId)) clients.set(userId, []);
  const userClients = clients.get(userId);
  
  // Si el usuario ya tiene demasiadas conexiones, cerrar la más antigua:
  if (userClients.length >= MAX_CONNECTIONS_PER_USER) {
    const oldest = userClients.shift();
    clearInterval(oldest.heartbeatInterval);
    try { oldest.res.end(); } catch {}
  }
  
  userClients.push({ res, heartbeatInterval });
}
```

**Impacto:** Evita que una sola sesión acumule decenas de conexiones SSE en Railway.

---

### OPT-ARCH-05 · Sin paginación en ningún endpoint de lista

**Problema:** Todos los endpoints que retornan listas no tienen paginación:

```js
// tlControllers.js — retorna TODOS los coders del clan sin límite:
const codersResult = await query(`SELECT ... FROM users WHERE u.clan = $1 ...`, [clanId]);

// assignmentControllers.js — retorna TODAS las notificaciones:
const result = await query(`SELECT * FROM notifications WHERE user_id = $1 ORDER BY ... LIMIT 30`, [id]);
// ↑ Este sí tiene LIMIT pero no OFFSET para paginar
```

**Fix:** Agregar paginación estándar con cursor o LIMIT/OFFSET:
```js
// Patrón para endpoints de lista:
const { page = 1, limit = 20 } = req.query;
const offset = (parseInt(page) - 1) * parseInt(limit);

const result = await query(
  `SELECT ... LIMIT $1 OFFSET $2`,
  [parseInt(limit), offset]
);

res.json({
  data: result.rows,
  pagination: {
    page: parseInt(page),
    limit: parseInt(limit),
    total: totalCount, // query COUNT separada o usar window function
  }
});
```

**Impacto:** Previene problemas de performance cuando un clan tiene 100+ coders o hay 500+ notificaciones.

---

## 🔐 Seguridad

---

### OPT-SEC-01 · `SESSION_SECRET` con fallback inseguro en desarrollo

**Problema:**
```js
// server.js
secret: process.env.SESSION_SECRET || 'dev_secret_fallback',
```

Si `SESSION_SECRET` no está configurado en producción (por olvido), las sesiones se firman con `'dev_secret_fallback'` que cualquiera puede conocer leyendo el código.

**Fix:**
```js
if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: SESSION_SECRET no configurado en producción');
    process.exit(1); // ← fallar en startup, no silenciosamente
  }
  console.warn('⚠️  SESSION_SECRET no configurado — usando fallback inseguro (solo dev)');
}
secret: process.env.SESSION_SECRET || 'dev_secret_fallback_inseguro_no_usar_en_prod',
```

---

### OPT-SEC-02 · Sin validación de tamaño en body JSON

**Problema:**
```js
// server.js
app.use(express.json({ limit: '5mb' }));
```

5MB es un límite muy alto para requests JSON normales (el máximo esperado es ~50KB). Permite ataques de body flooding que consumen memoria del proceso.

**Fix:**
```js
app.use(express.json({ limit: '100kb' })); // suficiente para cualquier request real
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
// Los uploads de PDF usan multer con su propio límite de 20MB — ok
```

---

### OPT-SEC-03 · Contraseñas OAuth guardadas en texto parcialmente legible

**Problema:**
```js
// user.js — createOAuth:
const placeholderPassword = `oauth_${provider}_${providerId}_${Date.now()}`;
// ↑ El providerId de GitHub/Google queda en texto plano en la columna password
```

Si la DB se compromete, los IDs de OAuth de todos los usuarios quedan expuestos.

**Fix:**
```js
const placeholderPassword = `oauth_${await bcrypt.hash(providerId, 4)}_${Date.now()}`;
// Hash rápido (cost 4) — solo para hacer el ID irreversible, no para seguridad real
// O simplemente usar un UUID:
import { randomUUID } from 'crypto';
const placeholderPassword = `oauth_${randomUUID()}`;
```

---

### OPT-SEC-04 · Sin `SameSite=Strict` en cookie de sesión en producción

**Problema:**
```js
// server.js
cookie: {
  secure: isProduction,
  httpOnly: true,
  maxAge: 24 * 60 * 60 * 1000,
  sameSite: isProduction ? 'none' : 'lax', // ← 'none' en producción
},
```

`SameSite: 'none'` es necesario si el frontend está en un dominio diferente al backend (GitHub Pages + Railway). Sin embargo, `'none'` requiere `Secure: true` y aumenta el riesgo de CSRF si no hay validación adicional.

**Fix:** Verificar que el header `Origin` coincida con los dominios permitidos en los endpoints críticos (ya lo hace CORS parcialmente, pero agregar validación explícita en mutaciones):
```js
// Middleware adicional para endpoints de mutación:
function validateOrigin(req, res, next) {
  const origin = req.headers.origin;
  if (req.method !== 'GET' && origin && !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: 'Origin no permitido' });
  }
  next();
}
```

---

## 🛠 Mantenibilidad y DX

---

### OPT-DX-01 · Sin variables de entorno validadas al startup

**Problema:** Las variables de entorno críticas se validan individualmente en cada módulo con `|| valor_por_defecto`. Si falta una variable, el error aparece cuando se llama ese módulo específico, no al arrancar.

```js
// Errores aparecen tarde y en lugares inesperados:
// database.js — falla en primera query
// supabase.js — falla al crear cliente
// passport.js — falla al autenticar
```

**Fix:** Validar todas las variables críticas en el startup:
```js
// backend-node/src/config/env.js (nuevo)
const REQUIRED_ENV = [
  'SESSION_SECRET',
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'RESEND_API_KEY',
];

export function validateEnv() {
  const missing = REQUIRED_ENV.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`\n❌ Variables de entorno faltantes:\n  ${missing.join('\n  ')}`);
    process.exit(1);
  }
  console.log('✅ Variables de entorno validadas');
}

// En server.js — primera línea del startup:
import { validateEnv } from './config/env.js';
validateEnv();
```

**Impacto:** Errores de configuración aparecen en el startup con mensaje claro. Elimina debugging confuso de variables faltantes.

---

### OPT-DX-02 · Sin tipado en el backend Node — JSDoc mínimo

**Problema:** Todo el backend Node es JavaScript sin tipos. Funciones como `notifyUser`, `getUserClan`, `buildConnectionString` no tienen documentación de parámetros. En un equipo de 5 personas esto genera errores silenciosos.

**Fix a corto plazo:** Agregar JSDoc en funciones de servicios compartidos:
```js
/**
 * Envía una notificación en tiempo real a un usuario y la persiste en DB.
 * @param {number} userId - ID del usuario destino
 * @param {string} title - Título de la notificación (max 100 chars)
 * @param {string} message - Cuerpo del mensaje
 * @param {'feedback'|'assignment'|'feedback_read'|'system'} type
 * @param {number|null} relatedId - ID del recurso relacionado (opcional)
 * @returns {Promise<Object>} La notificación guardada
 */
export async function notifyUser(userId, title, message, type = 'system', relatedId = null) {
```

**Fix a largo plazo:** Migrar a TypeScript o agregar `// @ts-check` + JSDoc completo.

---

### OPT-DX-03 · `server.js` mezcla configuración, middleware y startup

**Problema:** `server.js` tiene 180 líneas que hacen todo: configurar CORS, crear rate limiters, configurar sesión, montar rutas, manejar errores, y arrancar el servidor. Dificulta el testing unitario.

**Fix:** Separar en módulos:
```
backend-node/src/
├── config/
│   ├── cors.js       ← configuración CORS
│   ├── session.js    ← configuración de sesión
│   └── env.js        ← validación de entorno
├── middleware/
│   └── rateLimiter.js ← rate limiters
├── app.js            ← Express app (sin listen)
└── server.js         ← solo: import app; app.listen(PORT)
```

Separar `app.js` de `server.js` permite importar `app` en tests sin arrancar el servidor.

---

### OPT-DX-04 · Mensajes de error inconsistentes entre endpoints

**Problema:** Algunos endpoints retornan `{ error: 'mensaje' }`, otros `{ message: 'mensaje' }`, otros `{ error: true, message: '...' }`:

```js
// authControllers.js:
return res.status(401).json({ error: 'Unauthorized' });      // ← "error"

// server.js (error handler):
res.status(status).json({ error: true, message: err.message }); // ← "error" + "message"

// diagnosticControllers.js:
return res.status(400).json({ error: 'answers array is required', expected: '...' }); // ← "error" + "expected"
```

El frontend tiene que manejar múltiples formatos:
```js
const errorMsg = data.error || data.message || data.detail || 'Error desconocido';
```

**Fix:** Estandarizar un formato de respuesta de error:
```js
// backend-node/src/utils/response.js
export const errorResponse = (res, status, message, details = null) => {
  const body = { success: false, error: message };
  if (details) body.details = details;
  return res.status(status).json(body);
};

export const successResponse = (res, data, status = 200) => {
  return res.status(status).json({ success: true, ...data });
};
```

---

### OPT-DX-05 · Sin `.env.example` actualizado con todas las variables nuevas

**Problema:** El `.env.example` del `backend-node` no incluye variables que sí se usan en el código:
- `MONGODB_URI` / `MONGO_URI` (usado en `mongodb.js`)
- `RESEND_API_KEY` (usado en `email.service.js` — el README menciona `SMTP_*` pero el código usa Resend)
- `DATABASE_DIRECT_URL` (usado en `server.js` para el session store)
- `SUPABASE_SERVICE_KEY` (el README muestra `SUPABASE_ANON_KEY` pero el código usa `SERVICE_KEY`)

**Fix:** Auditar todas las variables usadas en el código y actualizar `.env.example`:
```bash
# Buscar todas las variables de entorno usadas:
grep -r "process.env\." backend-node/src --include="*.js" | \
  grep -oP '(?<=process\.env\.)[A-Z_]+' | sort -u
```

---

### OPT-DX-06 · Comentarios en español e inglés mezclados sin criterio

**Problema:** El código mezcla idiomas en comentarios sin patrón claro:

```js
// Spanish:
// Invalida códigos anteriores
// Usuarios OAuth no tienen password hasheable

// English:
// Get a dedicated client from the pool to run the transaction  
// Non-blocking
// FIX: explicit CASE ORDER BY instead of text comparison
```

En un proyecto de equipo colombiano con documentación en español, esto fragmenta la legibilidad.

**Fix:** Establecer en el README de contribución: "Comentarios en español, código en inglés (variables, funciones, clases)". No es urgente pero mejora consistencia del equipo.

---

## Tabla de Impacto vs Esfuerzo

| ID | Optimización | Impacto | Esfuerzo | Prioridad |
|----|---|---|---|---|
| OPT-DB-01 | Índices compuestos | 🔴 Alto | 🟢 Bajo (30 min) | ⭐⭐⭐⭐⭐ |
| OPT-NODE-01 | Compresión gzip | 🔴 Alto | 🟢 Bajo (15 min) | ⭐⭐⭐⭐⭐ |
| OPT-NODE-08 | Centralizar PYTHON_API_URL | 🟡 Medio | 🟢 Bajo (20 min) | ⭐⭐⭐⭐⭐ |
| OPT-PY-01 | Singleton clientes Groq/Supabase | 🔴 Alto | 🟢 Bajo (30 min) | ⭐⭐⭐⭐⭐ |
| OPT-PY-03 | Groq async con asyncio.to_thread | 🔴 Alto | 🟢 Bajo (20 min) | ⭐⭐⭐⭐⭐ |
| OPT-DX-01 | Validación de env al startup | 🟡 Medio | 🟢 Bajo (30 min) | ⭐⭐⭐⭐ |
| OPT-NODE-04 | getUserClan — una query en lugar de tres | 🟡 Medio | 🟢 Bajo (20 min) | ⭐⭐⭐⭐ |
| OPT-NODE-06 | completeDay — UPDATE atómico | 🟠 Alto | 🟡 Medio (1h) | ⭐⭐⭐⭐ |
| OPT-FE-02 | Font Awesome subset | 🔴 Alto (load time) | 🟢 Bajo (10 min) | ⭐⭐⭐⭐ |
| OPT-FE-06 | SSE — no recargar dashboard completo | 🟡 Medio | 🟡 Medio (2h) | ⭐⭐⭐⭐ |
| OPT-DB-03 | Vista materializada | 🟡 Medio | 🟠 Alto (3h) | ⭐⭐⭐ |
| OPT-ARCH-01 | Cola para generación de planes | 🔴 Alto | 🔴 Alto (1 día) | ⭐⭐⭐ |
| OPT-ARCH-02 | Caché en memoria para datos estables | 🟡 Medio | 🟡 Medio (2h) | ⭐⭐⭐ |
| OPT-ARCH-03 | Circuit breaker Python | 🟡 Medio | 🟡 Medio (1h) | ⭐⭐⭐ |
| OPT-NODE-02 | Helmet security headers | 🟡 Medio | 🟢 Bajo (15 min) | ⭐⭐⭐ |
| OPT-SEC-01 | SESSION_SECRET sin fallback silencioso | 🟡 Medio | 🟢 Bajo (10 min) | ⭐⭐⭐ |
| OPT-DB-04 | completed_days → tabla separada | 🟡 Medio | 🟠 Alto (2h + migración) | ⭐⭐ |
| OPT-FE-04 | Dashboard init paralelo | 🟢 Bajo | 🟢 Bajo (5 min) | ⭐⭐ |
| OPT-ARCH-05 | Paginación en endpoints de lista | 🟡 Medio | 🟠 Alto (4h) | ⭐⭐ |
| OPT-DX-03 | Separar app.js de server.js | 🟢 Bajo | 🟡 Medio (2h) | ⭐ |

---

*Documento generado por auditoría técnica independiente — Kairo Project · Clan Turing · Marzo 2026*
