-- ============================================================
-- TEST DE ESTILOS DE APRENDIZAJE
-- Schema PostgreSQL — VARK · ILS (Felder-Soloman) · Kolb
-- ============================================================
-- Orden de ejecución:
--   1. Schema + tipos
--   2. Tablas de catálogos (dimensiones, preguntas, opciones)
--   3. Tablas de sesión (usuarios, respuestas, resultados)
--   4. Datos maestros (INSERT)
--   5. Función de cálculo calcular_resultado()
--   6. Vista de resultados
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- 1. SCHEMA
-- ──────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS aprendizaje;
SET search_path = aprendizaje;


-- ──────────────────────────────────────────────────────────────
-- 2. TIPOS ENUMERADOS
-- ──────────────────────────────────────────────────────────────
CREATE TYPE modelo_enum AS ENUM ('VARK', 'ILS', 'KOLB');

CREATE TYPE vark_dim AS ENUM ('V', 'A', 'R', 'K');

CREATE TYPE ils_dim AS ENUM ('ACT', 'REF', 'SNS', 'INT', 'VIS', 'VRB', 'SEQ', 'GLO');

CREATE TYPE kolb_dim AS ENUM ('CE', 'RO', 'AC', 'AE');

CREATE TYPE kolb_estilo AS ENUM ('Divergente', 'Asimilador', 'Convergente', 'Acomodador');

CREATE TYPE nivel_enum AS ENUM ('Débil', 'Presente', 'Moderado', 'Muy predominante');


-- ──────────────────────────────────────────────────────────────
-- 3. TABLAS CATÁLOGO
-- ──────────────────────────────────────────────────────────────

CREATE TABLE bloques (
    id          SMALLINT PRIMARY KEY,
    nombre      TEXT NOT NULL,
    modelo      TEXT NOT NULL
);

CREATE TABLE preguntas (
    id          SMALLINT PRIMARY KEY,
    bloque_id   SMALLINT NOT NULL REFERENCES bloques(id),
    texto       TEXT NOT NULL
);

CREATE TABLE opciones (
    id            SERIAL PRIMARY KEY,
    pregunta_id   SMALLINT NOT NULL REFERENCES preguntas(id),
    numero        SMALLINT NOT NULL CHECK (numero BETWEEN 1 AND 4),
    texto         TEXT NOT NULL,
    dim_vark      vark_dim NOT NULL,
    dim_ils       ils_dim  NOT NULL,
    dim_kolb      kolb_dim NOT NULL,
    UNIQUE (pregunta_id, numero)
);

-- Catálogo de interpretación por dimensión VARK
CREATE TABLE interpretacion_vark (
    codigo       vark_dim PRIMARY KEY,
    nombre       TEXT NOT NULL,
    descripcion  TEXT NOT NULL,
    estrategias  TEXT[] NOT NULL   -- array de strings
);

-- Catálogo de interpretación por dimensión ILS
CREATE TABLE interpretacion_ils (
    codigo       ils_dim PRIMARY KEY,
    nombre       TEXT NOT NULL,
    opuesto      ils_dim,
    descripcion  TEXT NOT NULL
);

-- Catálogo de estilos Kolb combinados
CREATE TABLE interpretacion_kolb (
    estilo       kolb_estilo PRIMARY KEY,
    descripcion  TEXT NOT NULL,
    dim_a        kolb_dim NOT NULL,
    dim_b        kolb_dim NOT NULL
);

-- Umbrales de nivel para cada modelo
CREATE TABLE umbrales_nivel (
    modelo              modelo_enum PRIMARY KEY,
    muy_predominante    SMALLINT NOT NULL,
    moderado            SMALLINT NOT NULL,
    presente            SMALLINT NOT NULL
);


-- ──────────────────────────────────────────────────────────────
-- 4. TABLAS DE SESIÓN (usuarios y respuestas)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE sesiones (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre       TEXT,
    email        TEXT,
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
    completado   BOOLEAN NOT NULL DEFAULT FALSE,
    completado_en TIMESTAMPTZ
);

CREATE TABLE respuestas (
    id           SERIAL PRIMARY KEY,
    sesion_id    UUID NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
    pregunta_id  SMALLINT NOT NULL REFERENCES preguntas(id),
    opcion_num   SMALLINT NOT NULL CHECK (opcion_num BETWEEN 1 AND 4),
    respondido_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (sesion_id, pregunta_id)
);

