import { create, findByCoderId, update, getAll } from '../models/softSkills.js';

/**
 * Create or update soft skills assessment
 */
export async function createDiagnostic(req, res) {
  try {
    const {
      autonomy,
      timeManagement,
      problemSolving,
      communication,
      teamwork,
      learningStyle,
    } = req.body;

    // Validation
    if (
      !autonomy ||
      !timeManagement ||
      !problemSolving ||
      !communication ||
      !teamwork ||
      !learningStyle
    ) {
      return res.status(400).json({
        error: 'All fields are required',
        fields: [
          'autonomy',
          'timeManagement',
          'problemSolving',
          'communication',
          'teamwork',
          'learningStyle',
        ],
      });
    }

    // Validate scores (1-5)
    const scores = [
      autonomy,
      timeManagement,
      problemSolving,
      communication,
      teamwork,
    ];
    if (scores.some((score) => score < 1 || score > 5)) {
      return res.status(400).json({
        error: 'Scores must be between 1 and 5',
      });
    }

    // Validate learning style
    const validStyles = ['visual', 'auditory', 'kinesthetic', 'mixed'];
    if (!validStyles.includes(learningStyle)) {
      return res.status(400).json({
        error: 'Invalid learning style',
        validOptions: validStyles,
      });
    }

    const diagnostic = await create({
      coderId: req.session.userId,
      autonomy,
      timeManagement,
      problemSolving,
      communication,
      teamwork,
      learningStyle,
    });

    res.status(201).json({
      message: 'Diagnostic saved successfully',
      diagnostic: {
        coderId: diagnostic.coder_id,
        autonomy: diagnostic.autonomy,
        timeManagement: diagnostic.time_management,
        problemSolving: diagnostic.problem_solving,
        communication: diagnostic.communication,
        teamwork: diagnostic.teamwork,
        learningStyle: diagnostic.learning_style,
        assessedAt: diagnostic.assessed_at,
      },
    });
  } catch (error) {
    console.error('Create diagnostic error:', error);
    res.status(500).json({ error: 'Failed to save diagnostic' });
  }
}

/**
 * Get diagnostic by coder ID
 */
export async function getDiagnosticByCoderId(req, res) {
  try {
    const { coderId } = req.params;

    // Check permission: only the coder themselves or TL can access
    if (req.session.userId !== parseInt(coderId) && req.session.role !== 'tl') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access your own diagnostic',
      });
    }

    const diagnostic = await findByCoderId(coderId);

    if (!diagnostic) {
      return res.status(404).json({
        error: 'Diagnostic not found',
        message: 'This coder has not completed the assessment yet',
      });
    }

    res.json({
      diagnostic: {
        coderId: diagnostic.coder_id,
        autonomy: diagnostic.autonomy,
        timeManagement: diagnostic.time_management,
        problemSolving: diagnostic.problem_solving,
        communication: diagnostic.communication,
        teamwork: diagnostic.teamwork,
        learningStyle: diagnostic.learning_style,
        assessedAt: diagnostic.assessed_at,
      },
    });
  } catch (error) {
    console.error('Get diagnostic error:', error);
    res.status(500).json({ error: 'Failed to get diagnostic' });
  }
}

/**
 * Update diagnostic
 */
export async function updateDiagnostic(req, res) {
  try {
    const { coderId } = req.params;
    const updates = req.body;

    // Check permission: only the coder themselves can update
    if (req.session.userId !== parseInt(coderId)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own diagnostic',
      });
    }

    // Check if diagnostic exists
    const existing = await findByCoderId(coderId);
    if (!existing) {
      return res.status(404).json({ error: 'Diagnostic not found' });
    }

    // Map camelCase to snake_case
    const mappedUpdates = {};
    if (updates.autonomy !== undefined)
      mappedUpdates.autonomy = updates.autonomy;
    if (updates.timeManagement !== undefined)
      mappedUpdates.time_management = updates.timeManagement;
    if (updates.problemSolving !== undefined)
      mappedUpdates.problem_solving = updates.problemSolving;
    if (updates.communication !== undefined)
      mappedUpdates.communication = updates.communication;
    if (updates.teamwork !== undefined)
      mappedUpdates.teamwork = updates.teamwork;
    if (updates.learningStyle !== undefined)
      mappedUpdates.learning_style = updates.learningStyle;

    const updated = await update(coderId, mappedUpdates);

    res.json({
      message: 'Diagnostic updated successfully',
      diagnostic: {
        coderId: updated.coder_id,
        autonomy: updated.autonomy,
        timeManagement: updated.time_management,
        problemSolving: updated.problem_solving,
        communication: updated.communication,
        teamwork: updated.teamwork,
        learningStyle: updated.learning_style,
        assessedAt: updated.assessed_at,
      },
    });
  } catch (error) {
    console.error('Update diagnostic error:', error);
    res.status(500).json({ error: 'Failed to update diagnostic' });
  }
}

/**
 * Get all diagnostics (only for TL)
 */
export async function getAllDiagnostics(req, res) {
  try {
    const diagnostics = await getAll();

    res.json({
      diagnostics: diagnostics.map((d) => ({
        coderId: d.coder_id,
        coderEmail: d.email,
        coderName: d.full_name,
        autonomy: d.autonomy,
        timeManagement: d.time_management,
        problemSolving: d.problem_solving,
        communication: d.communication,
        teamwork: d.teamwork,
        learningStyle: d.learning_style,
        assessedAt: d.assessed_at,
      })),
      total: diagnostics.length,
    });
  } catch (error) {
    console.error('Get all diagnostics error:', error);
    res.status(500).json({ error: 'Failed to get diagnostics' });
  }
}
