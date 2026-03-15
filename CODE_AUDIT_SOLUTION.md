# Code Audit Solution

Fecha: 2026-03-14
Rama de trabajo: `deploy/code-optimization`
Alcance: frontend, backend-node, backend-python, documentación de auditoría

## Objetivo

Resolver los hallazgos del archivo de auditoría con este criterio:
- Si el error existía en esta versión del código: corregirlo.
- Si el hallazgo estaba desactualizado o no aplicaba: dejar constancia en `docs/CODE_AUDIT_KAIRO.md`.

## Orden ejecutado

1. Se cerraron primero los pendientes técnicos.
2. Luego se ejecutó smoke test.
3. Al final se documentó la solución en este archivo y en el documento de auditoría.

## Qué se solucionó

### Frontend

- `frontend/assets/js/assignmentCoder.js`
  - Corregido `ReferenceError` por uso de `API` inexistente.
  - Se reemplazó por `API_BASE` en descargas de actividades y recursos.

- `frontend/assets/js/tech.js`
  - Corregido `ReferenceError` por uso de `_API` inexistente.
  - Se reemplazó por `API_BASE`.
  - Se corrigió la ruta de import de `config.js`.

- `frontend/src/core/auth/reports.js`
  - Eliminada URL hardcodeada de Railway.
  - Se pasó a usar `API_BASE` para centralizar configuración y evitar desincronización.

### Backend Node

- `backend-node/src/server.js`
  - Se aplicaron `authLimiter` y `otpLimiter`.
  - Se montó `exerciseRoutes` en `/api/exercise` para evitar drift de rutas no usadas.
  - Se integró `testEmailConnection()` en bootstrap.
  - Se programó limpieza periódica con `cleanupExpiredOtps()` cada hora.

- `backend-node/src/config/supabase.js`
  - Eliminado fallback hardcodeado de `SUPABASE_URL`.
  - Ahora falla explícitamente si faltan `SUPABASE_URL` o `SUPABASE_SERVICE_KEY`.

- `backend-node/src/controllers/assignmentControllers.js`
  - N+1 secuencial cambiado a `Promise.all` para notificaciones.
  - Eliminadas funciones duplicadas de notificaciones.

- `backend-node/src/routes/assignmentRoutes.js`
  - Eliminadas rutas duplicadas de notificaciones para dejar una sola fuente.

- `backend-node/src/controllers/resourceControllers.js`
  - N+1 secuencial cambiado a `Promise.all`.
  - Eliminada constante sin uso `PYTHON_API`.

- `backend-node/src/controllers/coderControllers.js`
  - Ajustadas queries para compatibilidad con esquema actual.
  - Manejo defensivo cuando `performance_tests` no existe.
  - `completed_days` se gestiona dentro de `plan_content` (JSONB) para evitar dependencia en columna ausente.
  - `requestPlan` obtiene `module_id` desde `moodle_progress` reciente.

- `backend-node/src/routes/tlRoutes.js`
  - Se conectaron endpoints para controllers exportados sin ruta:
    - `getAllCodersByClan`
    - `getClanMetrics`
    - `getCoderFullDetail`
    - `getRiskReports`

- `backend-node/src/controllers/authControllers.js`
  - Integrada validación server-side real usando `validators.js`:
    - `validateEmail`
    - `validatePassword`
    - `validateRole`
    - `validateFullName`
    - `sanitizeInput`

- `backend-node/src/utils/helpers.js`
  - Removidas utilidades muertas confirmadas (`toCamelCase`, `truncateText`).

- `backend-node/src/services/pythonApiService.js`
  - Eliminada `callPythonApiGet` por no tener uso activo.

- `backend-node/utils.js`
  - Eliminada contraseña hardcodeada.
  - Ahora toma contraseña desde argumento CLI o variable de entorno.

- Archivos muertos eliminados
  - `backend-node/src/routes/basicRoutes.js`
  - `backend-node/src/utils/onboarding-logic.js`

### Backend Python

- `backend-python/app/services/supabase_service.py`
  - `get_module()` ya no consulta columnas inexistentes (`is_critical`, `has_performance_test`).
  - Normalización de `agent_type` para cumplir el ENUM de DB.
  - Ajuste de lectura de clan (`clan:clan_id`) en `get_coder()`.

- `backend-python/app/routers/roadmap.py`
- `backend-python/app/routers/exercises.py`
  - `agent_type` actualizado a valores compatibles.

- `backend-python/app/routers/cards.py`
- `backend-python/app/routers/reports.py`
  - Eliminada duplicación de `_get_clients()`.
  - Reutilizan clientes compartidos.
  - Reutilizan parser JSON `_extract_json()`.

- Nuevo archivo
  - `backend-python/app/services/clients.py`
  - Centraliza cliente Groq y cliente Supabase para evitar recreación por request.

- `backend-python/main.py`
  - Eliminado comentario residual de router removido.

### Documentación de auditoría

- `docs/CODE_AUDIT_KAIRO.md`
  - Se agregó una tabla de estado por ID con clasificación:
    - `✅ Corregido`
    - `ℹ️ Desactualizado`
    - `⚠️ Pendiente`
  - Al final de esta ejecución, los pendientes identificados en esta ronda quedaron cerrados.

## Cómo se implementó

- Se validó cada hallazgo contra el código real antes de editar.
- Se aplicaron cambios mínimos y seguros para no introducir regresiones.
- Se prefirió centralización (config y clientes compartidos) sobre duplicación.
- Se eliminaron duplicados funcionales y código muerto confirmado.
- Se reforzó validación server-side en autenticación para reducir riesgo de entradas inválidas.

## Por qué se solucionó así

- Estabilidad: se corrigieron primero errores de runtime visibles (ReferenceError y rutas conflictivas).
- Seguridad: se removieron secretos hardcodeados y se activaron rate limiters.
- Compatibilidad: se adaptaron queries a esquemas reales sin bloquear despliegues por drift.
- Rendimiento: se eliminaron loops secuenciales de notificaciones (`await` en serie).
- Mantenibilidad: se quitó código muerto, duplicado y parseo repetido.

## Smoke Test ejecutado

1. JavaScript syntax check (`node --check`) en archivos modificados de frontend y backend-node.
2. Python compile check (`python -m compileall backend-python/app backend-python/main.py`).
3. Diagnóstico de errores del workspace (`get_errors`) sobre backend-node, backend-python y frontend.

Resultado: sin errores reportados en el estado final.

## Nota operativa

Si el equipo quiere, el siguiente paso natural es separar estos cambios en commits temáticos:
- `frontend-fixes`
- `backend-node-runtime-security`
- `backend-python-db-compat`
- `audit-docs-update`