-- Resultados calculados (se llena llamando a calcular_resultado)
CREATE TABLE resultados (
    id              SERIAL PRIMARY KEY,
    sesion_id       UUID NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE UNIQUE,
    calculado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- VARK puntajes
    vark_v          SMALLINT NOT NULL DEFAULT 0,
    vark_a          SMALLINT NOT NULL DEFAULT 0,
    vark_r          SMALLINT NOT NULL DEFAULT 0,
    vark_k          SMALLINT NOT NULL DEFAULT 0,
    vark_dominante  vark_dim,

    -- ILS puntajes
    ils_act         SMALLINT NOT NULL DEFAULT 0,
    ils_ref         SMALLINT NOT NULL DEFAULT 0,
    ils_sns         SMALLINT NOT NULL DEFAULT 0,
    ils_int         SMALLINT NOT NULL DEFAULT 0,
    ils_vis         SMALLINT NOT NULL DEFAULT 0,
    ils_vrb         SMALLINT NOT NULL DEFAULT 0,
    ils_seq         SMALLINT NOT NULL DEFAULT 0,
    ils_glo         SMALLINT NOT NULL DEFAULT 0,

    -- Kolb puntajes
    kolb_ce         SMALLINT NOT NULL DEFAULT 0,
    kolb_ro         SMALLINT NOT NULL DEFAULT 0,
    kolb_ac         SMALLINT NOT NULL DEFAULT 0,
    kolb_ae         SMALLINT NOT NULL DEFAULT 0,
    kolb_estilo     kolb_estilo
);


-- ──────────────────────────────────────────────────────────────
-- 5. DATOS MAESTROS
-- ──────────────────────────────────────────────────────────────

INSERT INTO bloques VALUES
    (1, 'Canales sensoriales',    'VARK'),
    (2, 'Activo vs. Reflexivo',   'ILS+KOLB'),
    (3, 'Sensorial vs. Intuitivo','ILS+KOLB'),
    (4, 'Secuencial vs. Global',  'ILS'),
    (5, 'Visual vs. Verbal',      'ILS'),
    (6, 'Ciclo Experiencial',     'KOLB'),
    (7, 'Integrador',             'MULTI');


INSERT INTO preguntas VALUES
    (1,  1, 'Cuando aprendes algo nuevo, ¿qué te resulta más útil?'),
    (2,  1, 'Si tuvieras que enseñarle algo a un amigo, ¿cómo lo harías?'),
    (3,  1, 'Al estudiar para un examen, ¿qué técnica prefieres?'),
    (4,  1, 'Cuando lees las instrucciones de algo nuevo, ¿qué te ayuda más?'),
    (5,  1, 'Para recordar un concepto importante, ¿cuál es tu estrategia natural?'),
    (6,  1, 'En una presentación, ¿qué tipo de recursos te ayuda más a comprender?'),
    (7,  2, 'Cuando enfrentas un problema nuevo en el trabajo o estudio, ¿qué haces primero?'),
    (8,  2, 'En un trabajo en equipo, ¿cuál es tu rol más natural?'),
    (9,  2, 'Cuando terminas una tarea, ¿qué sueles hacer?'),
    (10, 2, 'Si cometes un error importante, ¿cuál es tu reacción habitual?'),
    (11, 3, '¿Qué tipo de contenido te resulta más atractivo al aprender?'),
    (12, 3, 'Cuando tienes que resolver un problema complejo, prefieres:'),
    (13, 3, 'En tu área de trabajo o estudio, valoras más:'),
    (14, 3, 'Al diseñar o planificar algo, ¿qué te importa más?'),
    (15, 4, '¿Cómo prefieres recibir la información cuando aprendes algo nuevo?'),
    (16, 4, 'Cuando lees un libro o manual, ¿qué haces normalmente?'),
    (17, 4, 'Al explicar tu razonamiento a otros, ¿cómo sueles hacerlo?'),
    (18, 5, 'Cuando quieres recordar información, ¿con qué te queda mejor?'),
    (19, 5, 'Si tuvieras que aprender a usar una nueva herramienta digital, preferirías:'),
    (20, 5, '¿Cómo tomas notas en una clase o reunión?'),
    (21, 6, '¿Qué tipo de actividad de aprendizaje prefieres más?'),
    (22, 6, 'Cuando recibes retroalimentación sobre tu trabajo, ¿cómo reaccionas?'),
    (23, 6, '¿Cómo prefieres aprender habilidades nuevas?'),
    (24, 6, '¿Qué describe mejor cómo llegas a nuevas conclusiones?'),
    (25, 7, 'Cuando tomas una decisión importante, ¿en qué te basas principalmente?'),
    (26, 7, 'Cuando algo no funciona como esperabas, ¿qué prefieres hacer?'),
    (27, 7, '¿Cómo te describes a ti mismo como aprendiz?'),
    (28, 7, 'Si tienes que motivarte para aprender algo nuevo, ¿qué te impulsa más?'),
    (29, 7, 'En un ambiente de aprendizaje ideal para ti, ¿qué sería esencial?'),
    (30, 7, '¿Cuál de estas frases te representa mejor?');


