import os
from dotenv import load_dotenv
from supabase import create_client
from groq import Groq

# Cargar variables del archivo .env
load_dotenv()

def test_services():
    print("🔍 Iniciando pruebas de conexión...")

    # --- MAPEAMOS LAS VARIABLES SEGÚN TU .ENV ---
    s_url = os.getenv("SUPABASE_URL")
    # Cambiamos aquí para que coincida con tu .env
    s_key = os.getenv("SUPABASE_SERVICE_KEY") 
    g_key = os.getenv("GROQ_API_KEY")
    # Usamos el modelo que ya definiste en tu .env
    model = os.getenv("MODEL_NAME", "llama-3.3-70b-versatile")

    # Verificación de carga
    if not all([s_url, s_key, g_key]):
        print("⚠️  Error: No se cargaron las variables. Revisa que el archivo .env no tenga espacios extra.")
        return

    # --- 1. PROBAR GROQ ---
    try:
        client_groq = Groq(api_key=g_key)
        chat_completion = client_groq.chat.completions.create(
            messages=[{"role": "user", "content": "Hola, di 'Kairo AI listo'"}],
            model=model, 
        )
        print(f"✅ Groq ({model}): {chat_completion.choices[0].message.content}")
    except Exception as e:
        print(f"❌ Error en Groq: {e}")

    # --- 2. PROBAR SUPABASE ---
    try:
        # Aquí conectamos con tu URL y tu Service Key
        supabase = create_client(s_url, s_key)
        print(f"✅ Supabase: Conectado a {s_url}")
    except Exception as e:
        print(f"❌ Error en Supabase: {e}")

if __name__ == "__main__":
    test_services()