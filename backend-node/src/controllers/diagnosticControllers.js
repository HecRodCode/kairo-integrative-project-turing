/**
 * Riwi Learning Platform - Diagnostic Controller
 * Manages soft skills assessments with strict score and style validation.
 */

import { create, findByCoderId, update, getAll } from '../models/softSkills.js';

/**
 * Handles the creation of a new soft skills assessment.
 * Renamed to 'saveDiagnostic' to match route imports.
 */
export async function saveDiagnostic(req, res) {
  try {
    const {
      autonomy,
      timeManagement,
      problemSolving,
      communication,
      teamwork,
      learningStyle,
    } = req.body;

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

    const scores = [
      autonomy,
      timeManagement,
      problemSolving,
      communication,
      teamwork,
    ];
    if (scores.some((score) => score < 1 || score > 5)) {
      return res.status(400).json({ error: 'Scores must be between 1 and 5' });
    }

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
    console.error('[Diagnostic Creation Error]:', error);
    res.status(500).json({ error: 'Failed to save diagnostic' });
  }
}

/**
 * Retrieves the diagnostic for the current user.
 * Renamed to 'getDiagnostic' to match route imports.
 */
export async function getDiagnostic(req, res) {
  try {
    // We use the session userId directly for the '/me' endpoint
    const userId = req.session.userId;
    const diagnostic = await findByCoderId(userId);

    if (!diagnostic) {
      return res.status(404).json({
        error: 'Diagnostic not found',
        message: 'You have not completed the assessment yet',
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
    console.error('[Get Diagnostic Error]:', error);
    res.status(500).json({ error: 'Failed to get diagnostic' });
  }
}

/**
 * Get all diagnostics (TL access only).
 * Maintained as 'getAllDiagnostics'.
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
    console.error('[Get All Diagnostics Error]:', error);
    res.status(500).json({ error: 'Failed to get diagnostics' });
  }
}
