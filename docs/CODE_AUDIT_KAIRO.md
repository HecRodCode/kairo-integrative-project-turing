# 🔍 Auditoría de Código — Kairo Platform
**Fecha:** 14 de marzo de 2026  
**Auditores:** Equipo QA (3 IAs independientes + revisión cruzada)  
**Rama analizada:** `main` (primer auth — aplica a todas las ramas)  
**Alcance:** `backend-node`, `backend-python`, `frontend`, `database`

---

## Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Críticos — Rompen funcionalidad en producción](#-críticos--rompen-funcionalidad-en-producción)
3. [Altos — Bugs latentes con impacto real](#-altos--bugs-latentes-con-impacto-real)
4. [Medios — Deuda técnica y código muerto con ruta](#-medios--deuda-técnica-y-código-muerto-con-ruta)
5. [Bajos — Código muerto sin impacto funcional](#-bajos--código-muerto-sin-impacto-funcional)
6. [Falsos positivos descartados](#-falsos-positivos-descartados)
7. [Plan de acción sugerido](#-plan-de-acción-sugerido)

---

## Resumen Ejecutivo

| Severidad | Cantidad | Estado |
|-----------|----------|--------|
| 🔴 Crítico | 8 | Rompen funcionalidad visible ahora mismo |
| 🟠 Alto | 5 | Bugs latentes que fallan bajo condiciones específicas |
| 🟡 Medio | 6 | Código muerto con consecuencias / deuda técnica real |
| 🟢 Bajo | 7 | Código muerto sin impacto funcional |
| ✅ Descartados | 3 | Falsos positivos de reportes anteriores |

### Estado de ejecución (actualizado en esta rama)

| ID | Estado | Nota de verificación en esta versión |
|---|---|---|
| C-01 | ✅ Corregido | `API` reemplazado por `API_BASE` en descargas de `assignmentCoder.js`. |
| C-02 | ✅ Corregido | `_API` reemplazado por `API_BASE` y ruta de import corregida en `tech.js`. |
| C-03 | ✅ Corregido | `coderControllers.js` ajustado para evitar columnas/tablas opcionales y `completed_days` movido a `plan_content`. |
| C-04 | ✅ Corregido | `agent_type` normalizado a ENUM válido (`learning_plan/report_generator/risk_detector`). |
| C-05 | ✅ Corregido | `get_module()` ya no selecciona `is_critical` ni `has_performance_test`. |
| C-06 | ✅ Corregido | Se eliminaron endpoints duplicados de notificaciones en `assignmentRoutes/assignmentControllers`. |
| C-07 | ✅ Corregido | Quedó resuelto junto con C-01 (uso consistente de `API_BASE`). |
| C-08 | ✅ Corregido | Eliminado fallback hardcodeado de Supabase URL; ahora exige variables de entorno. |
| A-01 | ✅ Corregido | `exerciseRoutes.js` ahora está montado en `server.js` (`/api/exercise`). |
| A-02 | ✅ Corregido | Bucles secuenciales de notificaciones cambiados a `Promise.all` en `resourceControllers` y `assignmentControllers`. |
| A-03 | ℹ️ Desactualizado | En el código actual ya estaba `ON CONFLICT (coder_id, module_id)` en `moodleProgress.js`. |
| A-04 | ✅ Corregido | `authLimiter` y `otpLimiter` aplicados en rutas `/api/auth`. |
| A-05 | ✅ Corregido | `reports.js` dejó URL hardcodeada y usa `API_BASE`. |
| M-01 | ✅ Corregido | `basicRoutes.js` eliminado (archivo muerto). |
| M-02 | ✅ Corregido | `onboarding-logic.js` eliminado (archivo vacío). |
| M-03 | ✅ Corregido | Se añadieron rutas para los 4 controllers exportados de `tlControllers.js`. |
| M-04 | ✅ Corregido | Eliminada duplicación de notificaciones entre controllers. |
| M-05 | ✅ Corregido | Clientes compartidos en `app/services/clients.py`; routers `cards/reports` reutilizan clientes y parser JSON común. |
| M-06 | ✅ Corregido | `backend-node/utils.js` ya no tiene contraseña hardcodeada; recibe argumento/env. |
| B-01 | ✅ Corregido | `PYTHON_API` sin uso eliminado de `resourceControllers.js`. |
| B-02 | ✅ Corregido | `callPythonApiGet` eliminada de `pythonApiService.js` por no tener llamadas activas. |
| B-03 | ✅ Corregido | Eliminado comentario residual de `resources.router` en `backend-python/main.py`. |
| B-04 | ✅ Corregido | `toCamelCase` y `truncateText` removidas de `helpers.js` (código muerto confirmado). |
| B-05 | ✅ Corregido | Validadores integrados en `authControllers.js` para validación server-side real. |
| B-06 | ✅ Corregido | `testEmailConnection` y `cleanupExpiredOtps` integradas al bootstrap de `server.js` (health + limpieza horaria). |
| B-07 | ✅ Corregido | `cards.py` y `reports.py` usan `_extract_json()` de `ia_services.py`. |

> Nota: “Pendiente” se marca cuando el hallazgo existe pero su solución requiere decisión de producto/operación (eliminar utilidades, agendar cron, etc.) y no era seguro eliminarlo automáticamente sin validar uso externo.

---

## 🔴 CRÍTICOS — Rompen funcionalidad en producción

---

### C-01 · `assignmentCoder.js` — ReferenceError: `API` is not defined
**Archivo:** `frontend/assets/js/assignmentCoder.js`  
**Líneas:** funciones `downloadAssignment` y `downloadResource`  
**Origen:** Auditor 3 (nuevo)

```js
// El archivo importa API_BASE correctamente:
import { API_BASE } from '../../src/core/config.js';

// Pero las funciones de descarga usan "API" (variable inexistente):
const res = await fetch(`${API}/coder/assignment/${id}/download`, ...); // ❌ API is not defined
const res = await fetch(`${API}/coder/resource/${id}/download`, ...);   // ❌ API is not defined
```

**Impacto:** Los botones "Descargar PDF" y "Descargar Recurso" lanzan `ReferenceError` en runtime. El coder no puede descargar nada.  
**Fix:** Reemplazar `API` por `API_BASE` en ambas funciones.

---

### C-02 · `tech.js` — ReferenceError: `_API` is not defined
**Archivo:** `frontend/assets/js/tech.js`  
**Líneas:** todas las funciones del archivo  
**Origen:** Auditor 3 (nuevo)

```js
// _API nunca se define ni se importa en el archivo
const res = await fetch(`${_API}/tl/resource/upload`, ...);    // ❌ _API is not defined
const res = await fetch(`${_API}/tl/resource/list?...`, ...);  // ❌ _API is not defined
const res = await fetch(`${_API}/tl/resource/${id}`, ...);     // ❌ _API is not defined
```

**Impacto:** Toda la funcionalidad de `tech.js` falla. El TL no puede subir, listar ni eliminar recursos desde esta pantalla.  
**Fix:** Agregar `import { API_BASE } from '../src/core/config.js';` y reemplazar `_API` por `API_BASE`.

---

### C-03 · `coderControllers.js` — Queries a columnas y tablas inexistentes en schema.sql
**Archivo:** `backend-node/src/controllers/coderControllers.js`  
**Función:** `getCoderDashboard`  
**Origen:** Auditor 3 (nuevo)

```sql
-- Columnas que NO existen en la tabla users:
u.current_module_id       -- ❌ no está en schema.sql
u.learning_style_cache    -- ❌ no está en schema.sql

-- Columna que NO existe en modules:
m.is_critical             -- ❌ no está en schema.sql

-- Tabla que NO existe en schema.sql:
FROM performance_tests pt  -- ❌ tabla inexistente
JOIN modules m ON m.id = pt.module_id
WHERE pt.coder_id = $1

-- Columna que NO existe en complementary_plans (función getActivePlan):
COALESCE(completed_days, '{}'::jsonb) AS completed_days  -- ❌ no existe
```

**Impacto:** `GET /api/coder/dashboard` y `GET /api/coder/plan` lanzan errores SQL en producción. El dashboard del coder no carga.  
**Fix:** Agregar las columnas faltantes al schema mediante migración, o simplificar las queries a lo que existe.

---

### C-04 · `supabase_service.py` — Viola el ENUM `ai_agent_enum` de la DB
**Archivo:** `backend-python/app/services/supabase_service.py`  
**Función:** `log_generation`  
**Origen:** Auditor 3 (nuevo)

```python
# El servicio inserta estos valores:
"agent_type": "plan_generator"       # ❌ NO existe en el ENUM
"agent_type": "exercise_generator"   # ❌ NO existe en el ENUM

# El ENUM de la DB solo acepta:
CREATE TYPE ai_agent_enum AS ENUM ('learning_plan', 'report_generator', 'risk_detector');
```

**Impacto:** Cada generación de plan o ejercicio lanza `invalid input value for enum ai_agent_enum` en PostgreSQL. El log de IA falla con excepción; dependiendo del manejo de errores, puede cancelar la transacción entera.  
**Fix:** Cambiar los valores insertados a `'learning_plan'` o ampliar el ENUM con una migración.

---

### C-05 · `supabase_service.py` — Lee columnas inexistentes de `modules`
**Archivo:** `backend-python/app/services/supabase_service.py`  
**Función:** `get_module`  
**Origen:** Auditor 3 (nuevo)

```python
r = self.client.table("modules")
    .select("id, name, description, total_weeks, is_critical, has_performance_test")
#                                                 ^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^
# Estas dos columnas NO existen en schema.sql
```

**Impacto:** `POST /generate-plan` falla al intentar leer el módulo. La generación de planes IA no funciona en producción.  
**Fix:** Eliminar `is_critical` y `has_performance_test` del select, o agregar las columnas al schema con migración.

---

### C-06 · Conflicto de rutas duplicadas en `server.js`
**Archivo:** `backend-node/src/server.js`  
**Origen:** Auditor 3 (nuevo)

```js
// Dos registros distintos sirven /api/notifications:
app.use('/api/notifications', notificationRoutes); // → notificationControllers.js
app.use('/api', assignmentRoutes);                 // → también tiene /notifications → assignmentControllers.js
```

**Impacto:** Express sirve siempre el primer match. La segunda definición queda en sombra. El comportamiento cambia si el orden de montaje se invierte. Bug silencioso que nadie nota hasta un refactor.  
**Fix:** Eliminar las funciones duplicadas de `assignmentControllers.js` y usar solo `notificationControllers.js`.

---

### C-07 · `assignmentCoder.js` y `assignmentTL.js` — `API_BASE` importado pero no usado globalmente
**Archivo:** `frontend/assets/js/assignmentCoder.js`  
**Origen:** Auditor 3 (nuevo, relacionado con C-01)

La variable `API_BASE` se importa correctamente al inicio del archivo, pero las funciones críticas (`downloadAssignment`, `downloadResource`) ignoran esa importación y usan `API` o `API_BASE` de forma inconsistente en distintas partes del archivo. Genera confusión de mantenimiento además del error crítico de C-01.

---

### C-08 · URL real de Supabase hardcodeada en el repositorio
**Archivo:** `backend-node/src/config/supabase.js`  
**Origen:** Auditor 3 (nuevo)

```js
const supabaseUrl = process.env.SUPABASE_URL || 'https://ecmruftbjyroyzacujnb.supabase.co';
//                                               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                                               URL real del proyecto en producción
```

**Impacto:** La URL real de Supabase queda expuesta en el repositorio público/privado. Cualquiera con acceso al repo puede intentar ataques directos a la DB.  
**Fix:** Eliminar el fallback hardcodeado. Si no hay `SUPABASE_URL`, lanzar error explícito en startup.

---

## 🟠 ALTOS — Bugs latentes con impacto real

---

### A-01 · `exerciseRoutes.js` — Archivo de rutas completo sin montar en `server.js`
**Archivo:** `backend-node/src/routes/exerciseRoutes.js`  
**Origen:** Auditor 3 (nuevo)

```js
// server.js no contiene ninguna de estas líneas:
import exerciseRoutes from './routes/exerciseRoutes.js';  // ← no existe
app.use('/api/exercise', exerciseRoutes);                 // ← no existe
```

El archivo tiene middleware completo (`isAuthenticated`, `hasRole`, `checkOnboarding`) y 3 rutas definidas. Los ejercicios solo funcionan porque `coderRoutes.js` los duplica internamente. Si algún día se limpia `coderRoutes.js`, los ejercicios desaparecen silenciosamente.  
**Fix:** Montar en `server.js` o eliminar el archivo y documentar que las rutas viven en `coderRoutes.js`.

---

### A-02 · N+1 queries — `await` secuencial en loop para notificaciones
**Archivos:** `backend-node/src/controllers/resourceControllers.js` y `assignmentControllers.js`  
**Origen:** Auditores 1 y 2 (confirmado)

```js
// resourceControllers.js — uploadResource:
for (const coder of coderResult.rows) {
  await notifyUser(coder.id, ...); // ❌ query a DB por cada coder, secuencial
}

// assignmentControllers.js — createAssignment:
for (const coder of coderResult.rows) {
  await notifyUser(coder.id, ...); // ❌ mismo patrón
}
```

**Impacto:** Si hay 30 coders en un clan, se hacen 30 inserts secuenciales en lugar de 1. En clanes grandes (>20 coders) el endpoint se vuelve lento perceptiblemente.  
**Fix:** `await Promise.all(coderResult.rows.map(coder => notifyUser(coder.id, ...)))` o una función de bulk insert en `notificationService.js`.

---

### A-03 · `moodleProgress.js` — `ON CONFLICT` incorrecto
**Archivo:** `backend-node/src/models/moodleProgress.js`  
**Origen:** Auditor 3 (nuevo)

```js
// El modelo usa:
ON CONFLICT (coder_id) DO UPDATE SET ...

// Pero la tabla tiene:
UNIQUE (coder_id, module_id)  // ← el constraint es COMPUESTO
```

**Impacto:** Si un coder tiene progreso en más de un módulo, el segundo INSERT no matchea el constraint real y falla. Bug latente que explota cuando un coder avanza de módulo.  
**Fix:** Cambiar a `ON CONFLICT (coder_id, module_id) DO UPDATE SET ...`

---

### A-04 · `authLimiter` y `otpLimiter` declarados pero nunca aplicados
**Archivo:** `backend-node/src/server.js`  
**Origen:** Auditores 1 y 2 (confirmado)

```js
// Se crean los limiters:
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, ... });
const otpLimiter  = rateLimit({ windowMs: 10 * 60 * 1000, max: 5,  ... });

// Nunca se aplican a ninguna ruta:
app.use('/api/auth', authRoutes);   // ← sin authLimiter
// No hay uso de otpLimiter en ningún lugar
```

**Impacto:** Los endpoints de login y OTP son vulnerables a fuerza bruta. Se declara protección que no existe.  
**Fix:** Aplicar `authLimiter` en `/api/auth` y `otpLimiter` en la ruta de verificación OTP.

---

### A-05 · `reports.js` (frontend) — URL hardcodeada diferente a `config.js`
**Archivo:** `frontend/src/core/auth/reports.js`  
**Origen:** Auditor 3 (nuevo)

```js
// reports.js usa una URL diferente:
const PYTHON_API_URL = 'https://kairo-integrative-project-turing-production-b3f6.up.railway.app';

// config.js define:
const PROD_URL = 'https://kairo-integrative-project-turing-production.up.railway.app';
//                                                                    ^^^^^^
//                                                   Diferente — falta el '-b3f6' o sobra
```

**Impacto:** Los reportes PDF apuntan a una URL potencialmente incorrecta. Si cambia el dominio de Railway solo se actualiza `config.js` y `reports.js` queda desincronizado silenciosamente.  
**Fix:** Importar `API_BASE` de `config.js` en lugar de hardcodear.

---

## 🟡 MEDIOS — Deuda técnica y código muerto con ruta

---

### M-01 · `basicRoutes.js` — 314 líneas de mock nunca montadas
**Archivo:** `backend-node/src/routes/basicRoutes.js`  
**Origen:** Auditores 1 y 2 (confirmado)

El archivo existe, tiene contenido completo (mock de auth, dashboard, plan, diagnóstico, feedback), pero **no aparece importado ni montado en `server.js`**. Era para modo básico/desarrollo pero nunca se integró al servidor real.  
**Fix:** Eliminar el archivo o documentarlo explícitamente como "modo dev" con instrucciones de activación.

---

### M-02 · `onboarding-logic.js` — Archivo vacío (0 bytes)
**Archivo:** `backend-node/src/utils/onboarding-logic.js`  
**Origen:** Auditores 1 y 2 (confirmado)

Archivo creado pero nunca implementado. Probablemente fue el plan original para extraer la lógica de onboarding del controller.  
**Fix:** Eliminar el archivo o implementar el contenido previsto.

---

### M-03 · 4 funciones de `tlControllers.js` sin ruta asignada
**Archivo:** `backend-node/src/controllers/tlControllers.js`  
**Origen:** Auditores 1 y 2 (confirmado)

```js
// Exportadas pero sin ruta en tlRoutes.js:
export async function getAllCodersByClan(req, res)  // ← sin ruta
export async function getClanMetrics(req, res)       // ← sin ruta
export async function getCoderFullDetail(req, res)   // ← sin ruta
export async function getRiskReports(req, res)       // ← sin ruta
```

Son 4 controllers completos con queries SQL. Probablemente preceden al diseño actual de `getDashboardData` que los consolidó.  
**Fix:** Verificar si alguno se necesita, conectarlo a una ruta, o eliminar.

---

### M-04 · `getNotifications` y `markNotificationsRead` duplicados entre controllers
**Archivos:** `notificationControllers.js` y `assignmentControllers.js`  
**Origen:** Auditores 1 y 2 (confirmado)

Exactamente las mismas funciones con el mismo nombre exportadas desde dos controllers distintos. Combinado con el conflicto de rutas de C-06, genera comportamiento impredecible.  
**Fix:** Eliminar las duplicadas de `assignmentControllers.js`. Toda la lógica de notificaciones debe vivir solo en `notificationControllers.js`.

---

### M-05 · `_get_clients()` duplicado en Python
**Archivos:** `backend-python/app/routers/cards.py` y `reports.py`  
**Origen:** Auditores 1 y 2 (confirmado)

```python
# Misma función copiada en dos archivos:
def _get_clients():
    return (
        Groq(api_key=os.getenv("GROQ_API_KEY")),
        create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
    )
```

Además de la duplicación, se crea un cliente nuevo por cada request en lugar de reutilizar uno al inicio del proceso.  
**Fix:** Mover a un módulo compartido (`app/services/clients.py`) con inicialización singleton.

---

### M-06 · `utils.js` — Script de dev con contraseña hardcodeada en el repo
**Archivo:** `backend-node/utils.js`  
**Origen:** Auditor 3 (nuevo)

```js
const passwordPlana = '123'; // ← hardcodeado en el repositorio
```

Script para generar hashes bcrypt de contraseñas TL. Está en la raíz del backend y no figura en `.gitignore`.  
**Fix:** Agregar a `.gitignore` o eliminar. Si se necesita, convertirlo en un script que lea la contraseña de un argumento de línea de comandos: `node utils.js miPassword`.

---

## 🟢 BAJOS — Código muerto sin impacto funcional

---

### B-01 · `PYTHON_API` constante sin uso en `resourceControllers.js`
**Archivo:** `backend-node/src/controllers/resourceControllers.js`  
**Origen:** Auditores 1 y 2 (confirmado)

```js
const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';
// Declarada pero nunca usada en este archivo (la búsqueda semántica fue desactivada)
```

---

### B-02 · `callPythonApiGet` exportada, nunca llamada
**Archivo:** `backend-node/src/services/pythonApiService.js`  
**Origen:** Auditor 2 (confirmado)

Función para hacer GET al microservicio Python. Fue creada para el endpoint de PDF por clan (`/generate-pdf/:clan`) pero nunca se importó en ningún controller.

---

### B-03 · Comentario residual `resources.router` en `main.py`
**Archivo:** `backend-python/main.py`  
**Origen:** Auditores 1 y 2 (confirmado)

```python
# app.include_router(resources.router)  # REMOVED: Handled by Node.js now
```

El comentario explica por qué fue removido, pero el import de `resources` en `app/routers/__init__.py` ya no existe. Limpiar.

---

### B-04 · `toCamelCase` y `truncateText` sin uso
**Archivo:** `backend-node/src/utils/helpers.js`  
**Origen:** Auditor 2 (confirmado)

```js
export const toCamelCase = (obj) => { ... }   // ← nunca importada
export const truncateText = (text, max) => { } // ← nunca importada
```

`calculatePercentage` y `formatDate` sí se usan en `tlControllers.js`.

---

### B-05 · Validadores sin uso en `validators.js`
**Archivo:** `backend-node/src/utils/validators.js`  
**Origen:** Auditor 2 (confirmado)

```js
export function validateEmail(email)     // ← sin uso (la validación se hace en auth-ui.js del frontend)
export function validatePassword(pass)   // ← sin uso
export function validateRole(role)       // ← sin uso
export function validateFullName(name)   // ← sin uso
// sanitizeInput sí se usa en tlControllers.js
```

---

### B-06 · `cleanupExpiredOtps` y `testEmailConnection` sin llamar
**Archivo:** `backend-node/src/services/email.service.js`  
**Origen:** Auditor 2 (confirmado)

```js
export async function cleanupExpiredOtps() { ... }   // ← nunca llamada
export async function testEmailConnection() { ... }  // ← nunca llamada
```

`cleanupExpiredOtps` debería correrse periódicamente (cron) para limpiar la tabla `otp_verifications`.

---

### B-07 · Parseo repetitivo de markdown fences en Python
**Archivos:** `backend-python/app/routers/cards.py` y `reports.py`  
**Origen:** Auditores 1 y 2 (confirmado)

```python
# Mismo bloque copy-paste en ambos archivos:
if raw.startswith("```"):
    raw = raw.split("```")[1]
    if raw.startswith("json"):
        raw = raw[4:]
```

Ya existe `_extract_json()` en `ia_services.py` que hace esto mejor. No se usa donde debería.  
**Fix:** Reemplazar ese bloque por `_extract_json(raw)` importado desde `ia_services.py`.

---

## ✅ FALSOS POSITIVOS DESCARTADOS

Estos hallazgos fueron reportados por otras IAs pero son **incorrectos**:

| # | Hallazgo reportado | Por qué es falso |
|---|---|---|
| F-01 | "No hay índices en schema.sql" | `schema.sql` tiene 15+ índices: `idx_users_email`, `idx_users_role`, `idx_soft_skills_coder`, `idx_moodle_coder`, etc. |
| F-02 | "getUserClan duplicada en múltiples controllers" | La función solo existe en `resourceControllers.js`. Los demás controllers llaman a esa misma función. |
| F-03 | "Imports sin uso en tlRoutes.js" | `getDashboardData` y `submitFeedback` están importados Y montados correctamente en sus rutas. |

---

## 📋 PLAN DE ACCIÓN SUGERIDO

### Sprint inmediato (antes del próximo demo):

| Prioridad | ID | Acción | Tiempo estimado |
|-----------|-----|--------|-----------------|
| 1 | C-01 | Cambiar `API` → `API_BASE` en `assignmentCoder.js` | 5 min |
| 2 | C-02 | Agregar import y cambiar `_API` → `API_BASE` en `tech.js` | 5 min |
| 3 | C-03 | Migración: agregar columnas faltantes a `users`, `modules`, `complementary_plans`. Crear tabla `performance_tests` o quitar la query | 2-3 h |
| 4 | C-04 | Cambiar `"plan_generator"` → `"learning_plan"` en `supabase_service.py` | 10 min |
| 5 | C-05 | Quitar `is_critical` y `has_performance_test` del select en `get_module()` | 5 min |
| 6 | A-03 | Cambiar `ON CONFLICT (coder_id)` → `ON CONFLICT (coder_id, module_id)` | 5 min |

### Sprint siguiente (deuda técnica):

| Prioridad | ID | Acción |
|-----------|-----|--------|
| 7 | C-06, M-04 | Eliminar duplicados de notificaciones, unificar en `notificationControllers.js` |
| 8 | C-08 | Quitar URL hardcodeada de `supabase.js` |
| 9 | A-04 | Aplicar `authLimiter` y `otpLimiter` a sus rutas |
| 10 | A-02 | Reemplazar loops `await` secuencial por `Promise.all` |
| 11 | M-01, M-02 | Eliminar `basicRoutes.js` y `onboarding-logic.js` |
| 12 | M-05, B-07 | Unificar `_get_clients()` y `_extract_json()` en Python |
| 13 | M-06 | Agregar `utils.js` a `.gitignore` |
| 14 | A-05 | Usar `API_BASE` en `reports.js` |
| 15 | M-03 | Decidir qué hacer con los 4 controllers sin ruta en `tlControllers.js` |

---

## 🗂 Archivos afectados por área

### frontend (3 archivos)
- `frontend/assets/js/assignmentCoder.js` — C-01, C-07
- `frontend/assets/js/tech.js` — C-02
- `frontend/src/core/auth/reports.js` — A-05

### backend-node (9 archivos)
- `backend-node/src/server.js` — C-06, A-04
- `backend-node/src/controllers/coderControllers.js` — C-03
- `backend-node/src/controllers/assignmentControllers.js` — A-02, M-04
- `backend-node/src/controllers/resourceControllers.js` — A-02, B-01
- `backend-node/src/controllers/notificationControllers.js` — M-04
- `backend-node/src/controllers/tlControllers.js` — M-03
- `backend-node/src/models/moodleProgress.js` — A-03
- `backend-node/src/routes/exerciseRoutes.js` — A-01
- `backend-node/src/config/supabase.js` — C-08
- `backend-node/src/routes/basicRoutes.js` — M-01
- `backend-node/src/utils/onboarding-logic.js` — M-02
- `backend-node/src/services/pythonApiService.js` — B-02
- `backend-node/src/services/email.service.js` — B-06
- `backend-node/src/utils/helpers.js` — B-04
- `backend-node/src/utils/validators.js` — B-05
- `backend-node/utils.js` — M-06

### backend-python (3 archivos)
- `backend-python/app/services/supabase_service.py` — C-04, C-05
- `backend-python/app/routers/cards.py` — M-05, B-07
- `backend-python/app/routers/reports.py` — M-05, B-07
- `backend-python/main.py` — B-03

---

*Documento generado por auditoría cruzada de 3 IAs — Kairo Project · Clan Turing · Marzo 2026*
