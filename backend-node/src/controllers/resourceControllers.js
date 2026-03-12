/**
 * controllers/resourceControllers.js
 *
 * FIXES:
 *  - uploadResource: obtiene clan del TL → lo guarda en resources.clan_id
 *  - listResources:  filtra por clan del TL
 *  - deleteResource: verifica clan por seguridad
 *  - searchResources: pasa clan del coder a Python para filtrar vectores
 */

import { query } from '../config/database.js';
import { supabase } from '../config/supabase.js';

const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';
const BUCKET = 'activity-resources';

/* ── Helper ── */
async function getUserClan(userId) {
  const r = await query('SELECT clan FROM users WHERE id = $1', [userId]);
  return r.rows[0]?.clan || null;
}

/* ════════════════════════════════════════
   TL — UPLOAD PDF
   POST /api/tl/resource/upload
════════════════════════════════════════ */
export async function uploadResource(req, res) {
  const tlId = req.session.userId;

  if (!req.file)
    return res.status(400).json({ error: 'No se recibió ningún archivo.' });
  if (req.file.mimetype !== 'application/pdf')
    return res.status(400).json({ error: 'Solo se aceptan archivos PDF.' });
  if (req.file.size > 20 * 1024 * 1024)
    return res.status(400).json({ error: 'El archivo supera los 20 MB.' });

  const title = req.body.title?.trim();
  const moduleId = parseInt(req.body.moduleId) || null;

  if (!title)
    return res.status(400).json({ error: 'El campo title es requerido.' });

  const tlClan = await getUserClan(tlId);
  if (!tlClan)
    return res.status(400).json({ error: 'El TL no tiene un clan asignado.' });

  // Storage path incluye el clan para organización
  const timestamp = Date.now();
  const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${tlClan}/module-${moduleId || '0'}/${timestamp}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, req.file.buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) {
    console.error('[uploadResource] Storage error:', uploadError.message);
    return res
      .status(500)
      .json({ error: 'Error al subir el archivo al Storage.' });
  }

  // Respuesta inmediata al TL
  res.json({
    success: true,
    message: 'PDF subido. Procesando embedding en segundo plano (~10s)...',
    storagePath,
  });

  // Fire-and-forget → Python extrae texto + embedding
  fetch(`${PYTHON_API}/process-resource`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storage_path: storagePath,
      file_name: req.file.originalname,
      title,
      module_id: moduleId,
      clan_id: tlClan,
      uploaded_by: tlId,
    }),
  }).catch((err) =>
    console.error('[uploadResource] Python processing failed:', err.message)
  );
}

/* ════════════════════════════════════════
   TL — LIST RESOURCES (solo del clan del TL)
   GET /api/tl/resource/list?moduleId=4
════════════════════════════════════════ */
export async function listResources(req, res) {
  const tlId = req.session.userId;
  const moduleId = parseInt(req.query.moduleId) || null;

  try {
    const tlClan = await getUserClan(tlId);
    const params = [tlClan];
    let filter = 'clan_id = $1';

    if (moduleId) {
      filter += ' AND module_id = $2';
      params.push(moduleId);
    }

    const result = await query(
      `SELECT id, title, file_name, preview_text, uploaded_at, module_id
       FROM resources
       WHERE ${filter} AND is_active = true
       ORDER BY uploaded_at DESC`,
      params
    );

    res.json({ resources: result.rows });
  } catch (err) {
    console.error('[listResources]', err.message);
    res.status(500).json({ error: 'Failed to list resources' });
  }
}

/* ════════════════════════════════════════
   TL — DELETE RESOURCE
   DELETE /api/tl/resource/:resourceId
════════════════════════════════════════ */
export async function deleteResource(req, res) {
  const tlId = req.session.userId;
  const resourceId = parseInt(req.params.resourceId);

  try {
    const tlClan = await getUserClan(tlId);

    const result = await query(
      `UPDATE resources SET is_active = false
       WHERE id = $1 AND uploaded_by = $2 AND clan_id = $3
       RETURNING id, storage_path`,
      [resourceId, tlId, tlClan]
    );

    if (result.rows.length === 0)
      return res
        .status(404)
        .json({ error: 'Recurso no encontrado o no autorizado.' });

    const { storage_path } = result.rows[0];
    await supabase.storage
      .from(BUCKET)
      .remove([storage_path])
      .catch(() => {});

    res.json({ success: true });
  } catch (err) {
    console.error('[deleteResource]', err.message);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
}

/* ════════════════════════════════════════
   CODER — SEARCH RESOURCES BY TOPIC
   POST /api/coder/resources/search
════════════════════════════════════════ */
export async function searchResources(req, res) {
  const coderId = req.session.userId;
  const { topic, moduleId, limit = 3 } = req.body;

  if (!topic?.trim())
    return res.status(400).json({ error: 'topic es requerido.' });

  try {
    const coderClan = await getUserClan(coderId);

    const pyRes = await fetch(`${PYTHON_API}/search-resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        module_id: moduleId || null,
        clan_id: coderClan,
        limit,
      }),
    });

    if (!pyRes.ok) {
      const err = await pyRes.json().catch(() => ({}));
      throw new Error(err.detail || `Python API ${pyRes.status}`);
    }

    return res.json(await pyRes.json());
  } catch (err) {
    console.error('[searchResources]', err.message);
    return res.json({ success: true, resources: [], reason: err.message });
  }
}
