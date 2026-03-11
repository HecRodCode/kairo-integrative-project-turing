# 🗄️ Base de Datos - Ruta Formativa Personalizada con IA

## 📁 Archivos Incluidos

```
📦 database-documentation/
├── 📄 README.md                           # Este archivo
├── 📊 DOCUMENTACION_BASE_DATOS.md         # Documentación completa del modelo
├── 🔧 create_tables.sql                   # Script de creación de tablas
├── 🌱 seed_data.sql                       # Datos de prueba
├── 📈 diagrama_global.mermaid             # Diagrama ER completo
├── 📈 diagrama_planes_complementarios.mermaid
├── 📈 diagrama_gestion_usuarios.mermaid
└── 📈 diagrama_estructura_contenidos.mermaid
```

---

## 🚀 Inicio Rápido

### Opción 1: Instalación Completa (Recomendado)

```bash
# 1. Crear base de datos
createdb ruta_formativa_db

# 2. Ejecutar script de creación
psql -d ruta_formativa_db -f create_tables.sql

# 3. Poblar con datos de prueba
psql -d ruta_formativa_db -f seed_data.sql
```

### Opción 2: Desde psql

```sql
-- Conectarse a PostgreSQL
psql -U postgres

-- Crear base de datos
CREATE DATABASE ruta_formativa_db;

-- Conectarse a la BD
\c ruta_formativa_db

-- Ejecutar scripts
\i create_tables.sql
\i seed_data.sql
```

---

## 📊 Verificar Instalación

Después de ejecutar los scripts, verifica que todo esté correcto:

```sql
-- Ver todas las tablas
\dt

-- Contar registros en cada tabla
SELECT 'users' AS tabla, COUNT(*) FROM users
UNION ALL
SELECT 'soft_skills_assessment', COUNT(*) FROM soft_skills_assessment
UNION ALL
SELECT 'modules', COUNT(*) FROM modules
UNION ALL
SELECT 'complementary_plans', COUNT(*) FROM complementary_plans;

-- Ver las vistas creadas
\dv
```

**Resultado esperado:**
- 11 tablas creadas
- 3 vistas creadas
- 7 usuarios (2 TL + 5 coders)
- 4 módulos
- Datos de prueba poblados

---

## 👤 Usuarios de Prueba

### Team Leaders (TL)
| Email | Password | Rol |
|-------|----------|-----|
| tl.maria@riwi.io | password123 | tl |
| tl.carlos@riwi.io | password123 | tl |

### Coders
| Email | Password | Perfil |
|-------|----------|--------|
| coder.juan@riwi.io | password123 | Baja autonomía (RIESGO) |
| coder.ana@riwi.io | password123 | Excelente rendimiento |
| coder.pedro@riwi.io | password123 | Rendimiento medio |
| coder.sofia@riwi.io | password123 | Excelente en todo |
| coder.luis@riwi.io | password123 | RIESGO ALTO |
| coder.laura@riwi.io | password123 | Balance medio |
| coder.diego@riwi.io | password123 | Alta autonomía |

**Nota:** Las contraseñas están hasheadas en la BD con bcrypt.

---

## 🔍 Consultas Útiles

### Ver Dashboard de un Coder

```sql
SELECT * FROM v_coder_dashboard 
WHERE email = 'coder.juan@riwi.io';
```

### Ver Coders en Riesgo

```sql
SELECT * FROM v_coder_risk_analysis 
WHERE risk_level IN ('HIGH_RISK', 'MEDIUM_RISK')
ORDER BY risk_level DESC;
```

### Ver Plan Activo de un Coder

```sql
SELECT 
    cp.id,
    cp.week_number,
    m.name AS module_name,
    cp.generated_at,
    COUNT(pa.id) AS total_activities
FROM complementary_plans cp
JOIN modules m ON cp.module_id = m.id
LEFT JOIN plan_activities pa ON cp.id = pa.plan_id
WHERE cp.coder_id = 3 AND cp.is_active = TRUE
GROUP BY cp.id, cp.week_number, m.name, cp.generated_at;
```

### Ver Actividades Pendientes

```sql
SELECT 
    pa.day_number,
    pa.title,
    pa.estimated_time_minutes,
    pa.activity_type
FROM plan_activities pa
LEFT JOIN activity_progress ap ON pa.id = ap.activity_id AND ap.coder_id = 3
WHERE pa.plan_id = 1 AND (ap.completed IS NULL OR ap.completed = FALSE)
ORDER BY pa.day_number, pa.order_index;
```

### Ver Feedback Recibido

