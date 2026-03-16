/**
 * backend-node/config/mongodb.js
 */
import mongoose from 'mongoose';

let isConnected = false;

// CHECK connection status to prevent multiple instances
export async function connectMongo() {
  if (isConnected && mongoose.connection.readyState === 1)
    return mongoose.connection;

  // GET URI from environment variables
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    // WARNING: database features disabled if URI is missing
    console.warn(
      '⚠️  [MongoDB] MONGODB_URI o MONGO_URI no encontrada en .env — avatares/experiencia/educación deshabilitados.'
    );
    console.warn(
      '   → Agrega MONGODB_URI=mongodb+srv://... o MONGO_URI=mongodb+srv://... en tu archivo .env'
    );
    return null;
  }

  try {
    // ATTEMPT connection with 10s timeout
    console.log('🔄 [MongoDB] Conectando a Atlas...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      dbName: 'kairo_profiles',
    });
    // SUCCESS: database connected successfully
    isConnected = true;
    console.log(`✅ [MongoDB] Conectado — DB: ${mongoose.connection.name}`);
    return mongoose.connection;
  } catch (error) {
    // ERROR: connection failed - check IP whitelist or credentials
    isConnected = false;
    console.error(`❌ [MongoDB] Conexión fallida: ${error.message}`);
    console.error('   Causas comunes:');
    console.error('   1. IP no está en whitelist de Atlas (agrega 0.0.0.0/0)');
    console.error('   2. MONGODB_URI incorrecta o con password mal codificado');
    console.error(
      '   3. Cluster pausado en Atlas (tier gratuito se pausa solo)'
    );
    return null;
  }
}

export async function ensureMongoConnected() {
  // VERIFY current state before proceeding
  if (mongoose.connection.readyState === 1) return true;
  const conn = await connectMongo();
  // RE-ESTABLISH connection if disconnected
  return conn !== null && mongoose.connection.readyState === 1;
}
