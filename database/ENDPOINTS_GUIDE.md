# 📡 Guía de Endpoints - Supabase

Supabase genera automáticamente endpoints REST para cada tabla. No necesitas escribir backend manualmente. El frontend habla directamente con la BD usando el cliente de Supabase.

---

## 👥 Usuarios

**Tabla:** `users`

```javascript
// Leer mi perfil
const { data: user } = await supabase
  .from('users')
  .select('*')
  .single();

// Actualizar mi nombre
const { data } = await supabase
  .from('users')
  .update({ full_name: 'Nuevo nombre' })
  .eq('id', userId)
  .select();

// Ver todos los coders de mi clan (si eres TL)
const { data: teamMembers } = await supabase
  .from('users')
  .select('*')
  .eq('clan_id', 'Turing')
  .eq('role', 'coder');
```

---

## 📊 Habilidades Blandas

**Tabla:** `soft_skills_assessment`

```javascript
// Ver mi evaluación
const { data: mySkills } = await supabase
  .from('soft_skills_assessment')
  .select('*')
  .eq('coder_id', currentUserId)
  .single();

// TL ve habilidades de un coder
const { data: coderSkills } = await supabase
  .from('soft_skills_assessment')
  .select('*')
  .eq('coder_id', coderId)
  .single();
```

---

## 📚 Módulos

**Tabla:** `modules`

```javascript
// Ver todos los módulos (público)
const { data: modules } = await supabase
  .from('modules')
  .select('*');

// Ver detalles de un módulo
const { data: module } = await supabase
  .from('modules')
  .select('*')
  .eq('id', moduleId)
  .single();
```

---

## 📈 Progreso Académico

**Tabla:** `moodle_progress`

```javascript
// Ver mi progreso en un módulo
const { data: myProgress } = await supabase
  .from('moodle_progress')
  .select(`
    *,
    module:modules(name)
  `)
  .eq('coder_id', currentUserId)
  .eq('module_id', moduleId)
  .single();

// TL ve el promedio de todos sus coders
const { data: allProgress } = await supabase
  .from('moodle_progress')
  .select('*')
  .order('average_score', { ascending: false });
```

---

## 🎯 Temas

**Tabla:** `topics`

```javascript
// Ver temas de un módulo
const { data: topics } = await supabase
  .from('topics')
  .select('*')
  .eq('module_id', moduleId);

// Ver solo temas por categoría
const { data: categoryTopics } = await supabase
  .from('topics')
  .select('*')
  .eq('category', 'JavaScript');
```

---

## ⚠️ Mis Temas Difíciles

**Tabla:** `coder_struggling_topics`

```javascript
// Reportar que tengo dificultad con un tema
const { data } = await supabase
  .from('coder_struggling_topics')
  .insert({
    coder_id: currentUserId,
    topic_id: topicId
  });

// Ver todos mis temas difíciles
const { data: myStruggles } = await supabase
  .from('coder_struggling_topics')
  .select(`
    *,
    topic:topics(name, category)
  `)
  .eq('coder_id', currentUserId);

// Dejar de reportar dificultad
await supabase
  .from('coder_struggling_topics')
  .delete()
  .eq('coder_id', currentUserId)
  .eq('topic_id', topicId);
```

---

## 🎨 Las 6 Cards

**Tabla:** `complementary_plans`

```javascript
// Ver mis 6 cards activas (ordenadas por prioridad)
const { data: myCards } = await supabase
  .from('complementary_plans')
  .select(`
    *,
    activities:plan_activities(day_number, title)
  `)
  .eq('coder_id', currentUserId)
  .eq('is_active', true)
  .order('priority_level', { ascending: false });

// (Resultado: 2 High, 2 Medium, 2 Low)

// Ver detalles de una card específica
const { data: card } = await supabase
  .from('complementary_plans')
  .select(`
    *,
    activities:plan_activities(*)
  `)
  .eq('id', cardId)
  .single();
```

---

## 📅 Actividades Diarias

**Tabla:** `plan_activities`

```javascript
// Ver actividades de mi card (ordenadas por día)
const { data: activities } = await supabase
  .from('plan_activities')
  .select('*')
  .eq('plan_id', cardId)
  .order('day_number', { ascending: true });

// Ver detalles de una actividad
const { data: activity } = await supabase
  .from('plan_activities')
  .select('*')
  .eq('id', activityId)
  .single();
```

