/**
 * src/core/utils/i18n.js
 */

const resources = {
  en: {
    translation: {
      /* ── Onboarding static strings ── */
      onboarding: {
        nav_title: 'Diagnostic',
        question_word: 'Question',
        of_word: 'of',
        back: '← Back',
      },

      /* ── Nav (landing) ── */
      nav: {
        meth: 'Methodology',
        feat: 'Features',
        eco: 'Ecosystem',
        login: 'Log In',
        reg: 'Sign Up',
      },

      /* ── Hero ── */
      hero: {
        badge: 'Powered by Open-IA',
        title:
          "The future of learning is <br><span class='gradient-text'>Hyper-personalized</span>",
        text: 'Stop following generic plans. Kairo uses AI to bridge the gap between your current skills and your dream job at Riwi.',
        btn_main: 'Get my professional content',
        btn_demo: 'View Demo',
      },

      /* ── Benefits ── */
      benefits: {
        fast: 'Fast Learning',
        riwi: 'Riwi Complement',
        ai: 'AI Powered',
        paths: 'Dynamic Paths',
      },

      /* ── Methodology ── */
      meth: {
        title: 'Our Methodology',
        subtitle: 'We build your path based on real data, not assumptions.',
        card1_h: 'Diagnostic Phase',
        card1_p:
          'We evaluate your technical foundations and personality traits to understand how you learn best.',
        card2_h: 'Learning Path',
        card2_p:
          'Your curriculum changes in real-time based on your progress in Moodle and AI evaluations.',
        card3_h: 'Thinking Big',
        card3_p: "Total focus on the skills that Riwi's partner companies are looking for today.",
      },

      /* ── Features ── */
      feat: {
        title: 'Deep Skill Mapping',
        subtitle:
          "We don't just measure if you can code; we measure how well you integrate into a team.",
        list1: 'Soft Skills analysis via AI.',
        list2: 'Native synchronization with Riwi Moodle.',
        list3: 'Real-time progress dashboard.',
        skill1: 'Java Backend',
        skill2: 'Soft Skills',
        skill3: 'Communication',
      },

      /* ── Ecosystem ── */
      eco: { title: 'Learn the tools used by the industry' },

      /* ── CTA ── */
      cta: {
        title: 'Ready to accelerate your professional career?',
        p: 'Join the next generation of technical talent at Riwi.',
        btn: 'Create free account',
      },

      /* ── Auth ── */
      auth: {
        login_title: 'Welcome Back',
        login_p: 'Access your account to keep learning.',
        reg_title: 'Create Account',
        reg_p: 'Join the Riwi community today.',
        google: 'Continue with Google',
        github: 'Continue with GitHub',
        or_sep: 'O',
        or_mail: 'OR REGISTER WITH YOUR EMAIL',
        label_name: 'Full Name',
        label_mail: 'Email',
        label_pass: 'Password',
        label_confirm: 'Confirm Password',
        label_clan: 'Select your Clan',
        clan_placeholder: 'Choose clan...',
        btn_login: 'Log In',
        btn_reg: 'Sign Up',
        no_acc: "Don't have an account?",
        has_acc: 'Already have an account?',
        link_reg: 'Register Here',
        link_login: 'Log In',
        alerts: {
          register_success: 'Welcome to the {clan} clan! Account created.',
          pass_mismatch: 'Passwords do not match.',
          clan_required: 'Please select a clan.',
          conn_error: 'Connection error with the server.',
          login_success: 'Welcome back, {name}!',
          invalid_credentials: 'Invalid email or password.',
          invalid_email: 'Please enter a valid email address.',
          user_exists: 'This email address is already registered.',
        },
      },

      /* ── Footer ── */
      footer: {
        mission:
          'Empowering Riwi talent through intelligent learning paths. AI at the service of your professional growth.',
        h_platform: 'Platform',
        h_resources: 'Resources',
        h_stay: 'Stay Updated',
        doc: 'Documentation',
        support: 'Support',
        community: 'Community',
        news_p: 'Receive updates on new technical paths.',
        rights: '© 2026 Kairo Project. All rights reserved.',
        terms: 'Terms',
        privacy: 'Privacy',
      },
    },
  },

  es: {
    translation: {
      /* ── Onboarding static strings ── */
      onboarding: {
        nav_title: 'Diagnóstico',
        question_word: 'Pregunta',
        of_word: 'de',
        back: '← Atrás',
      },

      /* ── Nav (landing) ── */
      nav: {
        meth: 'Metodología',
        feat: 'Características',
        eco: 'Ecosistema',
        login: 'Iniciar Sesión',
        reg: 'Regístrate',
      },

      /* ── Hero ── */
      hero: {
        badge: 'Desarrollado con Open-IA',
        title:
          "El futuro del aprendizaje es <br><span class='gradient-text'>Hiperpersonalizado</span>",
        text: 'Deja de seguir planes genéricos. Kairo utiliza la inteligencia artificial para salvar la distancia entre tus habilidades actuales y el trabajo de tus sueños en Riwi.',
        btn_main: 'Obtener mi contenido profesional',
        btn_demo: 'Ver Demo',
      },

      /* ── Benefits ── */
      benefits: {
        fast: 'Aprendizaje rápido',
        riwi: 'Complemento de Riwi',
        ai: 'Impulsado con IA',
        paths: 'Rutas dinámicas',
      },

      /* ── Methodology ── */
      meth: {
        title: 'Nuestra Metodología',
        subtitle: 'Construimos tu camino basado en datos reales, no en suposiciones.',
        card1_h: 'Fase de diagnóstico',
        card1_p:
          'Evaluamos tus bases técnicas y rasgos de personalidad para entender cómo aprendes mejor.',
        card2_h: 'Camino de aprendizaje',
        card2_p:
          'Tu currículo cambia en tiempo real según tu progreso en Moodle y tus evaluaciones AI.',
        card3_h: 'Pensando en grande',
        card3_p:
          'Enfoque total en las habilidades que las empresas aliadas de Riwi están buscando hoy mismo.',
      },

      /* ── Features ── */
      feat: {
        title: 'Mapeo profundo de habilidades',
        subtitle:
          'No solo medimos si sabes programar, medimos qué tan bien te integras en un equipo.',
        list1: 'Análisis de Soft Skills mediante IA.',
        list2: 'Sincronización nativa con Riwi Moodle.',
        list3: 'Dashboard de progreso en tiempo real.',
        skill1: 'Java Backend',
        skill2: 'Soft Skills',
        skill3: 'Comunicación',
      },

      /* ── Ecosystem ── */
      eco: { title: 'Aprende las herramientas que usa la industria' },

      /* ── CTA ── */
      cta: {
        title: '¿Listo para acelerar tu carrera profesional?',
        p: 'Únete a la nueva generación de talento técnico en Riwi.',
        btn: 'Crear cuenta gratuita',
      },

      /* ── Auth ── */
      auth: {
        login_title: 'Bienvenido de vuelta',
        login_p: 'Accede a tu cuenta para seguir aprendiendo.',
        reg_title: 'Crear cuenta',
        reg_p: 'Únete hoy mismo a la comunidad Riwi.',
        google: 'Continua con Google',
        github: 'Continua con GitHub',
        or_sep: 'O',
        or_mail: 'O REGÍSTRATE CON TU CORREO ELECTRÓNICO',
        label_name: 'Nombre Completo',
        label_mail: 'Gmail',
        label_pass: 'Contraseña',
        label_confirm: 'Confirmar Contraseña',
        label_clan: 'Selecciona tu Clan',
        clan_placeholder: 'Escoger clan...',
        btn_login: 'Iniciar Sesión',
        btn_reg: 'Registrarse',
        no_acc: '¿No tienes una cuenta?',
        has_acc: '¿Ya tienes una cuenta?',
        link_reg: 'Regístrate Aquí',
        link_login: 'Iniciar Sesión',
        alerts: {
          register_success: '¡Bienvenido al clan {clan}! Cuenta creada.',
          pass_mismatch: 'Las contraseñas no coinciden.',
          clan_required: 'Por favor, selecciona un clan.',
          conn_error: 'Error de conexión con el servidor.',
          login_success: '¡Bienvenido de nuevo, {name}!',
          invalid_credentials: 'Correo o contraseña incorrectos.',
          invalid_email: 'Por favor, ingresa un correo electrónico válido.',
          user_exists: 'Este correo electrónico ya está registrado.',
        },
      },

      /* ── Footer ── */
      footer: {
        mission:
          'Potenciamos el talento de Riwi mediante rutas de aprendizaje inteligentes. La IA al servicio de tu crecimiento profesional.',
        h_platform: 'Plataforma',
        h_resources: 'Recursos',
        h_stay: 'Mantente al tanto',
        doc: 'Documentación',
        support: 'Soporte',
        community: 'Comunidad',
        news_p: 'Recibe actualizaciones sobre nuevas rutas técnicas.',
        rights: '© 2026 Kairo Project. Todos los derechos reservados.',
        terms: 'Términos',
        privacy: 'Privacidad',
      },
    },
  },
};