-- Opciones con sus claves (pregunta_id, numero, texto, dim_vark, dim_ils, dim_kolb)
INSERT INTO opciones (pregunta_id, numero, texto, dim_vark, dim_ils, dim_kolb) VALUES
-- P1
(1,1,'Ver diagramas, esquemas o mapas conceptuales','V','VIS','RO'),
(1,2,'Escuchar una explicación oral o podcast','A','VRB','CE'),
(1,3,'Leer un manual, artículo o resumen escrito','R','VRB','AC'),
(1,4,'Practicarlo directamente con ejercicios reales','K','VIS','AE'),
-- P2
(2,1,'Dibujando un esquema o usando imágenes','V','VIS','RO'),
(2,2,'Explicándolo con palabras y ejemplos orales','A','VRB','CE'),
(2,3,'Escribiéndole un texto con los puntos clave','R','VRB','AC'),
(2,4,'Mostrándoselo en la práctica, paso a paso','K','VIS','AE'),
-- P3
(3,1,'Hacer mapas mentales o subrayar en colores','V','VIS','RO'),
(3,2,'Repetir en voz alta o grabarte y escucharte','A','VRB','CE'),
(3,3,'Escribir resúmenes y repasar apuntes','R','VRB','AC'),
(3,4,'Resolver ejercicios prácticos y casos reales','K','VIS','AE'),
-- P4
(4,1,'Que vengan con fotos, gráficos o diagramas','V','VIS','RO'),
(4,2,'Que te lo expliquen de viva voz','A','VRB','CE'),
(4,3,'Que el texto sea claro, detallado y bien organizado','R','VRB','AC'),
(4,4,'Que puedas probarlo tú mismo desde el inicio','K','ACT','AE'),
-- P5
(5,1,'Visualizarlo como una imagen mental o diagrama','V','VIS','RO'),
(5,2,'Relacionarlo con algo que alguien te dijo','A','VRB','CE'),
(5,3,'Escribirlo varias veces o leerlo en voz alta','R','VRB','AC'),
(5,4,'Asociarlo con una experiencia que viviste','K','SNS','CE'),
-- P6
(6,1,'Gráficos, diapositivas visuales y colores','V','VIS','RO'),
(6,2,'La voz y el tono del presentador','A','VRB','CE'),
(6,3,'Textos, tablas y datos escritos en pantalla','R','VRB','AC'),
(6,4,'Demostraciones en vivo o actividades participativas','K','ACT','AE'),
-- P7
(7,1,'Analizas todas las variables antes de actuar','R','REF','RO'),
(7,2,'Actúas de inmediato y ajustas sobre la marcha','K','ACT','AE'),
(7,3,'Consultas referencias teóricas o modelos previos','R','REF','AC'),
(7,4,'Buscas a alguien con experiencia para discutirlo','A','ACT','CE'),
-- P8
(8,1,'Propones ideas y te lanzas a ejecutarlas enseguida','K','ACT','AE'),
(8,2,'Escuchas, analizas y luego aportas una síntesis','R','REF','RO'),
(8,3,'Buscas datos y construyes un plan sólido','R','REF','AC'),
(8,4,'Facilitas la dinámica y mantienes el diálogo fluido','A','ACT','CE'),
-- P9
(9,1,'Reflexionas sobre qué salió bien y qué mejorar','R','REF','RO'),
(9,2,'Pasas directamente al siguiente reto','K','ACT','AE'),
(9,3,'Documentas el proceso para referencias futuras','R','REF','AC'),
(9,4,'Celebras con el grupo y compartes la experiencia','A','ACT','CE'),
-- P10
(10,1,'Paras, reflexionas y entiendes qué falló antes de continuar','R','REF','RO'),
(10,2,'Corriges rápido y sigues adelante sin detenerte mucho','K','ACT','AE'),
(10,3,'Buscas explicaciones teóricas sobre por qué ocurrió','R','REF','AC'),
(10,4,'Hablas con alguien de confianza para procesar lo sucedido','A','ACT','CE'),
-- P11
(11,1,'Casos reales, datos concretos y ejemplos prácticos','K','SNS','CE'),
(11,2,'Teorías, modelos conceptuales y pensamiento abstracto','V','INT','AC'),
(11,3,'Procedimientos paso a paso con instrucciones claras','R','SNS','CE'),
(11,4,'Exploración libre y descubrimiento de patrones','V','INT','AC'),
-- P12
(12,1,'Aplicar un método probado y conocido','K','SNS','CE'),
(12,2,'Inventar una solución creativa y novedosa','V','INT','AC'),
(12,3,'Buscar bibliografía y construir un marco teórico','R','INT','AC'),
(12,4,'Probar varias alternativas hasta encontrar la que funciona','K','SNS','AE'),
-- P13
(13,1,'La utilidad práctica e inmediata del conocimiento','K','SNS','CE'),
(13,2,'La profundidad conceptual aunque no sea aplicable ahora','V','INT','AC'),
(13,3,'La precisión, el detalle y la exactitud','R','SNS','CE'),
(13,4,'La innovación y la posibilidad de cambiar paradigmas','V','INT','AC'),
-- P14
(14,1,'Que sea realizable, con pasos concretos y medibles','K','SNS','CE'),
(14,2,'Que explore posibilidades nuevas y sea creativo','V','INT','AC'),
(14,3,'Que tenga una base sólida en teorías o modelos','R','INT','AC'),
(14,4,'Que incluya experiencias y aprendizaje práctico','K','SNS','AE'),
-- P15
(15,1,'Paso a paso, de lo simple a lo complejo','R','SEQ','AC'),
(15,2,'Primero el panorama general, luego los detalles','V','GLO','RO'),
(15,3,'En orden cronológico, siguiendo una secuencia lógica','R','SEQ','AC'),
(15,4,'En bloques temáticos aunque no sigan un orden lineal','V','GLO','RO'),
-- P16
(16,1,'Lo lees de principio a fin sin saltar capítulos','R','SEQ','AC'),
(16,2,'Hojeas primero para tener una idea global antes de leer','V','GLO','RO'),
(16,3,'Buscas el índice y seleccionas los temas más relevantes','R','SEQ','AC'),
(16,4,'Empiezas por lo que te parece más interesante, sin orden','V','GLO','RO'),
-- P17
(17,1,'De manera estructurada, argumentando cada paso','R','SEQ','AC'),
(17,2,'Empezando por la conclusión y luego explicando cómo llegaste','V','GLO','RO'),
(17,3,'Con ejemplos concretos que ilustran la lógica','K','SNS','CE'),
(17,4,'Conectando con ideas de otras áreas o disciplinas','V','GLO','RO'),
-- P18
(18,1,'Un gráfico, mapa o imagen visual que la represente','V','VIS','RO'),
(18,2,'Una frase clave o descripción que la resume','A','VRB','CE'),
(18,3,'Un ejemplo o anécdota que la ilustra','K','SNS','CE'),
(18,4,'Un esquema escrito con palabras clave','R','VRB','AC'),
-- P19
(19,1,'Ver un videotutorial con capturas y demostraciones','V','VIS','RO'),
(19,2,'Escuchar a alguien que te lo explique mientras lo ves','A','VRB','CE'),
(19,3,'Explorarlo tú solo hasta dominarlo','K','ACT','AE'),
(19,4,'Leer la guía de usuario paso a paso','R','SEQ','AC'),
-- P20
(20,1,'Dibujas esquemas, flechas y diagramas','V','VIS','RO'),
(20,2,'Anotas frases y palabras clave en texto','R','VRB','AC'),
(20,3,'Registras puntos clave con bullets y listas','R','VRB','AC'),
(20,4,'Apenas anotas, prefieres escuchar y absorber','A','VRB','CE'),
-- P21
(21,1,'Simulaciones, juegos de rol o experiencias inmersivas','K','ACT','CE'),
(21,2,'Debates, análisis de casos y reflexión grupal','A','REF','RO'),
(21,3,'Lecturas, conferencias y análisis teórico','R','REF','AC'),
(21,4,'Proyectos, experimentos y prototipos','K','ACT','AE'),
-- P22
(22,1,'La usas de inmediato para ajustar y mejorar','K','ACT','AE'),
(22,2,'La procesas internamente antes de hacer cambios','R','REF','RO'),
(22,3,'La evalúas críticamente para ver si es válida','R','INT','AC'),
(22,4,'La discutes con otras personas para entender mejor','A','ACT','CE'),
-- P23
(23,1,'Viviéndolas directamente: haciendo, sintiendo, experimentando','K','ACT','CE'),
(23,2,'Observando cómo otros lo hacen primero','V','REF','RO'),
(23,3,'Entendiendo el marco teórico antes de practicar','R','INT','AC'),
(23,4,'Probando diferentes enfoques hasta encontrar el mejor','K','ACT','AE'),
-- P24
(24,1,'A través de la intuición y lo que sientes en el momento','K','INT','CE'),
(24,2,'Observando patrones con calma y reflexión','V','REF','RO'),
(24,3,'Construyendo modelos lógicos y racionales','R','INT','AC'),
(24,4,'Probando hipótesis y viendo qué funciona en la práctica','K','ACT','AE'),
-- P25
(25,1,'Tu experiencia pasada y tus sensaciones','K','SNS','CE'),
(25,2,'Una reflexión profunda de los pros y contras','R','REF','RO'),
(25,3,'Análisis de datos y modelos conceptuales','R','INT','AC'),
(25,4,'Pruebas rápidas para ver qué da resultados','K','ACT','AE'),
-- P26
(26,1,'Experimentar con cambios hasta que funcione','K','ACT','AE'),
(26,2,'Pensar qué salió mal antes de volver a intentarlo','R','REF','RO'),
(26,3,'Buscar una explicación teórica del fallo','R','INT','AC'),
(26,4,'Pedir orientación a alguien con más experiencia','A','ACT','CE'),
-- P27
(27,1,'Práctico: aprendo haciendo y en la experiencia directa','K','SNS','CE'),
(27,2,'Observador: aprendo viendo, escuchando y reflexionando','V','REF','RO'),
(27,3,'Conceptual: aprendo entendiendo las ideas y teorías','R','INT','AC'),
(27,4,'Experimentador: aprendo probando y aplicando ideas','K','ACT','AE'),
-- P28
(28,1,'Saber que lo aplicarás en tu vida real o trabajo pronto','K','SNS','CE'),
(28,2,'La posibilidad de reflexionar y profundizar en el tema','R','REF','RO'),
(28,3,'Entender por qué funciona algo y cuál es su lógica','R','SEQ','AC'),
(28,4,'La posibilidad de innovar o resolver algo de forma nueva','V','INT','AE'),
-- P29
(29,1,'Actividades prácticas, trabajo en equipo y movimiento','K','ACT','CE'),
(29,2,'Tiempo para reflexionar y espacios de silencio','R','REF','RO'),
(29,3,'Material bien estructurado, lógico y detallado','R','SEQ','AC'),
(29,4,'Libertad para explorar, experimentar y crear','K','INT','AE'),
-- P30
(30,1,'Aprendo mejor cuando lo vivo de primera mano','K','SNS','CE'),
(30,2,'Necesito tiempo para observar y reflexionar antes de actuar','R','REF','RO'),
(30,3,'Me gustan los modelos claros que expliquen cómo funciona todo','R','INT','AC'),
(30,4,'Aprendo ensayando y ajustando hasta que algo funciona','K','ACT','AE');


