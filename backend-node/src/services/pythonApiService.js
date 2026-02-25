/**
 * Service to communicate with Python FastAPI microservice
 * Handles network errors and status validation
 */

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

export async function callPythonApi(endpoint, data) {
  try {
    const response = await fetch(`${PYTHON_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(
        errorData.detail || `Python API error: ${response.status}`
      );
      error.isApiError = true;
      error.statusCode = response.status;
      throw error;
    }

    return await response.json();
  } catch (error) {
    if (error.isApiError) throw error;

    const connectionError = new Error('Unable to connect to Python AI service');
    connectionError.isApiError = true;
    connectionError.originalError = error;
    throw connectionError;
  }
}