/**
 * backend-node/controllers/assignmentControllers.js
 */

import { query } from '../config/database.js';
import { createClient } from '@supabase/supabase-js';
import { notifyUser } from '../services/notificationService.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const BUCKET = 'assignment-files';

export async function createAssignment(req, res) {
  try {
    const tl = req.user;
    const { title, moduleId, scope, deadline, repoUrl, contentType } = req.body;

    if (!title || !contentType || !scope) {
      return res
        .status(400)
        .json({ error: 'Faltan campos requeridos: título, tipo y alcance.' });
    }
    if (contentType === 'repo' && !repoUrl) {
      return res
        .status(400)
        .json({ error: 'Se requiere la URL del repositorio.' });
    }
    if (contentType === 'pdf' && !req.file) {
      return res.status(400).json({ error: 'Se requiere un archivo PDF.' });
    }

    const tlResult = await query(
      'SELECT clan, full_name FROM users WHERE id = $1',
      [tl.id]
    );
    const clan = tlResult.rows[0]?.clan;
    const tlName = tlResult.rows[0]?.full_name;

    let storagePath = null;
    let fileName = null;

    if (contentType === 'pdf' && req.file) {
      const timestamp = Date.now();
      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      storagePath = `${clan}/module-${moduleId || 0}/${timestamp}_${safeName}`;
      fileName = req.file.originalname;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, req.file.buffer, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) throw new Error(`Storage error: ${uploadError.message}`);
    }

    const clanId = scope === 'clan' ? clan : null;
    const result = await query(
      `INSERT INTO assignments
         (tl_id, clan_id, scope, title, module_id, content_type, storage_path, repo_url, file_name, deadline)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        tl.id,
        clanId,
        scope,
        title,
        moduleId || null,
        contentType,
        storagePath,
        repoUrl || null,
        fileName,
        deadline || null,
      ]
    );

    const assignmentId = result.rows[0].id;

    let coderResult;
    if (scope === 'all') {
      coderResult = await query(
        `SELECT id FROM users WHERE role = 'coder' AND is_active = true`
      );
    } else {
      coderResult = await query(
        `SELECT id FROM users WHERE role = 'coder' AND clan = $1 AND is_active = true`,
        [clan]
      );
    }

    for (const coder of coderResult.rows) {
      await notifyUser(
        coder.id,
        `Nueva actividad: ${title}`,
        `Tu TL ${tlName} publicó una nueva actividad.`,
        'assignment',
        assignmentId
      );
    }

    await notifyUser(
      tl.id,
      `Actividad Publicada`,
      `La actividad "${title}" ha sido asignada.`,
      'assignment',
      assignmentId
    );

    res.json({
      success: true,
      assignmentId,
      notified: coderResult.rows.length,
    });
  } catch (err) {
    console.error('[createAssignment]', err);
    res
      .status(500)
      .json({ error: err.message || 'Error al crear la actividad.' });
  }
}

export async function listAssignmentsTL(req, res) {
  try {
    const tl = req.user;
    const result = await query(
      `SELECT a.*, a.clan_id AS clan, m.name AS module_name
       FROM assignments a
       LEFT JOIN modules m ON a.module_id = m.id
       WHERE a.tl_id = $1 AND a.is_active = true
       ORDER BY a.created_at DESC`,
      [tl.id]
    );
    res.json({ assignments: result.rows });
  } catch (err) {
    console.error('[listAssignmentsTL]', err);
    res.status(500).json({ error: 'Error al cargar actividades.' });
  }
}

export async function deleteAssignment(req, res) {
  try {
    const tl = req.user;
    const { id } = req.params;

    const result = await query(
      `UPDATE assignments SET is_active = false WHERE id = $1 AND tl_id = $2 RETURNING id`,
      [id, tl.id]
    );

    if (!result.rows.length) {
      return res
        .status(404)
        .json({ error: 'Actividad no encontrada o sin permisos.' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[deleteAssignment]', err);
    res.status(500).json({ error: 'Error al eliminar.' });
  }
}

export async function listAssignmentsCoder(req, res) {
  try {
    const coder = req.user;
    const coderResult = await query('SELECT clan FROM users WHERE id = $1', [
      coder.id,
    ]);
    const clan = coderResult.rows[0]?.clan;

    const result = await query(
      `SELECT a.*, a.clan_id AS clan, m.name AS module_name, u.full_name AS tl_name
       FROM assignments a
       LEFT JOIN modules m ON a.module_id = m.id
       LEFT JOIN users u ON a.tl_id = u.id
       WHERE a.is_active = true
         AND (a.scope = 'all' OR (a.scope = 'clan' AND a.clan_id = $1))
       ORDER BY a.created_at DESC`,
      [clan]
    );

    res.json({ assignments: result.rows });
  } catch (err) {
    console.error('[listAssignmentsCoder]', err);
    res.status(500).json({ error: 'Error al cargar actividades.' });
  }
}

export async function getAssignmentDownload(req, res) {
  try {
    const coder = req.user;
    const { id } = req.params;

    const coderResult = await query('SELECT clan FROM users WHERE id = $1', [
      coder.id,
    ]);
    const clan = coderResult.rows[0]?.clan;

    const result = await query(
      `SELECT * FROM assignments
       WHERE id = $1 AND is_active = true
         AND (scope = 'all' OR (scope = 'clan' AND clan_id = $2))`,
      [id, clan]
    );

    if (!result.rows.length)
      return res.status(404).json({ error: 'No encontrado.' });

    const assignment = result.rows[0];
    if (!assignment.storage_path) {
      return res.status(400).json({ error: 'Esta actividad no tiene PDF.' });
    }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(assignment.storage_path, 3600);

    if (error) throw error;

    res.json({ url: data.signedUrl, fileName: assignment.file_name });
  } catch (err) {
    console.error('[getAssignmentDownload]', err);
    res.status(500).json({ error: 'Error al generar URL de descarga.' });
  }
}
