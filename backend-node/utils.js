import bcrypt from 'bcrypt';

// ── CONFIGURACIÓN ──────────────────────────────────────────────
const passwordPlana = process.argv[2] || process.env.KAIRO_HASH_PASSWORD;
const saltRounds = 10;

if (!passwordPlana) {
  console.error('❌ Debes enviar la contraseña: node utils.js "miPasswordSegura"');
  process.exit(1);
}

console.log('--------------------------------------------------');
console.log('🔐 GENERADOR DE HASH PARA KAIRO');
console.log('--------------------------------------------------');

async function generarHash() {
  try {
    const hash = await bcrypt.hash(passwordPlana, saltRounds);

    console.log(`Clave original: ${passwordPlana}`);
    console.log(`\n✅ HASH GENERADO:`);
    console.log(hash);
    console.log('\n--------------------------------------------------');
    console.log('INSTRUCCIONES:');
    console.log('1. Ve a tu tabla "users" en Supabase.');
    console.log('2. Busca al Team Leader por su email.');
    console.log('3. Pega el HASH de arriba en la columna "password".');
    console.log('4. Asegúrate de que "role" sea "tl" y "otp_verified" sea true.');
    console.log('--------------------------------------------------');
  } catch (err) {
    console.error('❌ Error al generar el hash:', err);
  }
}

generarHash();