-- Interpretación VARK
INSERT INTO interpretacion_vark VALUES
('V','Visual','Aprende mejor con imágenes, diagramas y representaciones gráficas.',
 ARRAY['Usa mapas mentales','Dibuja diagramas','Usa colores para categorizar','Busca infografías']),
('A','Auditivo','Aprende mejor escuchando debates, podcasts y explicaciones orales.',
 ARRAY['Graba y escucha tus apuntes','Participa en debates','Estudia en grupos de discusión','Usa mnemotecnia oral']),
('R','Lecto-escritura','Aprende mejor con textos escritos, listas, manuales y apuntes.',
 ARRAY['Escribe resúmenes','Toma notas detalladas','Reescribe en tus propias palabras','Usa listas y tablas']),
('K','Kinestésico','Aprende mejor con experiencias prácticas, ejemplos reales y actividades hands-on.',
 ARRAY['Practica con ejemplos reales','Aprende haciendo','Usa simulaciones','Relaciona con experiencias vividas']);


-- Interpretación ILS
INSERT INTO interpretacion_ils VALUES
('ACT','Activo','REF','Aprende haciendo, en grupo, con actividades y discusión.'),
('REF','Reflexivo','ACT','Aprende pensando primero, analizando en silencio, trabajando solo.'),
('SNS','Sensorial','INT','Prefiere hechos concretos, métodos probados y aplicaciones reales.'),
('INT','Intuitivo','SNS','Prefiere conceptos nuevos, teorías abstractas e innovación.'),
('VIS','Visual-ILS','VRB','Prefiere diagramas, gráficos y representaciones visuales.'),
('VRB','Verbal-ILS','VIS','Prefiere explicaciones escritas u orales, texto estructurado.'),
('SEQ','Secuencial','GLO','Aprende en pasos ordenados y lógicos, de lo simple a lo complejo.'),
('GLO','Global','SEQ','Capta el panorama general antes que los detalles. Aprende en saltos.');


