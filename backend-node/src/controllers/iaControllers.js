import { callPythonApi } from '../services/pythonApiService.js';
import { findById } from '../models/user.js';
import { findByCoderId } from '../models/softSkills.js';

/**
 * Generate personalized learning plan using Python/IA
 */
export async function generatePlan(req, res) {
  try {
    const {
      moduleNumber,
      currentWeek,
      strugglingTopics,
      additionalTopics,
      moodleProgress,
    } = req.body;

    // Validation
    if (!moduleNumber || !currentWeek) {
      return res.status(400).json({
        error: 'Module number and current week are required',
        fields: ['moduleNumber', 'currentWeek'],
      });
    }

    // Get user data
    const user = await findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get soft skills diagnostic
    const diagnostic = await findByCoderId(req.session.userId);
    if (!diagnostic) {
      return res.status(400).json({
        error: 'Diagnostic not completed',
        message:
          'Please complete the soft skills assessment before generating a plan',
      });
    }

    // Prepare data for Python API
    const requestData = {
      coder: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
      },
      softSkills: {
        autonomy: diagnostic.autonomy,
        timeManagement: diagnostic.time_management,
        problemSolving: diagnostic.problem_solving,
        communication: diagnostic.communication,
        teamwork: diagnostic.teamwork,
        learningStyle: diagnostic.learning_style,
      },
      moodleStatus: {
        moduleNumber,
        currentWeek,
        strugglingTopics: strugglingTopics || [],
        moodleProgress: moodleProgress || {},
      },
      additionalTopics: additionalTopics || [],
    };

    // Call Python API
    const aiResponse = await callPythonApi('/generate-plan', requestData);

    res.json({
      message: 'Plan generated successfully',
      plan: aiResponse.plan,
      metadata: {
        generatedAt: new Date().toISOString(),
        coderId: user.id,
        moduleNumber,
        currentWeek,
      },
    });
  } catch (error) {
    console.error('Generate plan error:', error);

    // Check if it's a Python API error
    if (error.isApiError) {
      return res.status(503).json({
        error: 'AI service unavailable',
        message:
          'The AI service is currently unavailable. Please try again later.',
        details: error.message,
      });
    }

    res.status(500).json({ error: 'Failed to generate plan' });
  }
}

/**
 * Health check for Python API connection
 */
export async function checkAiHealth(req, res) {
  try {
    const health = await callPythonApi('/health', {});

    res.json({
      status: 'ok',
      message: 'Python AI service is reachable',
      pythonService: health,
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Python AI service is unreachable',
      error: error.message,
    });
  }
}
