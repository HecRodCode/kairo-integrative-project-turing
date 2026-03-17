/**
 * src/core/utils/i18n.js
 */

const resources = {
  en: {
    translation: {
      onboarding: {
        nav_title: 'Diagnostic',
        question_word: 'Question',
        of_word: 'of',
        back: '← Back',
      },
      nav: {
        meth: 'Methodology',
        feat: 'Features',
        eco: 'Ecosystem',
        login: 'Log In',
        reg: 'Sign Up',
      },
      hero: {
        badge: 'Powered by Kairo AI-Trainer',
        title:
          "The future of learning is <br><span class='gradient-text'>Hyper-personalized</span>",
        text: 'Stop following generic plans. Kairo uses AI to bridge the gap between your current skills and your dream job at Riwi.',
        btn_main: 'Get my professional content',
        btn_demo: 'View Demo',
      },
      benefits: {
        fast: 'Fast Learning',
        riwi: 'Riwi Complement',
        ai: 'AI Powered',
        paths: 'Dynamic Paths',
      },
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
        card3_p:
          "Total focus on the skills that Riwi's partner companies are looking for today.",
      },
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
      eco: { title: 'Learn the tools used by the industry' },
      cta: {
        title: 'Ready to accelerate your professional career?',
        p: 'Join the next generation of technical talent at Riwi.',
        btn: 'Create free account',
      },
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
        back_landing: '← Back to home',
        // OTP
        otp_title: 'Verify your email',
        otp_p: 'We sent a 6-digit code to',
        no_arrive: "Didn't receive it?",
        resend_code: 'Resend',
        btn_verify: 'Verify code',
        back_register: 'Back to register',
        alerts: {
          register_success: 'Welcome to the {clan} clan! Account created.',
          pass_mismatch: 'Passwords do not match.',
          clan_required: 'Please select a clan.',
          conn_error: 'Connection error with the server.',
          login_success: 'Welcome back, {name}!',
          invalid_credentials: 'Invalid email or password.',
          invalid_email: 'Please enter a valid email address.',
          user_exists: 'This email address is already registered.',
          required_fields: 'Please fill in all required fields.',
          weak_password: 'Password is too weak.',
          verify_email_first: 'Please verify your email first.',
          email_exists:
            'This email is already registered. Redirecting to verification...',
        },
      },
      dashboard: {
        loading: 'Loading your dashboard…',
        nav_dashboard: 'Dashboard',
        nav_trainer: 'AI Trainer',
        nav_activities: 'Activities',
        nav_profile: 'Profile',
        nav_logout: 'Logout',
        notif_title: 'Notifications',
        notif_empty: 'No new notifications',
        err_server: 'Could not connect to the server',
        err_server_sub: 'Make sure the backend is running.',
        err_retry: 'Retry',
        welcome_greeting: 'Welcome back,',
        cohort_badge: 'Cohort 6',
        plan_badge: 'Active plan',
        risk_msg: 'You have an active flag',
        stat_module: 'Current module',
        stat_week: 'Current week',
        stat_score: 'Moodle score',
        stat_weeks_done: 'Completed weeks',
        stat_kairo: 'Kairo Score',
        card_progress: 'Module progress',
        progress_start: 'Start',
        progress_end: 'End of module',
        card_perf: 'Performance tests',
        perf_empty: 'No tests registered yet.',
        card_feedback: 'Latest TL comments',
        feedback_empty: 'No feedback received yet.',
        skill_profile: 'Your skills profile',
        ring_caption: 'Soft skills average',
        style_title: 'Learning style',
        card_skills: 'Soft skills',
        skills_meta: 'Initial diagnosis',
        card_struggling: 'Topics with difficulty',
        struggling_meta: 'This week',
      },
      activities: {
        loading: 'Loading activities…',
        page_title: 'Activities',
        section_title: 'My activities',
        err_load: 'Could not load activities',
        err_sub: 'Make sure the backend is running.',
        retry: 'Retry',
        filter_all: 'All',
        filter_pending: 'Pending',
        filter_overdue: 'Overdue',
        empty_title: 'No activities yet',
        empty_sub: "Your TL hasn't published any activities for your clan.",
      },
      trainer: {
        loading: 'Loading AI Trainer',
        page_title: 'AI Trainer',
        notif_title: 'Notifications',
        notif_empty: 'No new notifications',
        gen_title: 'Kairo is preparing your plan',
        gen_sub:
          'The AI is analyzing your learning profile and building a personalized path for you. This takes a few seconds.',
        gen_label: 'Analyzing your diagnosis...',
        noplan_title: "You don't have an active plan yet",
        noplan_sub:
          'Kairo will generate a personalized plan based on your learning style and initial diagnosis results.',
        btn_request: 'Generate my personalized plan',
        stat_completed: 'days completed',
        stat_total: 'total days',
        btn_prev: 'Previous day',
        btn_next: 'Next day',
        badge_tech: 'Technical',
        btn_exercise: 'Exercise of the day',
        btn_complete: 'Completed',
        badge_soft: 'Soft skill',
        reflection_label: 'Reflection when done',
        resources_label: 'Resources',
        tl_resources_title: 'TL resources for this topic',
        tl_searching: 'Searching...',
        tl_empty: "Your TL hasn't uploaded resources for this topic yet.",
        perf_day_title: 'Performance Test Simulation Day',
        perf_day_sub:
          'This is the last day of your plan. Complete the simulation under real conditions: no help, limited time.',
        day_done: '🎉 Day completed! Keep going with the next day.',
        plan_done_title: 'You completed the plan!',
        plan_done_sub:
          'You finished all 20 days. Your next plan will be generated automatically on Monday.',
        modal_loading: 'Generating personalized exercise',
        hint_label: 'Hint',
        hint_prev: '‹ Previous',
        hint_next: 'Next ›',
        editor_label: 'Your solution',
        btn_reset: 'Reset',
        expected_label: 'Expected output',
        solution_label: 'Reference solution',
        btn_submit: 'Submit solution',
        submit_note: 'Your TL will be able to review your submitted code.',
      },
      tl: {
        nav_dashboard: 'Dashboard',
        nav_activities: 'Activities',
        nav_groups: 'Groups',
        nav_logout: 'Logout',
        notif_title: 'Notifications',
        notif_empty: 'No new notifications',
        err_server: 'Could not connect to the server',
        err_server_sub: 'Make sure the backend is running on localhost:3000',
        err_retry: 'Retry',
        risk_badge: 'at risk',
        stat_total: 'Coders in the clan',
        stat_done: 'Onboarding complete',
        stat_pending: 'Pending',
        stat_risk: 'At risk',
        stat_score: 'Average score',
        card_skills: 'Clan soft skills',
        skills_meta: 'Average 1–5',
        card_styles: 'Learning styles',
        styles_meta: 'Clan distribution',
        card_coders: 'Clan Coders',
        filter_all: 'All',
        filter_risk: 'At risk',
        filter_pending: 'Pending',
        tbl_name: 'Name',
        tbl_score: 'Score',
        tbl_week: 'Week',
        tbl_style: 'Style',
        tbl_status: 'Status',
        tbl_empty: 'No coders to show with this filter',
        detail_placeholder: 'Select a coder\nto see their details',
        meta_email: 'Email',
        meta_week: 'Week',
        meta_score: 'Score',
        meta_style: 'Style',
        feedback_label: 'Give feedback',
        fb_placeholder: 'Select feedback type...',
        fb_encouragement: 'Encouragement',
        fb_improvement: 'Improvement area',
        fb_achievement: 'Outstanding achievement',
        fb_warning: 'Warning',
        fb_input_placeholder: 'Write your comment...',
        btn_send: 'Send',
        btn_pdf: 'PDF',
        submissions_title: 'Exercises submitted by the clan',
        submissions_empty: 'No coders have submitted exercises yet.',
        rm_expected_label: 'Expected output',
        rm_pts_hint: 'The coder will receive +15 pts',
        rm_btn_send: 'Send feedback',
        rm_fb_placeholder:
          'Write your feedback... What did they do well? What can be improved?',
        rm_reviewed_label: 'Feedback sent',
        asgn_title: 'Activities',
        asgn_section: 'Published works and resources',
        btn_rag: 'Upload RAG resource',
        btn_add: 'Add assignment',
        legend_pdf: 'PDF Activity',
        legend_repo: 'Repository',
        legend_resource: 'RAG Resource',
        asgn_empty_title: 'No content published',
        asgn_empty_sub:
          'Use Add assignment to assign activities or Upload RAG resource for study materials.',
        modal_add_title: 'Add assignment',
        form_title: 'Title *',
        form_title_ph: 'e.g. PostgreSQL JOINs Workshop',
        form_module: 'Module',
        form_deadline: 'Deadline',
        form_scope: 'Who is this activity for?',
        scope_clan_title: 'My clan only',
        scope_clan_sub: 'The coders in your clan',
        scope_all_title: 'All coders',
        scope_all_sub: 'All Riwi clans',
        form_type: 'Content type',
        drop_title: 'Click or drag PDF here',
        drop_sub: 'Max 20 MB · PDF only',
        form_repo_url: 'Repository URL *',
        form_repo_ph: 'https://github.com/user/repo',
        btn_publish: 'Publish activity',
        publish_note: 'Coders will be notified automatically.',
        rag_title: 'Upload RAG resource',
        rag_res_title: 'Resource title *',
        rag_res_ph: 'e.g. PostgreSQL JOINs Guide',
        btn_upload: 'Upload PDF',
        upload_note: 'Embedding is processed in the background (~10s).',
        confirm_title: 'Are you sure?',
        confirm_text: 'This action cannot be undone.',
        btn_cancel: 'Cancel',
        btn_accept: 'Accept',
        groups_title: 'Groups',
        groups_sub: 'Manage coders by clan',
        btn_random: 'Random groups',
        btn_manual: 'Manual groups',
        btn_level: 'Group by level',
        groups_hint: 'Select a mode to group coders.',
      },
      dynamic: {
        skill_autonomy: 'Autonomy',
        skill_timeManagement: 'Time management',
        skill_problemSolving: 'Problem solving',
        skill_communication: 'Communication',
        skill_teamwork: 'Teamwork',
        skill_weakest: 'Weakest',
        style_visual:
          'You learn best with diagrams, videos and visual elements.',
        style_kinesthetic:
          'You learn best by building and practicing with real code.',
        style_reading:
          'You learn best by reading documentation and writing notes.',
        style_auditory:
          'You learn best by listening and explaining concepts out loud.',
        style_mixed:
          'Your learning is versatile — you combine multiple approaches.',
        perf_approved: 'Approved',
        perf_failed: 'Failed',
        perf_pending: 'Pending',
        perf_reeval: 'Re-eval',
        fb_encouragement: 'Encouragement',
        fb_improvement: 'Improvement area',
        fb_achievement: 'Outstanding achievement',
        fb_warning: 'Warning',
        fb_general: 'Feedback',
        fb_weekly: 'Weekly',
        fb_activity: 'Activity',
        mark_read: 'Mark as read',
        from_tl: 'From:',
        default_tl: 'Your TL',
        diag_date: 'Initial diagnosis results ·',
        no_module: 'No module data',
        no_onboarding: 'Complete onboarding to see your soft skills.',
        pct_done: '% completed',
        week_label: 'Week',
        week_of: 'of',
        risk_default: 'Active risk flag',
        loading_err: 'Could not connect to the server.',
        tl_no_skills: 'No soft skills data available.',
        tl_no_data: 'No data',
        tl_no_diagnosis: 'No diagnosis',
        tl_week: 'Week',
        tl_sem: 'Wk.',
        tl_pts: 'pts',
        tl_risk: 'Risk',
        tl_pending: 'Pending',
        tl_active: 'Active',
        tl_submissions_count: 'submissions',
        tl_unreviewed: 'unreviewed',
        tl_reviewed: 'Reviewed',
        tl_day: 'Day',
        tl_send_err: 'Select type and write a message.',
        tl_feedback_ok: 'Feedback sent successfully.',
        tl_feedback_err: 'Error sending feedback.',
        tl_review_ok: 'Feedback sent. Coder earned +15 points.',
        tl_review_err: 'Error sending feedback.',
        tl_review_code: 'Review code',
        tl_sending: 'Sending...',
        tl_no_rank: 'No data yet',
        tl_clan_rank: 'Clan Ranking',
        tl_global_rank: 'Global Ranking',
        tl_all_clans: 'All clans',
        tl_generated: 'Generated:',
        style_visual_short: 'Visual',
        style_auditory_short: 'Auditory',
        style_kinesthetic_short: 'Kinesthetic',
        style_read_write_short: 'Read/Write',
        style_mixed_short: 'Mixed',
        style_other_short: 'No diagnosis',
        skill_autonomy_short: 'Autonomy',
        skill_time_management_short: 'Time mgmt.',
        skill_problem_solving_short: 'Problem solving',
        skill_communication_short: 'Communication',
        skill_teamwork_short: 'Teamwork',
      },
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
      onboarding: {
        nav_title: 'Diagnóstico',
        question_word: 'Pregunta',
        of_word: 'de',
        back: '← Atrás',
      },
      nav: {
        meth: 'Metodología',
        feat: 'Características',
        eco: 'Ecosistema',
        login: 'Iniciar Sesión',
        reg: 'Regístrate',
      },
      hero: {
        badge: 'Desarrollado con Kairo IA-Trainer',
        title:
          "El futuro del aprendizaje es <br><span class='gradient-text'>Hiperpersonalizado</span>",
        text: 'Deja de seguir planes genéricos. Kairo utiliza la inteligencia artificial para salvar la distancia entre tus habilidades actuales y el trabajo de tus sueños en Riwi.',
        btn_main: 'Obtener mi contenido profesional',
        btn_demo: 'Ver Demo',
      },
      benefits: {
        fast: 'Aprendizaje rápido',
        riwi: 'Complemento de Riwi',
        ai: 'Impulsado con IA',
        paths: 'Rutas dinámicas',
      },
      meth: {
        title: 'Nuestra Metodología',
        subtitle:
          'Construimos tu camino basado en datos reales, no en suposiciones.',
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
      eco: { title: 'Aprende las herramientas que usa la industria' },
      cta: {
        title: '¿Listo para acelerar tu carrera profesional?',
        p: 'Únete a la nueva generación de talento técnico en Riwi.',
        btn: 'Crear cuenta gratuita',
      },
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
        back_landing: '← Volver al inicio',
        // OTP
        otp_title: 'Verifica tu correo',
        otp_p: 'Enviamos un código de 6 dígitos a',
        no_arrive: '¿No llegó?',
        resend_code: 'Reenviar',
        btn_verify: 'Verificar código',
        back_register: 'Volver al registro',
        alerts: {
          register_success: '¡Bienvenido al clan {clan}! Cuenta creada.',
          pass_mismatch: 'Las contraseñas no coinciden.',
          clan_required: 'Por favor, selecciona un clan.',
          conn_error: 'Error de conexión con el servidor.',
          login_success: '¡Bienvenido de nuevo, {name}!',
          invalid_credentials: 'Correo o contraseña incorrectos.',
          invalid_email: 'Por favor, ingresa un correo electrónico válido.',
          user_exists: 'Este correo electrónico ya está registrado.',
          required_fields: 'Por favor, completa todos los campos requeridos.',
          weak_password: 'La contraseña es muy débil.',
          verify_email_first: 'Por favor, verifica tu correo primero.',
          email_exists:
            'Este correo ya está registrado. Redirigiendo a verificación...',
        },
      },
      dashboard: {
        loading: 'Cargando tu dashboard…',
        nav_dashboard: 'Dashboard',
        nav_trainer: 'AI Trainer',
        nav_activities: 'Actividades',
        nav_profile: 'Perfil',
        nav_logout: 'Logout',
        notif_title: 'Notificaciones',
        notif_empty: 'Sin notificaciones nuevas',
        err_server: 'No se pudo conectar con el servidor',
        err_server_sub: 'Verifica que el backend esté corriendo.',
        err_retry: 'Reintentar',
        welcome_greeting: 'Bienvenido de vuelta,',
        cohort_badge: 'Cohorte 6',
        plan_badge: 'Plan activo',
        risk_msg: 'Tienes un flag activo',
        stat_module: 'Módulo actual',
        stat_week: 'Semana en curso',
        stat_score: 'Score en Moodle',
        stat_weeks_done: 'Semanas completadas',
        stat_kairo: 'Kairo Score',
        card_progress: 'Progreso en el módulo',
        progress_start: 'Inicio',
        progress_end: 'Fin del módulo',
        card_perf: 'Pruebas de desempeño',
        perf_empty: 'Sin pruebas registradas aún.',
        card_feedback: 'Últimos comentarios de tu TL',
        feedback_empty: 'Sin feedback recibido aún.',
        skill_profile: 'Tu perfil de habilidades',
        ring_caption: 'Promedio habilidades blandas',
        style_title: 'Estilo de aprendizaje',
        card_skills: 'Habilidades blandas',
        skills_meta: 'Diagnóstico inicial',
        card_struggling: 'Temas con dificultades',
        struggling_meta: 'Esta semana',
      },
      activities: {
        loading: 'Cargando actividades…',
        page_title: 'Actividades',
        section_title: 'Mis actividades',
        err_load: 'No se pudo cargar las actividades',
        err_sub: 'Verifica que el backend esté corriendo.',
        retry: 'Reintentar',
        filter_all: 'Todas',
        filter_pending: 'Pendientes',
        filter_overdue: 'Vencidas',
        empty_title: 'Sin actividades por ahora',
        empty_sub: 'Tu TL aún no ha publicado actividades para tu clan.',
      },
      trainer: {
        loading: 'Cargando AI Trainer',
        page_title: 'AI Trainer',
        notif_title: 'Notificaciones',
        notif_empty: 'Sin notificaciones nuevas',
        gen_title: 'Kairo está preparando tu plan',
        gen_sub:
          'La IA está analizando tu perfil de aprendizaje y construyendo un camino personalizado para ti. Esto toma unos segundos.',
        gen_label: 'Analizando tu diagnóstico...',
        noplan_title: 'Aún no tienes un plan activo',
        noplan_sub:
          'Kairo generará un plan personalizado basado en tu estilo de aprendizaje y tus resultados del diagnóstico inicial.',
        btn_request: 'Generar mi plan personalizado',
        stat_completed: 'días completados',
        stat_total: 'días totales',
        btn_prev: 'Día anterior',
        btn_next: 'Día siguiente',
        badge_tech: 'Técnica',
        btn_exercise: 'Ejercicio del día',
        btn_complete: 'Completado',
        badge_soft: 'Habilidad blanda',
        reflection_label: 'Reflexión al terminar',
        resources_label: 'Recursos',
        tl_resources_title: 'Recursos del TL para este tema',
        tl_searching: 'Buscando...',
        tl_empty: 'Tu TL aún no ha subido recursos para este tema.',
        perf_day_title: 'Día de Simulación de Prueba de Desempeño',
        perf_day_sub:
          'Este es el último día de tu plan. Realiza la simulación bajo condiciones reales: sin ayuda, con tiempo limitado.',
        day_done: '¡Día completado! Sigue avanzando con el siguiente día.',
        plan_done_title: '¡Completaste el plan!',
        plan_done_sub:
          'Has terminado los 20 días. Tu próximo plan se generará automáticamente el lunes.',
        modal_loading: 'Generando ejercicio personalizado',
        hint_label: 'Pista',
        hint_prev: '‹ Anterior',
        hint_next: 'Siguiente ›',
        editor_label: 'Tu solución',
        btn_reset: 'Resetear',
        expected_label: 'Resultado esperado',
        solution_label: 'Solución de referencia',
        btn_submit: 'Enviar solución',
        submit_note: 'Tu TL podrá revisar tu código enviado.',
      },
      tl: {
        nav_dashboard: 'Dashboard',
        nav_activities: 'Actividades',
        nav_groups: 'Grupos',
        nav_logout: 'Logout',
        notif_title: 'Notificaciones',
        notif_empty: 'Sin notificaciones nuevas',
        err_server: 'No se pudo conectar con el servidor',
        err_server_sub:
          'Verifica que el backend esté corriendo en localhost:3000',
        err_retry: 'Reintentar',
        risk_badge: 'en riesgo',
        stat_total: 'Coders en el clan',
        stat_done: 'Onboarding completo',
        stat_pending: 'Pendientes',
        stat_risk: 'En riesgo',
        stat_score: 'Score promedio',
        card_skills: 'Habilidades blandas del clan',
        skills_meta: 'Promedio 1–5',
        card_styles: 'Estilos de aprendizaje',
        styles_meta: 'Distribución del clan',
        card_coders: 'Coders del Clan',
        filter_all: 'Todos',
        filter_risk: 'En riesgo',
        filter_pending: 'Pendientes',
        tbl_name: 'Nombre',
        tbl_score: 'Score',
        tbl_week: 'Semana',
        tbl_style: 'Aprendizaje',
        tbl_status: 'Estado',
        tbl_empty: 'Sin coders para mostrar con este filtro',
        detail_placeholder: 'Selecciona un coder\npara ver su detalle',
        meta_email: 'Email',
        meta_week: 'Semana',
        meta_score: 'Score',
        meta_style: 'Estilo',
        feedback_label: 'Dar feedback',
        fb_placeholder: 'Tipo de feedback...',
        fb_encouragement: 'Motivación',
        fb_improvement: 'Área de mejora',
        fb_achievement: 'Logro destacado',
        fb_warning: 'Advertencia',
        fb_input_placeholder: 'Escribe tu comentario...',
        btn_send: 'Enviar',
        btn_pdf: 'PDF',
        submissions_title: 'Ejercicios enviados por el clan',
        submissions_empty: 'Ningún coder ha enviado ejercicios todavía.',
        rm_expected_label: 'Resultado esperado',
        rm_pts_hint: 'El coder recibirá +15 pts',
        rm_btn_send: 'Enviar feedback',
        rm_fb_placeholder:
          'Escribe tu feedback... ¿Qué hizo bien? ¿Qué puede mejorar?',
        rm_reviewed_label: 'Feedback enviado',
        asgn_title: 'Actividades',
        asgn_section: 'Trabajos y recursos publicados',
        btn_rag: 'Subir recurso RAG',
        btn_add: 'Añadir trabajo',
        legend_pdf: 'Actividad PDF',
        legend_repo: 'Repositorio',
        legend_resource: 'Recurso RAG',
        asgn_empty_title: 'Sin contenido publicado',
        asgn_empty_sub:
          'Usa Añadir trabajo para asignar actividades o Subir recurso RAG para materiales de estudio.',
        modal_add_title: 'Añadir trabajo',
        form_title: 'Título *',
        form_title_ph: 'Ej: Taller de JOINs en PostgreSQL',
        form_module: 'Módulo',
        form_deadline: 'Fecha límite',
        form_scope: '¿Para quién es esta actividad?',
        scope_clan_title: 'Solo mi clan',
        scope_clan_sub: 'Los coders de tu clan',
        scope_all_title: 'Todos los coders',
        scope_all_sub: 'Todos los clanes de Riwi',
        form_type: 'Tipo de contenido',
        drop_title: 'Haz clic o arrastra el PDF aquí',
        drop_sub: 'Máximo 20 MB · Solo PDF',
        form_repo_url: 'URL del repositorio *',
        form_repo_ph: 'https://github.com/usuario/repositorio',
        btn_publish: 'Publicar actividad',
        publish_note: 'Se notificará a los coders automáticamente.',
        rag_title: 'Subir recurso RAG',
        rag_res_title: 'Título del recurso *',
        rag_res_ph: 'Ej: Guía de JOINs en PostgreSQL',
        btn_upload: 'Subir PDF',
        upload_note: 'El embedding se procesa en segundo plano (~10s).',
        confirm_title: '¿Estás seguro?',
        confirm_text: 'Esta acción no se puede deshacer.',
        btn_cancel: 'Cancelar',
        btn_accept: 'Aceptar',
        groups_title: 'Grupos',
        groups_sub: 'Gestión de coders por clan',
        btn_random: 'Grupos al azar',
        btn_manual: 'Grupos manuales',
        btn_level: 'Grupo por nivel',
        groups_hint: 'Selecciona un modo para agrupar coders.',
      },
      dynamic: {
        skill_autonomy: 'Autonomía',
        skill_timeManagement: 'Gestión del tiempo',
        skill_problemSolving: 'Resolución de problemas',
        skill_communication: 'Comunicación',
        skill_teamwork: 'Trabajo en equipo',
        skill_weakest: 'Más débil',
        style_visual:
          'Aprendes mejor con diagramas, videos y elementos visuales.',
        style_kinesthetic:
          'Aprendes mejor construyendo y practicando con código real.',
        style_reading:
          'Aprendes mejor leyendo documentación y escribiendo notas.',
        style_auditory:
          'Aprendes mejor escuchando y explicando conceptos en voz alta.',
        style_mixed:
          'Tu aprendizaje es versátil — combinas múltiples enfoques.',
        perf_approved: 'Aprobado',
        perf_failed: 'Reprobado',
        perf_pending: 'Pendiente',
        perf_reeval: 'Re-eval',
        fb_encouragement: 'Motivación',
        fb_improvement: 'Área de mejora',
        fb_achievement: 'Logro destacado',
        fb_warning: 'Advertencia',
        fb_general: 'Feedback',
        fb_weekly: 'Semanal',
        fb_activity: 'Actividad',
        mark_read: 'Marcar leído',
        from_tl: 'De:',
        default_tl: 'Tu TL',
        diag_date: 'Resultados del diagnóstico inicial ·',
        no_module: 'Sin datos de módulo',
        no_onboarding:
          'Completa el onboarding para ver tus habilidades blandas.',
        pct_done: '% completado',
        week_label: 'Semana',
        week_of: 'de',
        risk_default: 'Flag de riesgo activo',
        loading_err: 'No se pudo conectar con el servidor.',
        tl_no_skills: 'Sin datos de habilidades blandas.',
        tl_no_data: 'Sin datos',
        tl_no_diagnosis: 'Sin diagnóstico',
        tl_week: 'Semana',
        tl_sem: 'Sem.',
        tl_pts: 'pts',
        tl_risk: 'Riesgo',
        tl_pending: 'Pendiente',
        tl_active: 'Activo',
        tl_submissions_count: 'envíos',
        tl_unreviewed: 'sin revisar',
        tl_reviewed: 'Revisado',
        tl_day: 'Día',
        tl_send_err: 'Selecciona el tipo y escribe un mensaje.',
        tl_feedback_ok: 'Feedback enviado correctamente.',
        tl_feedback_err: 'Error al enviar feedback.',
        tl_review_ok: 'Feedback enviado. El coder ganó +15 puntos.',
        tl_review_err: 'Error al enviar feedback.',
        tl_review_code: 'Revisar código',
        tl_sending: 'Enviando...',
        tl_no_rank: 'Sin datos aún',
        tl_clan_rank: 'Ranking del Clan',
        tl_global_rank: 'Ranking Global',
        tl_all_clans: 'Todos los clanes',
        tl_generated: 'Generado:',
        style_visual_short: 'Visual',
        style_auditory_short: 'Auditivo',
        style_kinesthetic_short: 'Kinestésico',
        style_read_write_short: 'Lecto-escritor',
        style_mixed_short: 'Mixto',
        style_other_short: 'Sin diagnóstico',
        skill_autonomy_short: 'Autonomía',
        skill_time_management_short: 'Gest. del tiempo',
        skill_problem_solving_short: 'Resolución',
        skill_communication_short: 'Comunicación',
        skill_teamwork_short: 'Trabajo en eq.',
      },
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
    const raw = el.getAttribute('data-i18n');
    let targetAttr = null;
    let key = raw;

    // Support [attr]key syntax e.g. [placeholder]auth.label_mail
    if (raw.startsWith('[')) {
      const match = raw.match(/^\[([^\]]+)\](.+)$/);
      if (match) {
        [, targetAttr, key] = match;
      }
    }

    const trans = i18next.t(key);

    if (targetAttr) {
      el.setAttribute(targetAttr, trans);
      return;
    }

    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = trans;
    } else if (/<[a-z][\s\S]*>/i.test(trans)) {
      el.innerHTML = trans;
    } else {
      el.textContent = trans;
    }
  });

  _updateLangButton();
}

function _updateLangButton() {
  const langBtn = document.getElementById('language-toggle');
  if (!langBtn) return;
  langBtn.title =
    i18next.language === 'es' ? 'Switch to English' : 'Cambiar a Español';
}

function _dispatchLangChange() {
  window.dispatchEvent(new CustomEvent('kairo:langchange'));
}

// Wire language-toggle button (landing, auth pages)
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

// Wire btn-lang button (dashboard pages)
document.addEventListener('DOMContentLoaded', () => {
  const btnLang = document.getElementById('btn-lang');
  if (!btnLang) return;
  btnLang.addEventListener('click', () => {
    const next = i18next.language === 'es' ? 'en' : 'es';
    i18next.changeLanguage(next, () => {
      localStorage.setItem('kairo-lang', next);
      document.documentElement.lang = next;
      _applyTranslations();
      _dispatchLangChange();
    });
  });
});

// Promise that resolves when i18next is ready — used by dashboard JS modules
window.i18nReady = new Promise((resolve) => {
  if (i18next.isInitialized) resolve();
  else i18next.on('initialized', resolve);
});

// Global translation function
window.i18nT = (key) => i18next.t(key);