```sql
SELECT 
    tl.email AS team_leader,
    tf.feedback_text,
    tf.feedback_type,
    tf.created_at
FROM tl_feedback tf
JOIN users tl ON tf.tl_id = tl.id
WHERE tf.coder_id = 3
ORDER BY tf.created_at DESC;
```

---

## 📈 Visualizar Diagramas ER

Los archivos `.mermaid` se pueden visualizar de varias formas:

### Opción 1: Online (Más Fácil)

1. Ir a [Mermaid Live Editor](https://mermaid.live/)
2. Copiar el contenido del archivo `.mermaid`
3. Pegar en el editor

### Opción 2: VS Code

1. Instalar extensión "Markdown Preview Mermaid Support"
2. Crear un archivo `.md` y pegar:

```markdown
# Diagrama ER

​```mermaid
[contenido del archivo .mermaid]
​```
```

3. Usar preview de Markdown

### Opción 3: Notion, Obsidian, etc.

Muchas herramientas soportan Mermaid nativamente. Solo pega el código en un bloque de código de tipo `mermaid`.

---

## 🛠️ Mantenimiento

### Resetear la Base de Datos

```bash
# Eliminar BD
dropdb ruta_formativa_db

# Recrear desde cero
createdb ruta_formativa_db
psql -d ruta_formativa_db -f create_tables.sql
psql -d ruta_formativa_db -f seed_data.sql
```

### Backup de la Base de Datos

```bash
# Backup completo
pg_dump ruta_formativa_db > backup_$(date +%Y%m%d).sql

# Backup solo esquema (sin datos)
pg_dump --schema-only ruta_formativa_db > schema_backup.sql

# Backup solo datos
pg_dump --data-only ruta_formativa_db > data_backup.sql
```

### Restaurar desde Backup

```bash
psql -d ruta_formativa_db < backup_20260214.sql
```

---

## 🔐 Configuración para Producción

### Variables de Entorno

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ruta_formativa_db
DB_USER=tu_usuario
DB_PASSWORD=tu_password_seguro
DB_SSL=true
```

### Conexión desde Node.js

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

module.exports = pool;
```

### Ejemplo de Consulta

```javascript
const pool = require('./db');

// Obtener coder por email
async function getCoderByEmail(email) {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1 AND role = $2',
    [email, 'coder']
  );
  return result.rows[0];
}

// Obtener dashboard del coder
async function getCoderDashboard(coderId) {
  const result = await pool.query(
    'SELECT * FROM v_coder_dashboard WHERE coder_id = $1',
    [coderId]
  );
  return result.rows[0];
}
```

---

## 📚 Documentación Adicional

Para información detallada sobre cada tabla, relación, y consulta, consulta:

👉 **[DOCUMENTACION_BASE_DATOS.md](./DOCUMENTACION_BASE_DATOS.md)**

Este documento incluye:
- Descripción completa de todas las tablas
- Diccionario de datos
- Diagramas de relaciones
- Índices y optimizaciones
- Triggers y funciones
- Vistas predefinidas
- Consultas útiles
- Consideraciones de seguridad

---

## 🤝 Contribución

Si encuentras algún error o quieres mejorar el modelo:

1. Documenta el cambio propuesto
2. Actualiza el archivo `create_tables.sql`
3. Actualiza la documentación
4. Actualiza los diagramas si es necesario

---

## 📧 Contacto

**Proyecto:** Ruta Formativa Personalizada con IA  
**Equipo:** Riwi - Proyecto Integrador 2026  
**Desarrollador de BD:** Miguel Montoya  
**Email:** miguel.montoya@riwi.io

---

## 📝 Notas Importantes

⚠️ **Seguridad:**
- Las contraseñas en `seed_data.sql` son solo para pruebas
- En producción, NUNCA guardes contraseñas en texto plano
- Siempre usa hash bcrypt con salt

⚠️ **Rendimiento:**
- Los índices están configurados para el MVP
- Para producción, analiza queries reales y ajusta índices
- Considera particionamiento si la BD crece mucho

⚠️ **Backups:**
- Programa backups automáticos en producción
- Prueba la restauración regularmente
- Guarda backups en ubicación externa

---

## ✅ Checklist de Implementación

- [ ] PostgreSQL instalado (versión 14+)
- [ ] Base de datos creada
- [ ] Script `create_tables.sql` ejecutado
- [ ] Script `seed_data.sql` ejecutado (opcional)
- [ ] Verificación de tablas completada
- [ ] Conexión desde backend probada
- [ ] Variables de entorno configuradas
- [ ] Backups configurados (producción)

---

**¡Listo para usar! 🎉**