---

## ✅ Mi Progreso en Actividades

**Tabla:** `activity_progress`

```javascript
// Marcar actividad como completada
const { data } = await supabase
  .from('activity_progress')
  .update({
    completed: true,
    completed_at: new Date(),
    reflection_text: 'Aprendí mucho hoy',
    time_spent_minutes: 45
  })
  .eq('activity_id', activityId)
  .eq('coder_id', currentUserId)
  .select();

// Ver mi progreso en una card
const { data: progress } = await supabase
  .from('activity_progress')
  .select('*')
  .eq('coder_id', currentUserId);

// Porcentaje de actividades completadas
const completed = progress.filter(p => p.completed).length;
const percentage = (completed / progress.length) * 100;
```

---

## 📤 Subir Evidencia

**Tabla:** `evidence_submissions`

```javascript
// Subir evidencia de una actividad
const { data } = await supabase
  .from('evidence_submissions')
  .insert({
    activity_id: activityId,
    coder_id: currentUserId,
    file_url: 'https://storage.example.com/proof.pdf',
    description: 'Mi proyecto completado'
  });

// Ver mis evidencias subidas
const { data: myEvidence } = await supabase
  .from('evidence_submissions')
  .select('*')
  .eq('coder_id', currentUserId);
```

---

## 💬 Mensajes del TL

**Tabla:** `tl_feedback`

```javascript
// Ver mensajes nuevos (no leídos)
const { data: unread } = await supabase
  .from('tl_feedback')
  .select(`
    *,
    tl_user:tl_id(email, full_name)
  `)
  .eq('coder_id', currentUserId)
  .eq('is_read', false);

// Ver todos mis mensajes
const { data: allFeedback } = await supabase
  .from('tl_feedback')
  .select('*')
  .eq('coder_id', currentUserId)
  .order('created_at', { ascending: false });

// Marcar mensaje como leído
await supabase
  .from('tl_feedback')
  .update({ is_read: true })
  .eq('id', feedbackId);

// TL envía un mensaje
const { data } = await supabase
  .from('tl_feedback')
  .insert({
    coder_id: selectedCoderId,
    tl_id: currentUserId,
    feedback_text: '¡Excelente trabajo!',
    feedback_type: 'weekly'
  });
```

---

## ⚠️ Alertas de Riesgo

**Tabla:** `risk_flags`

```javascript
// Ver mis alertas activas
const { data: myRisks } = await supabase
  .from('risk_flags')
  .select('*')
  .eq('coder_id', currentUserId)
  .eq('resolved', false);

// TL ve coders en riesgo
const { data: coderRisks } = await supabase
  .from('risk_flags')
  .select('*')
  .eq('risk_level', 'high')
  .eq('resolved', false);

// Marcar alerta como resuelta
await supabase
  .from('risk_flags')
  .update({ resolved: true, resolved_at: new Date() })
  .eq('id', flagId);
```

---

## 📊 Reportes del TL

**Tabla:** `ai_reports`

```javascript
// TL ve reportes de sus coders
const { data: myReports } = await supabase
  .from('ai_reports')
  .select('*')
  .eq('target_type', 'coder')
  .eq('target_id', coderId);

// Marcar reporte como visto
await supabase
  .from('ai_reports')
  .update({ viewed_by_tl: true })
  .eq('id', reportId);
```

---

## 🔍 Log de IA (Auditoría)

**Tabla:** `ai_generation_log`

```javascript
// Ver cuándo se generaron mis planes
const { data: log } = await supabase
  .from('ai_generation_log')
  .select('*')
  .eq('coder_id', currentUserId)
  .order('generated_at', { ascending: false });
```

---

## 📌 Notas Importantes

- Los campos `is_read` en `tl_feedback` son clave para la campana de notificaciones
- El campo `priority_level` en `complementary_plans` ordena las 6 cards (2 High, 2 Medium, 2 Low)
- El campo `clan_id` en `users` permite al TL filtrar coders por clan
- Todos los timestamps se actualizan automáticamente con `CURRENT_TIMESTAMP`
