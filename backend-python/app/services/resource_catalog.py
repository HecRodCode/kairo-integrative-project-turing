"""
app/services/resource_catalog.py
"""

from typing import Dict, List

# Structure: MODULE_RESOURCES[module_key][learning_style] = [list of resources]
# Each resource is a dict with title, url, type (video|doc|practice|podcast)
MODULE_RESOURCES: Dict[str, Dict[str, List[Dict]]] = {

    "bases de datos": {
        "visual": [
            {"title": "Curso de PostgreSQL — Platzi", "url": "https://platzi.com/cursos/postgresql/", "type": "video"},
            {"title": "SQL Tutorial Visual — W3Schools", "url": "https://www.w3schools.com/sql/", "type": "doc"},
            {"title": "Diagrama ER explicado — Lucidchart", "url": "https://www.lucidchart.com/pages/es/tutorial-de-diagrama-entidad-relacion", "type": "doc"},
            {"title": "PostgreSQL para principiantes — YouTube freeCodeCamp", "url": "https://www.youtube.com/watch?v=qw--VYLpxG4", "type": "video"},
            {"title": "Visualización de JOINs — SQL Joins Explained", "url": "https://joins.spathon.com/", "type": "visual"},
            {"title": "DB Fiddle — practica SQL online", "url": "https://www.db-fiddle.com/", "type": "practice"},
        ],
        "kinesthetic": [
            {"title": "SQLZoo — ejercicios interactivos paso a paso", "url": "https://sqlzoo.net/wiki/SQL_Tutorial", "type": "practice"},
            {"title": "LeetCode Database Problems", "url": "https://leetcode.com/problemset/database/", "type": "practice"},
            {"title": "HackerRank SQL Challenges", "url": "https://www.hackerrank.com/domains/sql", "type": "practice"},
            {"title": "PostgreSQL Exercises", "url": "https://pgexercises.com/", "type": "practice"},
            {"title": "DB Fiddle — escribe y ejecuta SQL ahora", "url": "https://www.db-fiddle.com/", "type": "practice"},
            {"title": "SQLite Online — sin instalación", "url": "https://sqliteonline.com/", "type": "practice"},
        ],
        "reading": [
            {"title": "Documentación oficial PostgreSQL (ES)", "url": "https://www.postgresql.org/docs/current/", "type": "doc"},
            {"title": "Guía completa de SQL — Mode Analytics", "url": "https://mode.com/sql-tutorial/", "type": "doc"},
            {"title": "Artículo: Normalización de bases de datos — Dev.to", "url": "https://dev.to/helenanders26/sql-series-from-a-to-z-2pk9", "type": "doc"},
            {"title": "Use The Index, Luke! — optimización SQL", "url": "https://use-the-index-luke.com/es/sql/preface", "type": "doc"},
            {"title": "SQL Style Guide — Simon Holywell", "url": "https://www.sqlstyle.guide/es/", "type": "doc"},
        ],
        "auditory": [
            {"title": "Podcast: Base de Datos desde Cero — Código Facilito", "url": "https://open.spotify.com/show/3LWPAqJzJo7VGMviBHmQWQ", "type": "podcast"},
            {"title": "Video: SQL en español desde cero — TodoCode", "url": "https://www.youtube.com/watch?v=OuJerKzV5T0", "type": "video"},
            {"title": "Video: JOINs explicados oralmente — Midudev", "url": "https://www.youtube.com/watch?v=anNf2KGTpX8", "type": "video"},
            {"title": "Video: PostgreSQL tutorial completo — Fazt", "url": "https://www.youtube.com/watch?v=G3gnMSyX-XM", "type": "video"},
        ],
        "mixed": [
            {"title": "SQLZoo — ejercicios interactivos", "url": "https://sqlzoo.net/wiki/SQL_Tutorial", "type": "practice"},
            {"title": "W3Schools SQL Tutorial", "url": "https://www.w3schools.com/sql/", "type": "doc"},
            {"title": "PostgreSQL Tutorial completo — YouTube Fazt", "url": "https://www.youtube.com/watch?v=G3gnMSyX-XM", "type": "video"},
            {"title": "LeetCode Database Problems", "url": "https://leetcode.com/problemset/database/", "type": "practice"},
        ],
    },

    "python": {
        "visual": [
            {"title": "Python para principiantes — freeCodeCamp YouTube", "url": "https://www.youtube.com/watch?v=rfscVS0vtbw", "type": "video"},
            {"title": "Visualize Python — Python Tutor", "url": "https://pythontutor.com/python-debugger.html", "type": "visual"},
            {"title": "Mapa mental Python — Platzi", "url": "https://platzi.com/cursos/python/", "type": "video"},
            {"title": "Python Roadmap visual — roadmap.sh", "url": "https://roadmap.sh/python", "type": "visual"},
        ],
        "kinesthetic": [
            {"title": "Ejercicios Python — Exercism", "url": "https://exercism.org/tracks/python", "type": "practice"},
            {"title": "Python Challenges — HackerRank", "url": "https://www.hackerrank.com/domains/python", "type": "practice"},
            {"title": "Codewars Python Katas", "url": "https://www.codewars.com/?language=python", "type": "practice"},
            {"title": "Replit Python — corre código en el navegador", "url": "https://replit.com/languages/python3", "type": "practice"},
        ],
        "reading": [
            {"title": "Documentación oficial Python 3 (ES)", "url": "https://docs.python.org/es/3/", "type": "doc"},
            {"title": "Real Python — tutoriales detallados", "url": "https://realpython.com/", "type": "doc"},
            {"title": "Python Guide — Kenneth Reitz", "url": "https://docs.python-guide.org/", "type": "doc"},
            {"title": "Automate the Boring Stuff (gratis online)", "url": "https://automatetheboringstuff.com/", "type": "doc"},
        ],
        "auditory": [
            {"title": "Video: Python desde cero — Mouredev", "url": "https://www.youtube.com/watch?v=Kp4Mvapo5kc", "type": "video"},
            {"title": "Video: Python intermedio — Fazt Code", "url": "https://www.youtube.com/watch?v=DLikpfc64cA", "type": "video"},
            {"title": "Podcast: Python en español — Python en Español", "url": "https://www.ivoox.com/podcast-python-espanol_sq_f1237560_1.html", "type": "podcast"},
        ],
        "mixed": [
            {"title": "Python para todos — Dr. Chuck (gratis)", "url": "https://www.py4e.com/lessons", "type": "doc"},
            {"title": "Exercism Python Track", "url": "https://exercism.org/tracks/python", "type": "practice"},
            {"title": "Video: Python desde cero — Mouredev", "url": "https://www.youtube.com/watch?v=Kp4Mvapo5kc", "type": "video"},
        ],
    },

    "javascript": {
        "visual": [
            {"title": "JavaScript Visualizer — JS Tutor", "url": "https://pythontutor.com/javascript.html", "type": "visual"},
            {"title": "Curso JS visual — Platzi", "url": "https://platzi.com/cursos/basico-javascript/", "type": "video"},
            {"title": "JavaScript Roadmap visual — roadmap.sh", "url": "https://roadmap.sh/javascript", "type": "visual"},
            {"title": "Loupe — visualiza el event loop", "url": "http://latentflip.com/loupe/", "type": "visual"},
        ],
        "kinesthetic": [
            {"title": "JavaScript30 — 30 proyectos en 30 días", "url": "https://javascript30.com/", "type": "practice"},
            {"title": "Exercism JavaScript Track", "url": "https://exercism.org/tracks/javascript", "type": "practice"},
            {"title": "Codewars JavaScript", "url": "https://www.codewars.com/?language=javascript", "type": "practice"},
            {"title": "CodePen — corre JS en el navegador", "url": "https://codepen.io/", "type": "practice"},
        ],
        "reading": [
            {"title": "MDN Web Docs — JavaScript (ES)", "url": "https://developer.mozilla.org/es/docs/Web/JavaScript/Guide", "type": "doc"},
            {"title": "The Modern JavaScript Tutorial (ES)", "url": "https://es.javascript.info/", "type": "doc"},
            {"title": "You Don't Know JS (gratis en GitHub)", "url": "https://github.com/getify/You-Dont-Know-JS", "type": "doc"},
        ],
        "auditory": [
            {"title": "Video: JavaScript desde cero — Midudev", "url": "https://www.youtube.com/watch?v=Z34BF9PCfYg", "type": "video"},
            {"title": "Video: JS intermedio — Bluuweb", "url": "https://www.youtube.com/watch?v=RqQ1d1qEWlE", "type": "video"},
            {"title": "Podcast: Web Reactiva — JavaScript avanzado", "url": "https://www.danielprimo.io/podcast", "type": "podcast"},
        ],
        "mixed": [
            {"title": "The Modern JavaScript Tutorial", "url": "https://es.javascript.info/", "type": "doc"},
            {"title": "JavaScript30 — proyectos prácticos", "url": "https://javascript30.com/", "type": "practice"},
            {"title": "Video: JS desde cero — Midudev", "url": "https://www.youtube.com/watch?v=Z34BF9PCfYg", "type": "video"},
        ],
    },

    "html": {
        "visual": [
            {"title": "HTML Reference visual — htmlreference.io", "url": "https://htmlreference.io/", "type": "visual"},
            {"title": "CSS Reference visual — cssreference.io", "url": "https://cssreference.io/", "type": "visual"},
            {"title": "Flexbox Froggy — aprende Flexbox jugando", "url": "https://flexboxfroggy.com/#es", "type": "practice"},
            {"title": "CSS Grid Garden", "url": "https://cssgridgarden.com/#es", "type": "practice"},
        ],
        "kinesthetic": [
            {"title": "Frontend Mentor — proyectos reales HTML/CSS", "url": "https://www.frontendmentor.io/", "type": "practice"},
            {"title": "CodePen — escribe y ve el resultado en vivo", "url": "https://codepen.io/", "type": "practice"},
            {"title": "CSS Battle — retos de CSS", "url": "https://cssbattle.dev/", "type": "practice"},
        ],
        "reading": [
            {"title": "MDN HTML (ES)", "url": "https://developer.mozilla.org/es/docs/Web/HTML", "type": "doc"},
            {"title": "MDN CSS (ES)", "url": "https://developer.mozilla.org/es/docs/Web/CSS", "type": "doc"},
            {"title": "W3Schools HTML Tutorial", "url": "https://www.w3schools.com/html/", "type": "doc"},
        ],
        "auditory": [
            {"title": "Video: HTML y CSS desde cero — Fazt", "url": "https://www.youtube.com/watch?v=rr2H086z16s", "type": "video"},
            {"title": "Video: CSS moderno — Midudev", "url": "https://www.youtube.com/watch?v=N5wpD9Ov_To", "type": "video"},
        ],
        "mixed": [
            {"title": "W3Schools HTML Tutorial", "url": "https://www.w3schools.com/html/", "type": "doc"},
            {"title": "Frontend Mentor — proyectos reales", "url": "https://www.frontendmentor.io/", "type": "practice"},
            {"title": "Video: HTML/CSS desde cero — Fazt", "url": "https://www.youtube.com/watch?v=rr2H086z16s", "type": "video"},
        ],
    },
}

