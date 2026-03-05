# 📚 Database - Índice Rápido

Guía rápida para navegar la documentación de base de datos.

---

## 🎯 Por Qué Viniste Aquí

### ❓ "Necesito entender las tablas"
→ Lee [README.md](README.md) (este archivo)

### ❓ "¿Cómo consulto los datos en frontend?"
→ Lee [ENDPOINTS_GUIDE.md](ENDPOINTS_GUIDE.md) con ejemplos JavaScript

### ❓ "Necesito agregar clan_id, priority_level e is_read"
→ Lee [MIGRATION_GUIDE_ES.md](MIGRATION_GUIDE_ES.md)

### ❓ "¿Qué datos tengo para testing?"
→ Lee [seeds/README.md](seeds/README.md)

### ❓ "¿Quién puede ver qué datos?"
→ Lee el comentario en [rls_policies.sql](rls_policies.sql)

### ❓ "Necesito el SQL completo"
→ Abre [schema.sql](schema.sql)

---

## 📂 Estructura

```
database/
├── README.md                    ← EMPIEZA AQUÍ
├── INDEX.md                     ← (este archivo)
├── schema.sql                   ← Definición de tablas
├── rls_policies.sql             ← Seguridad de datos
├── ENDPOINTS_GUIDE.md           ← Ejemplos de código
├── MIGRATION_GUIDE_ES.md        ← Cambios pendientes
├── migrations/
│   └── 001_add_clans...sql     ← Script de cambios
└── seeds/
    ├── users.sql               ← Datos de prueba
    └── README.md               ← Cómo usar seeds
```

---

## 🚀 Primeros Pasos

### 1️⃣ Setup Inicial (Primera vez)
```bash
# Crear tablas
psql -U usuario -d db -f schema.sql

# Activar seguridad
psql -U usuario -d db -f rls_policies.sql

# Llenar con datos de prueba
psql -U usuario -d db -f seeds/users.sql
```

### 2️⃣ Agregar Cambios Requieren Para Funcionar Los Clanes y Las 6 Cards
```bash
psql -U usuario -d db -f migrations/001_add_clans_and_priority_and_notifications.sql
```

### 3️⃣ Ya Estoy Listo Para Usar La BD
→ Ve al [ENDPOINTS_GUIDE.md](ENDPOINTS_GUIDE.md) para ver cómo consultar datos

---

## 🎯 Archivos por Propósito

| Si quiero... | Archivo | Líneas |
|---|---|---|
| Ver estructura completa | schema.sql | ~600 |
| Entender seguridad | rls_policies.sql | ~200 |
| Consultar datos en código | ENDPOINTS_GUIDE.md | ~300 |
| Agregar campos nuevos | MIGRATION_GUIDE_ES.md | ~150 |
| Llenar BD con datos | seeds/users.sql | ~150 |
| Overview de todo | README.md | ~250 |

---

## 💡 Conceptos Clave

### 📊 Las 6 Cards
- Tabla: `complementary_plans`
- Campo: `priority_level` (high, medium, low)
- Resultado: 2 High + 2 Medium + 2 Low

### 👥 Clanes
- Tabla: `users`
- Campo: `clan_id` (Turing, Tesla, McCarthy)
- Permite: TL filtrar coders

### 💬 Notificaciones
- Tabla: `tl_feedback`
- Campo: `is_read` (true/false)
- Muestra: punto rojo si false

---

## 🔐 Seguridad (RLS)

Cada tabla tiene reglas:
- **Coders**: Ven sus propios datos
- **TLs**: Ven datos de sus coders basado en clan_id
- **Datos públicos**: Módulos y temas (todos leen)

Ejemplo:
```sql
-- Coder solo ve su progreso
SELECT * FROM moodle_progress 
WHERE coder_id = auth.uid()::int;

-- TL ve todos los progresos
SELECT * FROM moodle_progress;
```

---

## 📈 Flujo de Datos

```
1. Coder se registra → Se crea en users (role='coder')
2. Coder evalúa habilidades → Se crea soft_skills_assessment
3. Coder ve progreso → Lee moodle_progress
4. TL genera plan → Se crea complementary_plans (con priority_level)
5. Plan tiene actividades → Se crean plan_activities
6. Coder completa actividades → Se actualizan activity_progress
7. TL envía feedback → Se crea tl_feedback (is_read=false)
8. Campana muestra notificación → Porque is_read=false
9. Coder lee → Se actualiza is_read=true
10. Notificación desaparece → ✅
```

---

## ⚡ Queries Frecuentes

### Ver mis 6 cards (Coder)
```javascript
const { data: cards } = await supabase
  .from('complementary_plans')
  .select('*')
  .eq('coder_id', myId)
  .eq('is_active', true)
  .order('priority_level', { ascending: false });
```

### Ver coders de mi clan (TL)
```javascript
const { data: team } = await supabase
  .from('users')
  .select('*')
  .eq('clan_id', 'Turing')
  .eq('role', 'coder');
```

### Ver notificaciones no leídas (Coder)
```javascript
const { data: notifications } = await supabase
  .from('tl_feedback')
  .select('*')
  .eq('coder_id', myId)
  .eq('is_read', false);
```

---

## 📞 Troubleshooting

| Problema | Solución |
|---|---|
| "No veo mis datos" | Verifica RLS en rls_policies.sql |
| "Las 6 cards no se ordenan" | Asegúrate priority_level tenga valor |
| "Las notificaciones no funcionan" | Verifica is_read en tl_feedback |
| "No encuentro el SQL" | Abre schema.sql (es la fuente de verdad) |

---

## 🎓 Aprender Más

1. **Entender RLS** → Lee comentarios en rls_policies.sql
2. **Ver ejemplos reales** → ENDPOINTS_GUIDE.md
3. **Entender Clanes** → MIGRATION_GUIDE_ES.md (sección clan_id)
4. **Testing** → seeds/README.md

---

## ✅ Checklist de Setup

- [ ] Ejecuté schema.sql
- [ ] Ejecuté rls_policies.sql
- [ ] Ejecuté migrations/001_*.sql
- [ ] Ejecuté seeds/users.sql
- [ ] Verifiqué datos con una query de prueba
- [ ] Leí ENDPOINTS_GUIDE.md para mis queries

---

**Última actualización**: Marzo 2026
**Versión de BD**: 3.0
**Estado**: Limpia y lista para usar 🟢
