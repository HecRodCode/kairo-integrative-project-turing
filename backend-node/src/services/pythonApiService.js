/**
 * backend-node/services/pythonApiService.js
 */

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

const TIMEOUTS = {
  default:      30_000,
  heavy:        60_000,
};
const HEAVY_ENDPOINTS = ['/generate-plan', '/generate-exercises'];

/**
 * POST request to Python FastAPI with timeout.
 * @param {string} endpoint  - e.g. '/generate-focus-cards'
 * @param {object} data      - request body
 */
export async function callPythonApi(endpoint, data) {
  const timeoutMs = HEAVY_ENDPOINTS.includes(endpoint)
    ? TIMEOUTS.heavy
    : TIMEOUTS.default;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${PYTHON_API_URL}${endpoint}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
      signal:  controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.detail || `Python API error: ${response.status}`);
      error.isApiError  = true;
      error.statusCode  = response.status;
      throw error;
    }

    return await response.json();

  } catch (error) {
    // Timeout
    if (error.name === 'AbortError') {
      const timeoutError = new Error(
        `Python AI service timed out after ${timeoutMs / 1000}s (${endpoint})`
      );
      timeoutError.isApiError  = true;
      timeoutError.statusCode  = 504;
      throw timeoutError;
    }
    if (error.isApiError) throw error;
    const connectionError = new Error('Unable to connect to Python AI service');
    connectionError.isApiError    = true;
    connectionError.statusCode    = 503;
    connectionError.originalError = error;
    throw connectionError;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET request to Python FastAPI with timeout.
 * Usado por: /generate-pdf/:clan
 * @param {string} endpoint  - e.g. '/generate-pdf/turing'
 */
export async function callPythonApiGet(endpoint) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUTS.default);

  try {
    const response = await fetch(`${PYTHON_API_URL}${endpoint}`, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.detail || `Python API error: ${response.status}`);
      error.isApiError = true;
      error.statusCode = response.status;
      throw error;
    }

    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error(`Python AI service timed out after ${TIMEOUTS.default / 1000}s`);
      timeoutError.isApiError = true;
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    if (error.isApiError) throw error;
    const connectionError = new Error('Unable to connect to Python AI service');
    connectionError.isApiError = true;
    connectionError.statusCode = 503;
    throw connectionError;
  } finally {
    clearTimeout(timer);
  }
}