/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */
const savedLang = localStorage.getItem('kairo-lang') || 'es';
document.documentElement.lang = savedLang;

i18next.init({ lng: savedLang, resources }, (err) => {
  if (err) console.error('[i18n] init error:', err);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _applyTranslations);
  } else {
    _applyTranslations();
  }
});

/* ════════════════════════════════════════
   FUNCIONES
════════════════════════════════════════ */
function _applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const translation = i18next.t(key);
    if (el.tagName === 'INPUT') {
      el.placeholder = translation;
    } else {
      el.innerHTML = translation;
    }
  });

  const langLabel = document.getElementById('lang-label');
  if (langLabel) langLabel.textContent = i18next.language.toUpperCase();
}

function _dispatchLangChange() {
  window.dispatchEvent(new CustomEvent('kairo:langchange'));
}

document.addEventListener('DOMContentLoaded', () => {
  const langBtn = document.getElementById('language-toggle');
  if (!langBtn) return;

  langBtn.addEventListener('click', () => {
    const next = i18next.language === 'es' ? 'en' : 'es';
    i18next.changeLanguage(next, () => {
      localStorage.setItem('kairo-lang', next);
      document.documentElement.lang = next;
      _applyTranslations();
      _dispatchLangChange();
    });
  });
});

/* Expone t() globalmente */
window.i18nT = (key) => i18next.t(key);
