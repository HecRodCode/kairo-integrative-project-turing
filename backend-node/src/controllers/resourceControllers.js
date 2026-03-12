/**
 * controllers/resourceControllers.js
 *
 * FIXES:
 *  - uploadResource: obtiene clan_id del TL → lo guarda en resources.clan_id
 *  - listResources:  filtra por clan_id del TL
 *  - deleteResource: verifica clan_id por seguridad
 *  - searchResources: pasa clan del coder a Python para filtrar vectores
 */

import { query } from '../config/database.js';
import { supabase } from '../config/supabase.js';
import { notifyUser } from '../services/notificationService.js';

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
  const tlId = req.user?.id;

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

  let resourceId = null;
  try {
    const insertRes = await query(
      `INSERT INTO resources (module_id, title, storage_path, file_name, uploaded_by, clan_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id`,
      [moduleId, title, storagePath, req.file.originalname, tlId, tlClan]
    );
    resourceId = insertRes.rows[0].id;
  } catch (dbErr) {
    console.error('[uploadResource] Database insert failed:', dbErr.message);
    // Non-fatal for the user response, but critical for the grid visibility.
  }

  // Send real-time notifications
  try {
    const tlResult = await query('SELECT full_name FROM users WHERE id = $1', [tlId]);
    const tlName = tlResult.rows[0]?.full_name || 'Tu Leader';

    const coderResult = await query(
      `SELECT id FROM users WHERE role = 'coder' AND clan = $1 AND is_active = true`,
      [tlClan]
    );

    for (const coder of coderResult.rows) {
      await notifyUser(
        coder.id,
        `Nuevo recurso: ${title}`,
        `Tu TL ${tlName} publicó un recurso RAG.`,
        'assignment',
        null
      );
    }
    
    await notifyUser(
      tlId,
      `Recurso RAG Publicado`,
      `El recurso "${title}" ha sido enviado a la base de conocimiento de tu clan.`,
      'assignment',
      null
    );
  } catch (err) {
    console.error('[uploadResource] Failed to send notifications:', err);
  }

  // Respuesta inmediata al TL
  res.json({
    success: true,
    message: 'PDF subido correctamente.',
    storagePath
  });
}

/* ════════════════════════════════════════
   TL — LIST RESOURCES (solo del clan del TL)
   GET /api/tl/resource/list?moduleId=4
════════════════════════════════════════ */
export async function listResources(req, res) {
  const tlId = req.user?.id;
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
   CODER — LIST RESOURCES (del clan del Coder)
   GET /api/coder/resources
   (Opcional filtrado por módulo)
   Usado en assignmentCoder.js para el Hub de Actividades
   (Equivalente funcional al grid del TL)
════════════════════════════════════════ */
export async function listResourcesCoder(req, res) {
  const coderId = req.user?.id;
  const moduleId = parseInt(req.query.moduleId) || null;

  try {
    const coderClan = await getUserClan(coderId);
    if (!coderClan) {
      return res.json({ resources: [] });
    }

    const params = [coderClan];
    let whereClause = 'r.clan_id = $1';

    if (moduleId) {
      whereClause += ' AND r.module_id = $2';
      params.push(moduleId);
    }

    const result = await query(
      `SELECT r.id, r.title, r.file_name, r.preview_text, r.uploaded_at, r.module_id,
              m.name as module_name,
              u.full_name as tl_name
       FROM resources r
       LEFT JOIN modules m ON r.module_id = m.id
       LEFT JOIN users u ON r.uploaded_by = u.id
       WHERE ${whereClause} AND r.is_active = true
       ORDER BY r.uploaded_at DESC`,
      params
    );

    res.json({ resources: result.rows });
  } catch (err) {
    console.error('[listResourcesCoder]', err.message);
    res.status(500).json({ error: 'Failed to list resources' });
  }
}

/* ════════════════════════════════════════
   TL — DELETE RESOURCE
   DELETE /api/tl/resource/:resourceId
════════════════════════════════════════ */
export async function deleteResource(req, res) {
  const tlId = req.user?.id;
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
  // Búsqueda semántica desactivada al eliminar dependencia de Python.
  // Podríamos implementar una búsqueda básica por texto aquí en el futuro.
  return res.json({ success: true, resources: [], reason: 'semantic_search_disabled' });
}

/* ════════════════════════════════════════
   CODER — DOWNLOAD RESOURCE
   GET /api/coder/resource/:id/download
════════════════════════════════════════ */
export async function getResourceDownload(req, res) {
  const coderId = req.user?.id;
  const { id } = req.params;

  try {
    const coderClan = await getUserClan(coderId);

    const result = await query(
      `SELECT * FROM resources
       WHERE id = $1 AND is_active = true AND clan_id = $2`,
      [id, coderClan]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Recurso no encontrado o no autorizado.' });
    }

    const resource = result.rows[0];
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(resource.storage_path, 3600);

    if (error) throw error;

    res.json({ url: data.signedUrl, fileName: resource.file_name });
  } catch (err) {
    console.error('[getResourceDownload]', err.message);
    res.status(500).json({ error: 'Error al generar enlace de descarga.' });
  }
}
