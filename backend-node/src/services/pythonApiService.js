/**
 * backend-node/services/pythonApiService.js
 */
import { PYTHON_API_URL } from '../config/runtime.js';

const TIMEOUTS = {
  default:      30_000,
  heavy:        60_000,
  health:        3_000,
};
const HEAVY_ENDPOINTS = ['/generate-plan', '/generate-exercises'];
const HEALTH_CHECK_INTERVAL_MS = 30_000;

let _pythonHealthy = true;
let _lastHealthCheck = 0;

async function isPythonAvailable() {
  const now = Date.now();
  if (now - _lastHealthCheck < HEALTH_CHECK_INTERVAL_MS) {
    return _pythonHealthy;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUTS.health);

  try {
    const res = await fetch(`${PYTHON_API_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    _pythonHealthy = res.ok;
  } catch {
    _pythonHealthy = false;
  } finally {
    _lastHealthCheck = now;
    clearTimeout(timer);
  }

  return _pythonHealthy;
}

/**
 * POST request to Python FastAPI with timeout.
 * @param {string} endpoint  - e.g. '/generate-focus-cards'
 * @param {object} data      - request body
 */
export async function callPythonApi(endpoint, data) {
  const available = await isPythonAvailable();
  if (!available) {
    const unavailableError = new Error('Python AI service is currently unavailable');
    unavailableError.isApiError = true;
    unavailableError.statusCode = 503;
    throw unavailableError;
  }

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
      _pythonHealthy = false;
      _lastHealthCheck = 0;
      throw timeoutError;
    }
    if (error.isApiError) throw error;
    const connectionError = new Error('Unable to connect to Python AI service');
    connectionError.isApiError    = true;
    connectionError.statusCode    = 503;
    connectionError.originalError = error;
    _pythonHealthy = false;
    _lastHealthCheck = 0;
    throw connectionError;
  } finally {
    clearTimeout(timer);
  }
}

