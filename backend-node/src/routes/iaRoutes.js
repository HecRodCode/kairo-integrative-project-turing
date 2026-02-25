import { Router } from 'express';
import { callPythonApi } from '../services/pythonApiService.js';
import { isAuthenticated, hasRole } from '../middlewares/authMiddlewares.js';

const router = Router();

/**
 * @route   POST /api/ia/generate-plan
 * @desc    Get 6 prioritized cards (2 High, 2 Medium, 2 Low) from Python AI
 * @access  Private (Coder only)
 */
router.post('/generate-plan', isAuthenticated, hasRole('coder'), async (req, res) => {
    try {
        const { id, full_name } = req.user; 
        const payload = {
            coder_id: id,
            coder_name: full_name,
            module_id: 1, 
            struggling_topics: ["Async", "Promises"] 
        };

        const aiResponse = await callPythonApi('/generate-focus-cards', payload);

        res.status(200).json({
            success: true,
            message: "AI Training Plan generated successfully",
            data: aiResponse
        });

    } catch (error) {
        console.error("IA Route Error:", error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/ia/health
 * @desc    Check if Python FastAPI is alive
 */
router.get('/health', async (req, res) => {
    try {
        const health = await callPythonApi('/health', {});
        res.json({ node_status: "online", python_status: health });
    } catch (error) {
        res.status(500).json({ 
            node_status: "online", 
            python_status: "offline",
            details: error.message 
        });
    }
});

export default router;