-- Interpretación Kolb (estilos combinados)
INSERT INTO interpretacion_kolb VALUES
('Divergente',  'Imaginativo, sensible, empático. Bueno generando ideas y viendo múltiples perspectivas.','CE','RO'),
('Asimilador',  'Lógico, teórico, planificador. Bueno creando modelos conceptuales y organizando ideas.','RO','AC'),
('Convergente', 'Técnico, práctico, resolutivo. Bueno aplicando ideas y resolviendo problemas concretos.','AC','AE'),
('Acomodador',  'Adaptable, activo, orientado a resultados. Bueno ejecutando planes y asumiendo riesgos.','AE','CE');


-- Umbrales de nivel
INSERT INTO umbrales_nivel VALUES
('VARK', 8, 5, 3),
('ILS',  6, 4, 2),
('KOLB', 8, 5, 3);


-- ──────────────────────────────────────────────────────────────
-- 6. FUNCIÓN DE CÁLCULO
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calcular_resultado(p_sesion_id UUID)
RETURNS TABLE (
    modelo      TEXT,
    dimension   TEXT,
    nombre      TEXT,
    puntaje     INT,
    nivel       nivel_enum
)
LANGUAGE plpgsql AS $$
DECLARE
    v_vark   RECORD;
    v_ils    RECORD;
    v_kolb   RECORD;
    v_kolb_e kolb_estilo;

    v_vark_v INT; v_vark_a INT; v_vark_r INT; v_vark_k INT;
    v_ils_act INT; v_ils_ref INT; v_ils_sns INT; v_ils_int INT;
    v_ils_vis INT; v_ils_vrb INT; v_ils_seq INT; v_ils_glo INT;
    v_kolb_ce INT; v_kolb_ro INT; v_kolb_ac INT; v_kolb_ae INT;

    v_dom_vark vark_dim;

    -- Helper para calcular nivel
    FUNCTION get_nivel(p INT, p_modelo modelo_enum) RETURNS nivel_enum AS $f$
    DECLARE u umbrales_nivel%ROWTYPE;
    BEGIN
        SELECT * INTO u FROM aprendizaje.umbrales_nivel WHERE modelo = p_modelo;
        IF p >= u.muy_predominante THEN RETURN 'Muy predominante';
        ELSIF p >= u.moderado      THEN RETURN 'Moderado';
        ELSIF p >= u.presente      THEN RETURN 'Presente';
        ELSE                            RETURN 'Débil';
        END IF;
    END;
    $f$ LANGUAGE plpgsql;
