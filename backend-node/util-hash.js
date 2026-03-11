import bcrypt from 'bcrypt';

// ── CONFIGURACIÓN ──────────────────────────────────────────────
const passwordPlana = '123Antony'; // <--- CAMBIA ESTO por la clave que quieras
const saltRounds = 10;

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
    console.log(
      '4. Asegúrate de que "role" sea "tl" y "otp_verified" sea true.'
    );
    console.log('--------------------------------------------------');
  } catch (err) {
    console.error('❌ Error al generar el hash:', err);
  }
}

generarHash();
