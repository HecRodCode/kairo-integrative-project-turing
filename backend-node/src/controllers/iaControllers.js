/**
 * backend-node/controllers/iaControllers.js
 *
 * Slim Communication Architecture:
 * Node.js is a thin orchestrator — it only sends IDs + dynamic context.
 * Python owns all data retrieval from Supabase.
 *
 * Payload to Python:
 * {
 *   coder_id:         int,
 *   module_id:        int,
 *   topic:            string,
 *   struggling_topics: string[],
 *   additional_topics: string[]
 * }
 */

import { supabase } from '../config/supabase.js';
import { callPythonApi } from '../services/pythonApiService.js';

// ════════════════════════════════════════
// GENERATE PLAN
// POST /api/ia/generate-plan
// ════════════════════════════════════════

export const generatePlan = async (req, res) => {
  const user = req.user;

  try {
    // Node only needs to know which module the coder is in
    // Python will fetch everything else (soft skills, module details, weeks)
    const { data: moodleProgress } = await supabase
      .from('moodle_progress')
      .select('module_id, current_week, struggling_topics')
      .eq('coder_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    const moduleId = moodleProgress?.module_id ?? 1;
    const currentWeek = moodleProgress?.current_week ?? 1;

    // Resolve struggling topic IDs → names (Node knows the DB, Python will re-fetch anyway)
    let strugglingNames = [];
    if (moodleProgress?.struggling_topics?.length) {
      const { data: topics } = await supabase
        .from('topics')
        .select('name')
        .in('id', moodleProgress.struggling_topics);
      strugglingNames = topics?.map((t) => t.name) ?? [];
    }

    // Dynamic topic label from request body (optional)
    const topic = req.body.topic ?? `Módulo ${moduleId} — Semana ${currentWeek}`;
    const additionalTopics = req.body.additionalTopics ?? [];

    // ── Slim payload ─────────────────────────────────────────
    const payload = {
      coder_id: user.id,
      module_id: moduleId,
      topic,
      struggling_topics: strugglingNames,
      additional_topics: additionalTopics,
    };

    const aiResponse = await callPythonApi('/generate-plan', payload);

    // Log on Node side (Python also logs internally)
    await supabase
      .from('ai_generation_log')
      .insert({
        coder_id: user.id,
        agent_type: 'plan_generator',
        input_payload: payload,
        output_payload: { plan_id: aiResponse.metadata?.plan_id ?? null },
        model_name: 'gpt-4o-mini',
        success: aiResponse.success ?? true,
      })
      .catch(() => {}); // non-blocking

    return res.status(200).json({
      success: true,
      plan: aiResponse.plan,
      metadata: aiResponse.metadata,
    });
  } catch (error) {
    console.error('[iaController] generatePlan:', error.message);
    if (error.isApiError) {
      return res.status(502).json({ error: 'AI service unavailable', message: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ════════════════════════════════════════
// GENERATE FOCUS CARDS
// POST /api/ia/generate-focus-cards
// ════════════════════════════════════════

export const generateFocusCards = async (req, res) => {
  const user = req.user;

  try {
    const { data: moodleProgress } = await supabase
      .from('moodle_progress')
      .select('module_id, struggling_topics')
      .eq('coder_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    const moduleId = moodleProgress?.module_id ?? 1;

    let strugglingNames = [];
    if (moodleProgress?.struggling_topics?.length) {
      const { data: topics } = await supabase
        .from('topics')
        .select('name')
        .in('id', moodleProgress.struggling_topics);
      strugglingNames = topics?.map((t) => t.name) ?? [];
    }

    const payload = {
      coder_id: user.id,
      module_id: moduleId,
      struggling_topics: strugglingNames,
    };

    const aiResponse = await callPythonApi('/generate-focus-cards', payload);

    return res.status(200).json({ success: true, data: aiResponse.data });
  } catch (error) {
    console.error('[iaController] generateFocusCards:', error.message);
    return res.status(error.isApiError ? 502 : 500).json({ error: error.message });
  }
};

// ════════════════════════════════════════
// GENERATE TL REPORT
// POST /api/ia/generate-report
// ════════════════════════════════════════

export const generateReport = async (req, res) => {
  const user = req.user;

  try {
    const { data: tlUser } = await supabase.from('users').select('clan').eq('id', user.id).single();

    if (!tlUser?.clan) {
      return res.status(400).json({ error: 'TL has no clan assigned' });
    }

    const clan = tlUser.clan;

    const { data: coders } = await supabase
      .from('users')
      .select('id')
      .eq('clan', clan)
      .eq('role', 'coder');
    const coderIds = coders?.map((c) => c.id) ?? [];

    const { data: moodleData } = await supabase
      .from('moodle_progress')
      .select('average_score')
      .in('coder_id', coderIds);
    const scores = moodleData?.map((m) => m.average_score) ?? [];
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const { data: risks } = await supabase
      .from('risk_flags')
      .select('id')
      .in('coder_id', coderIds)
      .in('risk_level', ['high', 'critical'])
      .eq('resolved', false);

    const payload = {
      clan,
      tl_id: user.id,
      total_coders: coderIds.length,
      average_score: avgScore,
      high_risk_count: risks?.length ?? 0,
    };

    const aiResponse = await callPythonApi('/generate-report', payload);

    return res.status(200).json({ success: true, report: aiResponse.report });
  } catch (error) {
    console.error('[iaController] generateReport:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ════════════════════════════════════════
// HEALTH CHECK
// GET /api/ia/health
// ════════════════════════════════════════

export const checkAiHealth = async (req, res) => {
  try {
    const response = await fetch(`${process.env.PYTHON_API_URL || 'http://localhost:8000'}/health`);
    const data = await response.json();
    return res.status(200).json({ node: 'ok', python: data });
  } catch (error) {
    return res.status(503).json({ node: 'ok', python: 'unreachable', error: error.message });
  }
};