BEGIN
    -- ── Acumular puntajes VARK ──────────────────────────────────────────────
    SELECT
        COALESCE(SUM(CASE WHEN o.dim_vark = 'V' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN o.dim_vark = 'A' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN o.dim_vark = 'R' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN o.dim_vark = 'K' THEN 1 ELSE 0 END), 0)
    INTO v_vark_v, v_vark_a, v_vark_r, v_vark_k
    FROM respuestas r
    JOIN opciones o ON o.pregunta_id = r.pregunta_id AND o.numero = r.opcion_num
    WHERE r.sesion_id = p_sesion_id;

    -- ── Acumular puntajes ILS ───────────────────────────────────────────────
    SELECT
        COALESCE(SUM(CASE WHEN o.dim_ils = 'ACT' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN o.dim_ils = 'REF' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN o.dim_ils = 'SNS' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN o.dim_ils = 'INT' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN o.dim_ils = 'VIS' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN o.dim_ils = 'VRB' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN o.dim_ils = 'SEQ' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN o.dim_ils = 'GLO' THEN 1 ELSE 0 END), 0)
    INTO v_ils_act, v_ils_ref, v_ils_sns, v_ils_int,
         v_ils_vis, v_ils_vrb, v_ils_seq, v_ils_glo
    FROM respuestas r
    JOIN opciones o ON o.pregunta_id = r.pregunta_id AND o.numero = r.opcion_num
    WHERE r.sesion_id = p_sesion_id;

    -- ── Acumular puntajes KOLB ──────────────────────────────────────────────
    SELECT
        COALESCE(SUM(CASE WHEN o.dim_kolb = 'CE' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN o.dim_kolb = 'RO' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN o.dim_kolb = 'AC' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN o.dim_kolb = 'AE' THEN 1 ELSE 0 END), 0)
    INTO v_kolb_ce, v_kolb_ro, v_kolb_ac, v_kolb_ae
    FROM respuestas r
    JOIN opciones o ON o.pregunta_id = r.pregunta_id AND o.numero = r.opcion_num
    WHERE r.sesion_id = p_sesion_id;

    -- ── Determinar estilo Kolb combinado ────────────────────────────────────
    SELECT ik.estilo INTO v_kolb_e
    FROM interpretacion_kolb ik
    ORDER BY (
        CASE ik.dim_a WHEN 'CE' THEN v_kolb_ce WHEN 'RO' THEN v_kolb_ro
                      WHEN 'AC' THEN v_kolb_ac  WHEN 'AE' THEN v_kolb_ae END
        +
        CASE ik.dim_b WHEN 'CE' THEN v_kolb_ce WHEN 'RO' THEN v_kolb_ro
                      WHEN 'AC' THEN v_kolb_ac  WHEN 'AE' THEN v_kolb_ae END
    ) DESC LIMIT 1;

    -- ── Estilo VARK dominante ───────────────────────────────────────────────
    SELECT d INTO v_dom_vark
    FROM (VALUES
        ('V'::vark_dim, v_vark_v),
        ('A'::vark_dim, v_vark_a),
        ('R'::vark_dim, v_vark_r),
        ('K'::vark_dim, v_vark_k)
    ) AS t(d, p)
    ORDER BY p DESC LIMIT 1;

    -- ── Guardar en tabla resultados ─────────────────────────────────────────
    INSERT INTO resultados (
        sesion_id,
        vark_v, vark_a, vark_r, vark_k, vark_dominante,
        ils_act, ils_ref, ils_sns, ils_int, ils_vis, ils_vrb, ils_seq, ils_glo,
        kolb_ce, kolb_ro, kolb_ac, kolb_ae, kolb_estilo
    ) VALUES (
        p_sesion_id,
        v_vark_v, v_vark_a, v_vark_r, v_vark_k, v_dom_vark,
        v_ils_act, v_ils_ref, v_ils_sns, v_ils_int, v_ils_vis, v_ils_vrb, v_ils_seq, v_ils_glo,
        v_kolb_ce, v_kolb_ro, v_kolb_ac, v_kolb_ae, v_kolb_e
    )
    ON CONFLICT (sesion_id) DO UPDATE SET
        calculado_en   = now(),
        vark_v         = EXCLUDED.vark_v,    vark_a         = EXCLUDED.vark_a,
        vark_r         = EXCLUDED.vark_r,    vark_k         = EXCLUDED.vark_k,
        vark_dominante = EXCLUDED.vark_dominante,
        ils_act = EXCLUDED.ils_act, ils_ref = EXCLUDED.ils_ref,
        ils_sns = EXCLUDED.ils_sns, ils_int = EXCLUDED.ils_int,
        ils_vis = EXCLUDED.ils_vis, ils_vrb = EXCLUDED.ils_vrb,
        ils_seq = EXCLUDED.ils_seq, ils_glo = EXCLUDED.ils_glo,
        kolb_ce = EXCLUDED.kolb_ce, kolb_ro = EXCLUDED.kolb_ro,
        kolb_ac = EXCLUDED.kolb_ac, kolb_ae = EXCLUDED.kolb_ae,
        kolb_estilo = EXCLUDED.kolb_estilo;

    UPDATE sesiones SET completado = TRUE, completado_en = now()
    WHERE id = p_sesion_id;

    -- ── Retornar tabla de resultados ────────────────────────────────────────
    -- VARK
    RETURN QUERY SELECT 'VARK','V', iv.nombre, v_vark_v, get_nivel(v_vark_v,'VARK'::modelo_enum) FROM interpretacion_vark iv WHERE iv.codigo='V';
    RETURN QUERY SELECT 'VARK','A', iv.nombre, v_vark_a, get_nivel(v_vark_a,'VARK'::modelo_enum) FROM interpretacion_vark iv WHERE iv.codigo='A';
    RETURN QUERY SELECT 'VARK','R', iv.nombre, v_vark_r, get_nivel(v_vark_r,'VARK'::modelo_enum) FROM interpretacion_vark iv WHERE iv.codigo='R';
    RETURN QUERY SELECT 'VARK','K', iv.nombre, v_vark_k, get_nivel(v_vark_k,'VARK'::modelo_enum) FROM interpretacion_vark iv WHERE iv.codigo='K';
    -- ILS
    RETURN QUERY SELECT 'ILS','ACT', ii.nombre, v_ils_act, get_nivel(v_ils_act,'ILS'::modelo_enum) FROM interpretacion_ils ii WHERE ii.codigo='ACT';
    RETURN QUERY SELECT 'ILS','REF', ii.nombre, v_ils_ref, get_nivel(v_ils_ref,'ILS'::modelo_enum) FROM interpretacion_ils ii WHERE ii.codigo='REF';
    RETURN QUERY SELECT 'ILS','SNS', ii.nombre, v_ils_sns, get_nivel(v_ils_sns,'ILS'::modelo_enum) FROM interpretacion_ils ii WHERE ii.codigo='SNS';
    RETURN QUERY SELECT 'ILS','INT', ii.nombre, v_ils_int, get_nivel(v_ils_int,'ILS'::modelo_enum) FROM interpretacion_ils ii WHERE ii.codigo='INT';
    RETURN QUERY SELECT 'ILS','VIS', ii.nombre, v_ils_vis, get_nivel(v_ils_vis,'ILS'::modelo_enum) FROM interpretacion_ils ii WHERE ii.codigo='VIS';
    RETURN QUERY SELECT 'ILS','VRB', ii.nombre, v_ils_vrb, get_nivel(v_ils_vrb,'ILS'::modelo_enum) FROM interpretacion_ils ii WHERE ii.codigo='VRB';
    RETURN QUERY SELECT 'ILS','SEQ', ii.nombre, v_ils_seq, get_nivel(v_ils_seq,'ILS'::modelo_enum) FROM interpretacion_ils ii WHERE ii.codigo='SEQ';
    RETURN QUERY SELECT 'ILS','GLO', ii.nombre, v_ils_glo, get_nivel(v_ils_glo,'ILS'::modelo_enum) FROM interpretacion_ils ii WHERE ii.codigo='GLO';
    -- KOLB
    RETURN QUERY SELECT 'KOLB','CE', ik.nombre, v_kolb_ce, get_nivel(v_kolb_ce,'KOLB'::modelo_enum) FROM (SELECT 'Experiencia Concreta'::TEXT AS nombre) ik;
    RETURN QUERY SELECT 'KOLB','RO', ik.nombre, v_kolb_ro, get_nivel(v_kolb_ro,'KOLB'::modelo_enum) FROM (SELECT 'Observación Reflexiva'::TEXT AS nombre) ik;
    RETURN QUERY SELECT 'KOLB','AC', ik.nombre, v_kolb_ac, get_nivel(v_kolb_ac,'KOLB'::modelo_enum) FROM (SELECT 'Conceptualización Abstracta'::TEXT AS nombre) ik;
    RETURN QUERY SELECT 'KOLB','AE', ik.nombre, v_kolb_ae, get_nivel(v_kolb_ae,'KOLB'::modelo_enum) FROM (SELECT 'Experimentación Activa'::TEXT AS nombre) ik;
