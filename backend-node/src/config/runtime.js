import 'dotenv/config';

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const PYTHON_API_URL =
  process.env.PYTHON_API_URL || 'http://localhost:8000';
