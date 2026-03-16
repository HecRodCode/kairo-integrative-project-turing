/**
 * controllers/resourceControllers.js
 */

import { query } from '../config/database.js';
import { supabase } from '../config/supabase.js';
import { notifyUser } from '../services/notificationService.js';
import { callPythonApi } from '../services/pythonApiService.js';

const BUCKET = 'activity-resources';

async function getUserClan(userId) {
  const r = await query('SELECT clan FROM users WHERE id = $1', [userId]);
  return r.rows[0]?.clan || null;
}

/* TL — UPLOAD PDF */
export async function uploadResource(req, res) {
  const tlId = req.user?.id || req.session?.userId;

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
    console.error('[uploadResource] DB insert failed:', dbErr.message);
  }

  // Notify all active coders in the clan
  try {
    const tlResult = await query('SELECT full_name FROM users WHERE id = $1', [
      tlId,
    ]);
    const tlName = tlResult.rows[0]?.full_name || 'Tu Leader';
    const coderResult = await query(
      `SELECT id FROM users WHERE role = 'coder' AND clan = $1 AND is_active = true`,
      [tlClan]
    );
    for (const coder of coderResult.rows) {
      await notifyUser(
        coder.id,
        `Nuevo recurso: ${title}`,
        `Tu TL ${tlName} publicó un nuevo recurso de estudio.`,
        'assignment',
        resourceId
      );
    }
    await notifyUser(
      tlId,
      'Recurso publicado',
      `"${title}" ha sido subido correctamente a la base de conocimiento de tu clan.`,
      'assignment',
      resourceId
    );
  } catch (notifyErr) {
    console.warn(
      '[uploadResource] Notification failed (non-blocking):',
      notifyErr.message
    );
  }

  return res.json({
    success: true,
    message: 'PDF subido correctamente.',
    resourceId,
    storagePath,
  });
}

/* TL — LIST RESOURCES */
export async function listResources(req, res) {
  const tlId = req.user?.id || req.session?.userId;
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
      `SELECT id, title, file_name, preview_text, uploaded_at, module_id, clan_id AS clan
       FROM resources
       WHERE ${filter} AND is_active = true
       ORDER BY uploaded_at DESC`,
      params
    );

    return res.json({ resources: result.rows });
  } catch (err) {
    console.error('[listResources]', err.message);
    return res.status(500).json({ error: 'Failed to list resources' });
  }
}

/* CODER — LIST RESOURCES */
export async function listResourcesCoder(req, res) {
  const coderId = req.user?.id || req.session?.userId;
  const moduleId = parseInt(req.query.moduleId) || null;

  try {
    const coderClan = await getUserClan(coderId);
    if (!coderClan) return res.json({ resources: [] });

    const params = [coderClan];
    let whereClause = 'r.clan_id = $1';

    if (moduleId) {
      whereClause += ' AND r.module_id = $2';
      params.push(moduleId);
    }

    const result = await query(
      `SELECT r.id, r.title, r.file_name, r.preview_text, r.uploaded_at,
              r.module_id, r.clan_id AS clan,
              m.name    AS module_name,
              u.full_name AS tl_name
       FROM resources r
       LEFT JOIN modules m ON r.module_id = m.id
       LEFT JOIN users   u ON r.uploaded_by = u.id
       WHERE ${whereClause} AND r.is_active = true
       ORDER BY r.uploaded_at DESC`,
      params
    );

    return res.json({ resources: result.rows });
  } catch (err) {
    console.error('[listResourcesCoder]', err.message);
    return res.status(500).json({ error: 'Failed to list resources' });
  }
}

/* TL — DELETE RESOURCE */
export async function deleteResource(req, res) {
  const tlId = req.user?.id || req.session?.userId;
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

    return res.json({ success: true });
  } catch (err) {
    console.error('[deleteResource]', err.message);
    return res.status(500).json({ error: 'Failed to delete resource' });
  }
}

/* CODER — SEARCH RESOURCES BY TOPIC (RAG)  */
export async function searchResources(req, res) {
  const coderId = req.user?.id || req.session?.userId;
  const { topic, moduleId, limit = 3 } = req.body;

  if (!topic) return res.json({ success: true, resources: [] });

  try {
    const coderClan = await getUserClan(coderId);
    if (!coderClan) return res.json({ success: true, resources: [] });

    let resources = [];

    // 1. Try Python RAG (semantic search) — 3s timeout, non-blocking
    try {
      const pyData = await callPythonApi('/search-resources', {
        topic,
        clan_id: coderClan,
        module_id: moduleId || null,
        limit: parseInt(limit),
        coder_id: coderId,
      });
      resources = pyData.resources || [];
    } catch (pyErr) {
      console.warn(
        '[searchResources] Python RAG unavailable, using text fallback:',
        pyErr.message
      );
    }

    // 2. Fallback: pg full-text search
    if (resources.length === 0) {
      const params = [coderClan, `%${topic.toLowerCase()}%`];
      let extra = '';
      if (moduleId) {
        extra = ' AND r.module_id = $3';
        params.push(parseInt(moduleId));
      }

      const result = await query(
        `SELECT r.id, r.title, r.file_name, r.preview_text,
                r.storage_path, r.module_id, r.uploaded_at,
                0.8 AS similarity
         FROM resources r
         WHERE r.clan_id = $1 AND r.is_active = true
           AND (LOWER(r.title) LIKE $2 OR LOWER(r.preview_text) LIKE $2)
           ${extra}
         ORDER BY r.uploaded_at DESC
         LIMIT ${parseInt(limit)}`,
        params
      );
      resources = result.rows;
    }

    // 3. Last resort: any resource from clan for this module
    if (resources.length === 0 && moduleId) {
      const result = await query(
        `SELECT r.id, r.title, r.file_name, r.preview_text,
                r.storage_path, r.module_id, r.uploaded_at,
                0.5 AS similarity
         FROM resources r
         WHERE r.clan_id = $1 AND r.is_active = true AND r.module_id = $2
         ORDER BY r.uploaded_at DESC LIMIT $3`,
        [coderClan, parseInt(moduleId), parseInt(limit)]
      );
      resources = result.rows;
    }

    // Generate signed download URLs for each resource
    const withUrls = await Promise.all(
      resources.map(async (r) => {
        if (!r.storage_path) return { ...r, download_url: null };
        try {
          const { data } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(r.storage_path, 3600);
          return { ...r, download_url: data?.signedUrl || null };
        } catch {
          return { ...r, download_url: null };
        }
      })
    );

    return res.json({ success: true, resources: withUrls });
  } catch (err) {
    console.error('[searchResources]', err.message);
    return res.json({ success: true, resources: [] });
  }
}

/* CODER — DOWNLOAD RESOURCE */
export async function getResourceDownload(req, res) {
  const coderId = req.user?.id || req.session?.userId;
  const { id } = req.params;

  try {
    const coderClan = await getUserClan(coderId);

    const result = await query(
      `SELECT * FROM resources
       WHERE id = $1 AND is_active = true AND clan_id = $2`,
      [id, coderClan]
    );

    if (!result.rows.length)
      return res
        .status(404)
        .json({ error: 'Recurso no encontrado o no autorizado.' });

    const resource = result.rows[0];
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(resource.storage_path, 3600);

    if (error) throw error;

    return res.json({ url: data.signedUrl, fileName: resource.file_name });
  } catch (err) {
    console.error('[getResourceDownload]', err.message);
    return res
      .status(500)
      .json({ error: 'Error al generar enlace de descarga.' });
  }
}