END;
$$;


-- ──────────────────────────────────────────────────────────────
-- 7. VISTA DE RESULTADOS COMPLETOS
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW vista_resultados AS
SELECT
    s.id                AS sesion_id,
    s.nombre,
    s.email,
    s.completado_en,

    -- VARK
    r.vark_v, r.vark_a, r.vark_r, r.vark_k,
    r.vark_dominante::TEXT,
    iv.nombre           AS vark_dominante_nombre,

    -- ILS pares dominantes
    CASE WHEN r.ils_act >= r.ils_ref THEN 'Activo'    ELSE 'Reflexivo'  END AS ils_par1,
    CASE WHEN r.ils_sns >= r.ils_int THEN 'Sensorial' ELSE 'Intuitivo'  END AS ils_par2,
    CASE WHEN r.ils_vis >= r.ils_vrb THEN 'Visual'    ELSE 'Verbal'     END AS ils_par3,
    CASE WHEN r.ils_seq >= r.ils_glo THEN 'Secuencial'ELSE 'Global'     END AS ils_par4,

    -- Kolb
    r.kolb_ce, r.kolb_ro, r.kolb_ac, r.kolb_ae,
    r.kolb_estilo::TEXT,
    ik.descripcion      AS kolb_descripcion

FROM sesiones s
JOIN resultados r       ON r.sesion_id   = s.id
JOIN interpretacion_vark iv ON iv.codigo = r.vark_dominante
JOIN interpretacion_kolb ik ON ik.estilo = r.kolb_estilo;


-- ──────────────────────────────────────────────────────────────
-- 8. EJEMPLO DE USO
-- ──────────────────────────────────────────────────────────────
/*
-- Crear una sesión
INSERT INTO aprendizaje.sesiones (nombre, email)
VALUES ('María García', 'maria@example.com')
RETURNING id;   -- guarda el UUID devuelto

-- Registrar respuestas (una por pregunta)
INSERT INTO aprendizaje.respuestas (sesion_id, pregunta_id, opcion_num) VALUES
    ('uuid-aqui', 1, 3),
    ('uuid-aqui', 2, 3),
    -- ... (30 filas total)
    ('uuid-aqui', 30, 2);

-- Calcular y obtener resultados
SELECT * FROM aprendizaje.calcular_resultado('uuid-aqui');

-- Ver resumen
SELECT * FROM aprendizaje.vista_resultados WHERE sesion_id = 'uuid-aqui';
*/