# Performance test simulation resources — used for Week 4 Day 20
PERFORMANCE_TEST_RESOURCES: Dict[str, List[Dict]] = {
    "bases de datos": [
        {"title": "PostgreSQL Exercises — práctica intensiva", "url": "https://pgexercises.com/", "type": "practice"},
        {"title": "LeetCode SQL — problemas de nivel medio/difícil", "url": "https://leetcode.com/problemset/database/", "type": "practice"},
        {"title": "HackerRank SQL Advanced", "url": "https://www.hackerrank.com/domains/sql?filters%5Bdifficulty%5D%5B%5D=hard", "type": "practice"},
    ],
    "python": [
        {"title": "HackerRank Python Hard", "url": "https://www.hackerrank.com/domains/python", "type": "practice"},
        {"title": "Exercism Python — ejercicios avanzados", "url": "https://exercism.org/tracks/python", "type": "practice"},
    ],
    "javascript": [
        {"title": "Codewars JS — katas nivel 4-5", "url": "https://www.codewars.com/?language=javascript", "type": "practice"},
        {"title": "JavaScript30 — proyecto completo", "url": "https://javascript30.com/", "type": "practice"},
    ],
    "html": [
        {"title": "Frontend Mentor — challenge intermedio", "url": "https://www.frontendmentor.io/challenges?difficulty=2", "type": "practice"},
        {"title": "CSS Battle — reto final", "url": "https://cssbattle.dev/", "type": "practice"},
    ],
}


