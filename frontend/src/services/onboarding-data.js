/**
 * src/services/onboarding-data.js
 * Datos maestros del Onboarding — 30 preguntas / 7 bloques.
 * Cada `text` es { es, en } tanto en preguntas como en opciones.
 */

export const ONBOARDING_DATA = [
  /* BLOCK 1 — Sensory Channels (VARK) */
  {
    blockId: 1,
    title: { es: 'Canales Sensoriales', en: 'Sensory Channels' },
    questions: [
      {
        id: 1,
        text: {
          es: '¿Cuando aprendes algo nuevo, qué te resulta más útil?',
          en: 'When you learn something new, what do you find most helpful?',
        },
        options: [
          {
            id: 'q1o1',
            text: {
              es: 'Ver diagramas, esquemas o mapas conceptuales',
              en: 'Seeing diagrams, charts or concept maps',
            },
            score: 'V',
          },
          {
            id: 'q1o2',
            text: {
              es: 'Escuchar una explicación oral o podcast',
              en: 'Listening to a verbal explanation or podcast',
            },
            score: 'A',
          },
          {
            id: 'q1o3',
            text: {
              es: 'Leer un manual, artículo o resumen escrito',
              en: 'Reading a manual, article or written summary',
            },
            score: 'R',
          },
          {
            id: 'q1o4',
            text: {
              es: 'Practicarlo directamente con ejercicios reales',
              en: 'Practicing it directly with real exercises',
            },
            score: 'K',
          },
        ],
      },
      {
        id: 2,
        text: {
          es: '¿Si tuvieras que enseñarle algo a un amigo, cómo lo harías?',
          en: 'If you had to teach something to a friend, how would you do it?',
        },
        options: [
          {
            id: 'q2o1',
            text: {
              es: 'Dibujando un esquema o usando imágenes',
              en: 'Drawing a diagram or using images',
            },
            score: 'V',
          },
          {
            id: 'q2o2',
            text: {
              es: 'Explicándolo con palabras y ejemplos orales',
              en: 'Explaining it with words and verbal examples',
            },
            score: 'A',
          },
          {
            id: 'q2o3',
            text: {
              es: 'Escribiéndole un texto con los puntos clave',
              en: 'Writing a text with the key points',
            },
            score: 'R',
          },
          {
            id: 'q2o4',
            text: {
              es: 'Mostrándoselo en la práctica, paso a paso',
              en: 'Showing it in practice, step by step',
            },
            score: 'K',
          },
        ],
      },
      {
        id: 3,
        text: {
          es: 'Al estudiar para un examen, ¿qué técnica prefieres?',
          en: 'When studying for an exam, which technique do you prefer?',
        },
        options: [
          {
            id: 'q3o1',
            text: {
              es: 'Hacer mapas mentales o subrayar en colores',
              en: 'Making mind maps or color-coding notes',
            },
            score: 'V',
          },
          {
            id: 'q3o2',
            text: {
              es: 'Repetir en voz alta o grabarte y escucharte',
              en: 'Repeating aloud or recording and listening back',
            },
            score: 'A',
          },
          {
            id: 'q3o3',
            text: {
              es: 'Escribir resúmenes y repasar apuntes',
              en: 'Writing summaries and reviewing notes',
            },
            score: 'R',
          },
          {
            id: 'q3o4',
            text: {
              es: 'Resolver ejercicios prácticos y casos reales',
              en: 'Solving practical exercises and real cases',
            },
            score: 'K',
          },
        ],
      },
      {
        id: 4,
        text: {
          es: 'Cuando lees las instrucciones de algo nuevo, ¿qué te ayuda más?',
          en: 'When reading instructions for something new, what helps you most?',
        },
        options: [
          {
            id: 'q4o1',
            text: {
              es: 'Que vengan con fotos, gráficos o diagramas',
              en: 'Having photos, graphics or diagrams included',
            },
            score: 'V',
          },
          {
            id: 'q4o2',
            text: {
              es: 'Que te lo expliquen de viva voz',
              en: 'Having someone explain it verbally',
            },
            score: 'A',
          },
          {
            id: 'q4o3',
            text: {
              es: 'Que el texto sea claro, detallado y organizado',
              en: 'Having clear, detailed and organized text',
            },
            score: 'R',
          },
          {
            id: 'q4o4',
            text: {
              es: 'Que puedas probarlo tú mismo inmediatamente',
              en: 'Being able to try it yourself right away',
            },
            score: 'K',
          },
        ],
      },
    ],
  },

  /* BLOCK 2 — Information Preferences (VARK) */
  {
    blockId: 2,
    title: { es: 'Preferencias de Información', en: 'Information Preferences' },
    questions: [
      {
        id: 5,
        text: {
          es: 'Si vas a comprar un dispositivo nuevo, ¿qué influye más?',
          en: 'When buying a new device, what influences you most?',
        },
        options: [
          {
            id: 'q5o1',
            text: {
              es: 'El diseño, las fotos y cómo se ve',
              en: 'The design, photos and how it looks',
            },
            score: 'V',
          },
          {
            id: 'q5o2',
            text: {
              es: 'Lo que te cuente el vendedor o amigos',
              en: 'What the seller or friends tell you',
            },
            score: 'A',
          },
          {
            id: 'q5o3',
            text: {
              es: 'Leer las especificaciones y reseñas',
              en: 'Reading the specifications and reviews',
            },
            score: 'R',
          },
          {
            id: 'q5o4',
            text: {
              es: 'Probarlo y usarlo en la tienda',
              en: 'Trying and using it in the store',
            },
            score: 'K',
          },
        ],
      },
      {
        id: 6,
        text: {
          es: 'Prefieres los sitios web que tienen:',
          en: 'You prefer websites that have:',
        },
        options: [
          {
            id: 'q6o1',
            text: {
              es: 'Diseño visual atractivo y videos',
              en: 'Attractive visual design and videos',
            },
            score: 'V',
          },
          {
            id: 'q6o2',
            text: {
              es: 'Canales de audio, música o podcasts',
              en: 'Audio channels, music or podcasts',
            },
            score: 'A',
          },
          {
            id: 'q6o3',
            text: {
              es: 'Descripciones detalladas y artículos',
              en: 'Detailed descriptions and articles',
            },
            score: 'R',
          },
          {
            id: 'q6o4',
            text: {
              es: 'Cosas interactivas para cliquear y probar',
              en: 'Interactive things to click and try out',
            },
            score: 'K',
          },
        ],
      },
    ],
  },

  /* BLOCK 3 — Processing and Perception (ILS) */
  {
    blockId: 3,
    title: { es: 'Procesamiento y Percepción', en: 'Processing & Perception' },
    questions: [
      {
        id: 7,
        text: {
          es: 'Para entender un tema nuevo, prefieres:',
          en: 'To understand a new topic, you prefer:',
        },
        options: [
          {
            id: 'q7o1',
            text: {
              es: 'Pensar en ello antes de actuar',
              en: 'Thinking it through before acting',
            },
            score: 'REF',
          },
          {
            id: 'q7o2',
            text: {
              es: 'Ensayar y trabajar con otros',
              en: 'Trying things out and working with others',
            },
            score: 'ACT',
          },
          {
            id: 'q7o3',
            text: {
              es: 'Leer sobre ello primero',
              en: 'Reading about it first',
            },
            score: 'REF',
          },
          {
            id: 'q7o4',
            text: {
              es: 'Saltar directo a la práctica',
              en: 'Jumping straight into practice',
            },
            score: 'ACT',
          },
        ],
      },
      {
        id: 8,
        text: {
          es: 'Te consideras una persona más:',
          en: 'You consider yourself more:',
        },
        options: [
          {
            id: 'q8o1',
            text: { es: 'Realista y práctica', en: 'Realistic and practical' },
            score: 'SNS',
          },
          {
            id: 'q8o2',
            text: {
              es: 'Innovadora e imaginativa',
              en: 'Innovative and imaginative',
            },
            score: 'INT',
          },
          {
            id: 'q8o3',
            text: {
              es: 'Metódica y detallista',
              en: 'Methodical and detail-oriented',
            },
            score: 'SNS',
          },
          {
            id: 'q8o4',
            text: { es: 'Creativa e intuitiva', en: 'Creative and intuitive' },
            score: 'INT',
          },
        ],
      },
      {
        id: 9,
        text: {
          es: 'Cuando recibes información, la retienes mejor si es:',
          en: 'When receiving information, you retain it better when it is:',
        },
        options: [
          {
            id: 'q9o1',
            text: {
              es: 'En imágenes, diagramas o mapas',
              en: 'In images, diagrams or maps',
            },
            score: 'VIS',
          },
          {
            id: 'q9o2',
            text: {
              es: 'En palabras, textos o explicaciones',
              en: 'In words, texts or explanations',
            },
            score: 'VRB',
          },
          {
            id: 'q9o3',
            text: {
              es: 'En esquemas visuales y colores',
              en: 'In visual outlines and colors',
            },
            score: 'VIS',
          },
          {
            id: 'q9o4',
            text: {
              es: 'En resúmenes escritos y listas',
              en: 'In written summaries and lists',
            },
            score: 'VRB',
          },
        ],
      },
      {
        id: 10,
        text: {
          es: 'En tus estudios, prefieres avanzar:',
          en: 'In your studies, you prefer to progress:',
        },
        options: [
          {
            id: 'q10o1',
            text: {
              es: 'Paso a paso, de forma lógica',
              en: 'Step by step, in a logical way',
            },
            score: 'SEQ',
          },
          {
            id: 'q10o2',
            text: {
              es: 'Entendiendo el todo primero',
              en: 'Understanding the big picture first',
            },
            score: 'GLO',
          },
          {
            id: 'q10o3',
            text: {
              es: 'Siguiendo un orden claro',
              en: 'Following a clear order',
            },
            score: 'SEQ',
          },
          {
            id: 'q10o4',
            text: {
              es: 'Conectando ideas entre secciones',
              en: 'Connecting ideas across sections',
            },
            score: 'GLO',
          },
        ],
      },
    ],
  },

  /* BLOCK 4 — Study Habits (ILS) */
  {
    blockId: 4,
    title: { es: 'Hábitos de Estudio', en: 'Study Habits' },
    questions: [
      {
        id: 11,
        text: {
          es: 'En un grupo de trabajo, es más probable que:',
          en: 'In a study group, you are more likely to:',
        },
        options: [
          {
            id: 'q11o1',
            text: {
              es: 'Participes activamente aportando ideas',
              en: 'Participate actively contributing ideas',
            },
            score: 'ACT',
          },
          {
            id: 'q11o2',
            text: {
              es: 'Escuches y reflexiones antes de hablar',
              en: 'Listen and reflect before speaking',
            },
            score: 'REF',
          },
          {
            id: 'q11o3',
            text: {
              es: 'Propongas actividades y ejercicios',
              en: 'Propose activities and exercises',
            },
            score: 'ACT',
          },
          {
            id: 'q11o4',
            text: {
              es: 'Analices en silencio antes de opinar',
              en: 'Analyze silently before giving your opinion',
            },
            score: 'REF',
          },
        ],
      },
      {
        id: 12,
        text: {
          es: 'Te resulta más fácil aprender:',
          en: 'You find it easier to learn:',
        },
        options: [
          {
            id: 'q12o1',
            text: {
              es: 'Hechos y datos concretos',
              en: 'Concrete facts and data',
            },
            score: 'SNS',
          },
          {
            id: 'q12o2',
            text: {
              es: 'Conceptos y teorías abstractas',
              en: 'Abstract concepts and theories',
            },
            score: 'INT',
          },
          {
            id: 'q12o3',
            text: {
              es: 'Ejemplos basados en situaciones reales',
              en: 'Examples based on real situations',
            },
            score: 'SNS',
          },
          {
            id: 'q12o4',
            text: {
              es: 'Principios que puedes generalizar',
              en: 'Principles you can generalize',
            },
            score: 'INT',
          },
        ],
      },
      {
        id: 13,
        text: {
          es: 'Al recordar una clase, piensas más en:',
          en: 'When recalling a class, you think more about:',
        },
        options: [
          {
            id: 'q13o1',
            text: {
              es: 'Las diapositivas, pizarras o videos',
              en: 'The slides, boards or videos',
            },
            score: 'VIS',
          },
          {
            id: 'q13o2',
            text: {
              es: 'Lo que el profesor dijo o escribió',
              en: 'What the teacher said or wrote',
            },
            score: 'VRB',
          },
          {
            id: 'q13o3',
            text: {
              es: 'Los gráficos o esquemas mostrados',
              en: 'The charts or diagrams shown',
            },
            score: 'VIS',
          },
          {
            id: 'q13o4',
            text: {
              es: 'Los ejemplos y explicaciones verbales',
              en: 'The verbal examples and explanations',
            },
            score: 'VRB',
          },
        ],
      },
      {
        id: 14,
        text: {
          es: 'Cuando resuelves problemas complejos, tiendes a:',
          en: 'When solving complex problems, you tend to:',
        },
        options: [
          {
            id: 'q14o1',
            text: {
              es: 'Entender los pasos uno por uno',
              en: 'Understand the steps one by one',
            },
            score: 'SEQ',
          },
          {
            id: 'q14o2',
            text: {
              es: 'Tener intuiciones sobre la solución',
              en: 'Have intuitions about the solution',
            },
            score: 'GLO',
          },
          {
            id: 'q14o3',
            text: {
              es: 'Seguir un proceso estructurado',
              en: 'Follow a structured process',
            },
            score: 'SEQ',
          },
          {
            id: 'q14o4',
            text: {
              es: 'Ver el panorama completo primero',
              en: 'See the full picture first',
            },
            score: 'GLO',
          },
        ],
      },
    ],
  },

  /* BLOCK 5 — Learning Environment (ILS) */
  {
    blockId: 5,
    title: { es: 'Entorno de Aprendizaje', en: 'Learning Environment' },
    questions: [
      {
        id: 15,
        text: {
          es: 'Prefieres que los cursos se enfoquen en:',
          en: 'You prefer courses that focus on:',
        },
        options: [
          {
            id: 'q15o1',
            text: {
              es: 'Material práctico y aplicable',
              en: 'Practical and applicable material',
            },
            score: 'SNS',
          },
          {
            id: 'q15o2',
            text: {
              es: 'Principios y teorías generales',
              en: 'General principles and theories',
            },
            score: 'INT',
          },
          {
            id: 'q15o3',
            text: {
              es: 'Casos de uso del mundo real',
              en: 'Real-world use cases',
            },
            score: 'SNS',
          },
          {
            id: 'q15o4',
            text: {
              es: 'Fundamentos conceptuales profundos',
              en: 'Deep conceptual foundations',
            },
            score: 'INT',
          },
        ],
      },
      {
        id: 16,
        text: {
          es: 'Para ti es más importante:',
          en: 'For you, what matters more is:',
        },
        options: [
          {
            id: 'q16o1',
            text: {
              es: 'El qué: los hechos concretos',
              en: 'The what: concrete facts',
            },
            score: 'SNS',
          },
          {
            id: 'q16o2',
            text: {
              es: 'El por qué: la razón de ser',
              en: 'The why: the underlying reason',
            },
            score: 'INT',
          },
          {
            id: 'q16o3',
            text: {
              es: 'El cómo: el procedimiento exacto',
              en: 'The how: the exact procedure',
            },
            score: 'SNS',
          },
          {
            id: 'q16o4',
            text: {
              es: 'El para qué: el propósito del concepto',
              en: 'The purpose: why the concept exists',
            },
            score: 'INT',
          },
        ],
      },
      {
        id: 17,
        text: {
          es: 'Cuando escribes, prefieres usar:',
          en: 'When writing, you prefer to use:',
        },
        options: [
          {
            id: 'q17o1',
            text: {
              es: 'Gráficos, flechas y esquemas',
              en: 'Charts, arrows and diagrams',
            },
            score: 'VIS',
          },
          {
            id: 'q17o2',
            text: {
              es: 'Párrafos, listas y explicaciones',
              en: 'Paragraphs, lists and explanations',
            },
            score: 'VRB',
          },
          {
            id: 'q17o3',
            text: {
              es: 'Tablas y comparaciones visuales',
              en: 'Tables and visual comparisons',
            },
            score: 'VIS',
          },
          {
            id: 'q17o4',
            text: {
              es: 'Texto narrativo con detalles claros',
              en: 'Narrative text with clear details',
            },
            score: 'VRB',
          },
        ],
      },
      {
        id: 18,
        text: {
          es: 'Al leer un libro de texto, tiendes a:',
          en: 'When reading a textbook, you tend to:',
        },
        options: [
          {
            id: 'q18o1',
            text: {
              es: 'Leer secuencialmente de inicio a fin',
              en: 'Read sequentially from start to finish',
            },
            score: 'SEQ',
          },
          {
            id: 'q18o2',
            text: {
              es: 'Saltar de una parte a otra buscando el sentido',
              en: 'Jump between sections looking for meaning',
            },
            score: 'GLO',
          },
          {
            id: 'q18o3',
            text: {
              es: 'Seguir el índice capítulo por capítulo',
              en: 'Follow the index chapter by chapter',
            },
            score: 'SEQ',
          },
          {
            id: 'q18o4',
            text: {
              es: 'Buscar el hilo global antes de leer en detalle',
              en: 'Find the global thread before reading in detail',
            },
            score: 'GLO',
          },
        ],
      },
      {
        id: 19,
        text: {
          es: 'Te sientes más cómodo con:',
          en: 'You feel more comfortable with:',
        },
        options: [
          {
            id: 'q19o1',
            text: {
              es: 'Trabajo en equipo y discusiones',
              en: 'Teamwork and discussions',
            },
            score: 'ACT',
          },
          {
            id: 'q19o2',
            text: {
              es: 'Estudio individual y reflexión',
              en: 'Individual study and reflection',
            },
            score: 'REF',
          },
          {
            id: 'q19o3',
            text: {
              es: 'Proyectos colaborativos y dinámicos',
              en: 'Dynamic collaborative projects',
            },
            score: 'ACT',
          },
          {
            id: 'q19o4',
            text: {
              es: 'Análisis profundo en solitario',
              en: 'Deep solo analysis',
            },
            score: 'REF',
          },
        ],
      },
      {
        id: 20,
        text: {
          es: 'Sueles ser una persona:',
          en: 'You tend to be a person who is:',
        },
        options: [
          {
            id: 'q20o1',
            text: {
              es: 'Cuidadosa con los detalles',
              en: 'Careful with details',
            },
            score: 'SNS',
          },
          {
            id: 'q20o2',
            text: {
              es: 'Rápida buscando nuevas formas',
              en: 'Quick to look for new ways',
            },
            score: 'INT',
          },
          {
            id: 'q20o3',
            text: {
              es: 'Orientada a procedimientos claros',
              en: 'Oriented toward clear procedures',
            },
            score: 'SNS',
          },
          {
            id: 'q20o4',
            text: {
              es: 'Atraída por ideas originales',
              en: 'Drawn to original ideas',
            },
            score: 'INT',
          },
        ],
      },
    ],
  },

  /* BLOCK 6 — Experiential Cycle (Kolb) */
  {
    blockId: 6,
    title: { es: 'Ciclo Experiencial', en: 'Experiential Cycle' },
    questions: [
      {
        id: 21,
        text: {
          es: 'Cuando aprendo algo nuevo, suelo:',
          en: 'When I learn something new, I usually:',
        },
        options: [
          {
            id: 'q21o1',
            text: {
              es: 'Escuchar y observar cuidadosamente',
              en: 'Listen and observe carefully',
            },
            score: 'RO',
          },
          {
            id: 'q21o2',
            text: {
              es: 'Involucrarme y probar cosas',
              en: 'Get involved and try things out',
            },
            score: 'CE',
          },
          {
            id: 'q21o3',
            text: {
              es: 'Analizar la lógica detrás',
              en: 'Analyze the logic behind it',
            },
            score: 'AC',
          },
          {
            id: 'q21o4',
            text: {
              es: 'Trabajar duro para terminar',
              en: 'Work hard to get it done',
            },
            score: 'AE',
          },
        ],
      },
      {
        id: 22,
        text: {
          es: 'Aprendo mejor cuando:',
          en: 'I learn best when:',
        },
        options: [
          {
            id: 'q22o1',
            text: {
              es: 'Confío en mis presentimientos',
              en: 'I trust my gut feelings',
            },
            score: 'CE',
          },
          {
            id: 'q22o2',
            text: {
              es: 'Escucho y observo atentamente',
              en: 'I listen and observe carefully',
            },
            score: 'RO',
          },
          {
            id: 'q22o3',
            text: {
              es: 'Pienso racionalmente en el tema',
              en: 'I think rationally about the topic',
            },
            score: 'AC',
          },
          {
            id: 'q22o4',
            text: {
              es: 'Puedo probarlo yo mismo',
              en: 'I can try it out myself',
            },
            score: 'AE',
          },
        ],
      },
      {
        id: 23,
        text: {
          es: 'Al aprender, prefiero:',
          en: 'When learning, I prefer to:',
        },
        options: [
          {
            id: 'q23o1',
            text: {
              es: 'Sentir y tener intuiciones',
              en: 'Feel and have intuitions',
            },
            score: 'CE',
          },
          {
            id: 'q23o2',
            text: {
              es: 'Ser reservado y tranquilo',
              en: 'Be reserved and calm',
            },
            score: 'RO',
          },
          {
            id: 'q23o3',
            text: {
              es: 'Usar lógica y razonamiento',
              en: 'Use logic and reasoning',
            },
            score: 'AC',
          },
          {
            id: 'q23o4',
            text: {
              es: 'Ser responsable de las cosas',
              en: 'Take ownership of things',
            },
            score: 'AE',
          },
        ],
      },
      {
        id: 24,
        text: {
          es: 'Aprendo más a través de:',
          en: 'I learn most through:',
        },
        options: [
          {
            id: 'q24o1',
            text: { es: 'Los sentimientos', en: 'Feelings' },
            score: 'CE',
          },
          {
            id: 'q24o2',
            text: { es: 'La observación', en: 'Observation' },
            score: 'RO',
          },
          {
            id: 'q24o3',
            text: { es: 'El pensamiento', en: 'Thinking' },
            score: 'AC',
          },
          { id: 'q24o4', text: { es: 'La acción', en: 'Action' }, score: 'AE' },
        ],
      },
      {
        id: 25,
        text: {
          es: 'Al aprender, soy una persona:',
          en: 'As a learner, I am someone who is:',
        },
        options: [
          {
            id: 'q25o1',
            text: {
              es: 'Abierta a nuevas experiencias',
              en: 'Open to new experiences',
            },
            score: 'CE',
          },
          {
            id: 'q25o2',
            text: {
              es: 'Cuidadosa al emitir juicios',
              en: 'Careful when making judgments',
            },
            score: 'RO',
          },
          {
            id: 'q25o3',
            text: { es: 'Analítica', en: 'Analytical' },
            score: 'AC',
          },
          {
            id: 'q25o4',
            text: { es: 'Orientada a la práctica', en: 'Practice-oriented' },
            score: 'AE',
          },
        ],
      },
    ],
  },

  /* BLOCK 7 — Attitude toward Learning (Kolb) */
  {
    blockId: 7,
    title: {
      es: 'Actitud ante el Aprendizaje',
      en: 'Attitude Toward Learning',
    },
    questions: [
      {
        id: 26,
        text: {
          es: 'Si algo no funciona como esperabas:',
          en: 'If something does not work as expected:',
        },
        options: [
          {
            id: 'q26o1',
            text: {
              es: 'Experimentas hasta que funcione',
              en: 'You experiment until it works',
            },
            score: 'AE',
          },
          {
            id: 'q26o2',
            text: {
              es: 'Piensas qué salió mal antes de seguir',
              en: 'You think about what went wrong before continuing',
            },
            score: 'RO',
          },
          {
            id: 'q26o3',
            text: {
              es: 'Buscas una explicación teórica',
              en: 'You look for a theoretical explanation',
            },
            score: 'AC',
          },
          {
            id: 'q26o4',
            text: {
              es: 'Pides ayuda a alguien experto',
              en: 'You ask someone with expertise for help',
            },
            score: 'CE',
          },
        ],
      },
      {
        id: 27,
        text: {
          es: '¿Cómo te describes como aprendiz?',
          en: 'How would you describe yourself as a learner?',
        },
        options: [
          {
            id: 'q27o1',
            text: {
              es: 'Práctico: aprendo haciendo',
              en: 'Practical: I learn by doing',
            },
            score: 'AE',
          },
          {
            id: 'q27o2',
            text: {
              es: 'Observador: aprendo viendo y reflexionando',
              en: 'Observer: I learn by watching and reflecting',
            },
            score: 'RO',
          },
          {
            id: 'q27o3',
            text: {
              es: 'Conceptual: aprendo con ideas y teorías',
              en: 'Conceptual: I learn through ideas and theories',
            },
            score: 'AC',
          },
          {
            id: 'q27o4',
            text: {
              es: 'Experimentador: aprendo probando',
              en: 'Experimenter: I learn by trying things out',
            },
            score: 'AE',
          },
        ],
      },
      {
        id: 28,
        text: {
          es: '¿Qué te motiva más a aprender?',
          en: 'What motivates you most to learn?',
        },
        options: [
          {
            id: 'q28o1',
            text: {
              es: 'Saber que lo aplicarás pronto',
              en: 'Knowing you will apply it soon',
            },
            score: 'CE',
          },
          {
            id: 'q28o2',
            text: {
              es: 'La posibilidad de reflexionar a fondo',
              en: 'The chance to reflect deeply',
            },
            score: 'RO',
          },
          {
            id: 'q28o3',
            text: {
              es: 'Entender la lógica del sistema',
              en: 'Understanding the logic of the system',
            },
            score: 'AC',
          },
          {
            id: 'q28o4',
            text: {
              es: 'La posibilidad de innovar',
              en: 'The possibility of innovating',
            },
            score: 'AE',
          },
        ],
      },
      {
        id: 29,
        text: {
          es: 'En un ambiente ideal, qué es esencial:',
          en: 'In an ideal learning environment, what is essential:',
        },
        options: [
          {
            id: 'q29o1',
            text: {
              es: 'Actividades prácticas y equipo',
              en: 'Practical activities and teamwork',
            },
            score: 'AE',
          },
          {
            id: 'q29o2',
            text: {
              es: 'Tiempo para reflexionar en silencio',
              en: 'Time to reflect in silence',
            },
            score: 'RO',
          },
          {
            id: 'q29o3',
            text: {
              es: 'Material bien estructurado y lógico',
              en: 'Well-structured and logical material',
            },
            score: 'AC',
          },
          {
            id: 'q29o4',
            text: {
              es: 'Libertad para explorar y crear',
              en: 'Freedom to explore and create',
            },
            score: 'CE',
          },
        ],
      },
      {
        id: 30,
        text: {
          es: '¿Cuál de estas frases te representa mejor?',
          en: 'Which of these phrases best describes you?',
        },
        options: [
          {
            id: 'q30o1',
            text: {
              es: 'Aprendo mejor cuando lo vivo',
              en: 'I learn best when I live it',
            },
            score: 'CE',
          },
          {
            id: 'q30o2',
            text: {
              es: 'Necesito tiempo para observar antes de actuar',
              en: 'I need time to observe before acting',
            },
            score: 'RO',
          },
          {
            id: 'q30o3',
            text: {
              es: 'Me gustan los modelos claros y lógicos',
              en: 'I like clear and logical models',
            },
            score: 'AC',
          },
          {
            id: 'q30o4',
            text: {
              es: 'Aprendo ensayando y ajustando',
              en: 'I learn by trying and adjusting',
            },
            score: 'AE',
          },
        ],
      },
    ],
  },
];
