# Documentación — Kairo

## Estructura

```
docs/
├── ARCHITECTURE.md                   # Arquitectura general del sistema
├── SPRINTS.md                        # Planificación de sprints
├── USER_STORIES.md                   # Historias de usuario
│
├── entregables/                      # Documentos del proyecto integrador
│   ├── 01_modelo_relacional_diccionario.md
│   ├── 02_persistencia_progreso.md
│   ├── 03_diagramas_modelado.md
│   └── DOCUMENTACION_BASE_DATOS.md
│
├── diagramas/                        # Diagramas e imágenes
│   ├── dbdiagram Entidad Relacion.png
│   └── Diagrama de Componentes.png
│
├── referencias/                      # PDFs de los modelos teóricos
│   ├── ILS.pdf                       # Felder-Silverman (44 preguntas original)
│   ├── the-kolb-learning-style-inventory-4-0.pdf
│   └── vark-questionnaire.pdf        # VARK v7.8 (16 preguntas original)
│
└── test-aprendizaje/                 # Motor de cálculo del test
    ├── preguntas.json                # Banco de 30 preguntas (VARK + ILS + Kolb)
    ├── calcular_resultados.py        # Motor Python (CLI / JSON / demo)
    └── schema_softskills.sql         # Schema PostgreSQL del test
```

## Test de Estilos de Aprendizaje

El test combina 3 modelos en 30 preguntas:

| Modelo | Bloques | Preguntas | Dimensiones |
|--------|---------|-----------|-------------|
| VARK | 1-2 | 1-6 | V, A, R, K |
| ILS (Felder-Silverman) | 3-5 | 7-20 | ACT/REF, SNS/INT, VIS/VRB, SEQ/GLO |
| Kolb | 6-7 | 21-30 | CE, RO, AC, AE |

### Ejecutar el motor de cálculo

```bash
cd docs/test-aprendizaje

# Modo demo con respuestas predefinidas
python calcular_resultados.py --demo

# Modo interactivo (CLI)
python calcular_resultados.py

# Modo JSON (stdin/stdout)
echo '{"respuestas": [...]}' | python calcular_resultados.py --json
```

## Base de Datos

El schema principal está en `database/schema.sql`. Los documentos de análisis están en `entregables/`.