def get_resources_for_module(module_name: str, learning_style: str, count: int = 2) -> List[Dict]:
    """
    Returns a list of verified resources for a given module and learning style.
    Falls back to 'mixed' if the style is not found.
    Falls back to bases de datos if module not recognized.
    """
    module_key = _normalize_module(module_name)
    style_key  = _normalize_style(learning_style)

    module_catalog = MODULE_RESOURCES.get(module_key, MODULE_RESOURCES["bases de datos"])
    resources = module_catalog.get(style_key, module_catalog.get("mixed", []))

    # Return up to `count` resources — rotate based on a simple hash to vary per day
    return resources[:count] if len(resources) >= count else resources


def get_performance_test_resources(module_name: str) -> List[Dict]:
    """Returns resources specifically for the Week 4 Day 20 performance simulation."""
    module_key = _normalize_module(module_name)
    return PERFORMANCE_TEST_RESOURCES.get(module_key, PERFORMANCE_TEST_RESOURCES["bases de datos"])


def format_resources_for_prompt(resources: List[Dict]) -> str:
    """Formats a resource list into a string the LLM can include verbatim in JSON."""
    return ", ".join(f'"{r["url"]}"' for r in resources)


def _normalize_module(module_name: str) -> str:
    name = (module_name or "").lower().strip()
    if any(k in name for k in ["dato", "sql", "database", "db"]):
        return "bases de datos"
    if "python" in name:
        return "python"
    if any(k in name for k in ["javascript", "js", "node"]):
        return "javascript"
    if any(k in name for k in ["html", "css", "web", "front"]):
        return "html"
    return "bases de datos"


def _normalize_style(style: str) -> str:
    s = (style or "mixed").lower().strip()
    if s in ("visual", "v"):                         return "visual"
    if s in ("kinesthetic", "kinestésico", "k"):     return "kinesthetic"
    if s in ("reading", "read", "lectura", "r"):     return "reading"
    if s in ("auditory", "auditivo", "aural", "a"):  return "auditory"
    return "mixed"