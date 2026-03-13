"""
Motor de cálculo del Test de Estilos de Aprendizaje
Modelos integrados: VARK · ILS (Felder-Silverman) · Kolb

Alineado con onboarding-data.js (frontend) y diagnosticControllers.js (backend).
Formato de respuestas: [{questionId, optionId, score}] donde score es un tag único.

Uso:
    python calcular_resultados.py              # Modo interactivo (CLI)
    python calcular_resultados.py --json       # Input/output JSON
    python calcular_resultados.py --demo       # Ejecuta con respuestas de ejemplo
"""

import json
import sys
import argparse
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Tuple


# ─── Tags por modelo ──────────────────────────────────────────────────────────

VARK_TAGS = {"V", "A", "R", "K"}
ILS_TAGS = {"ACT", "REF", "SNS", "INT", "VIS", "VRB", "SEQ", "GLO"}
KOLB_TAGS = {"CE", "RO", "AC", "AE"}


# ─── Cargar banco de preguntas ─────────────────────────────────────────────────

def cargar_preguntas(ruta: str = "preguntas.json") -> dict:
    with open(ruta, "r", encoding="utf-8") as f:
        return json.load(f)


# ─── Calcular puntajes (formato single-tag) ───────────────────────────────────

def calcular_puntajes(respuestas: List[dict], datos: dict) -> Dict[str, Dict[str, int]]:
    """
    Recibe una lista de respuestas [{questionId, optionId, score}]
    donde score es un tag único (V, A, REF, CE, etc.).
    Retorna puntajes acumulados por modelo y dimensión.
    """
    puntajes = {
        "vark": defaultdict(int),
        "ils": defaultdict(int),
        "kolb": defaultdict(int),
    }

    for resp in respuestas:
        tag = resp.get("score", "")
        if not tag:
            continue

        if tag in VARK_TAGS:
            puntajes["vark"][tag] += 1
        elif tag in ILS_TAGS:
            puntajes["ils"][tag] += 1
        elif tag in KOLB_TAGS:
            puntajes["kolb"][tag] += 1

    return {k: dict(v) for k, v in puntajes.items()}


def calcular_puntajes_desde_opciones(respuestas_raw: Dict[int, int], datos: dict) -> List[dict]:
    """
    Convierte respuestas del formato CLI {id_pregunta: opcion_elegida (1-4)}
    al formato [{questionId, optionId, score}] que usa el sistema real.
    """
    respuestas = []
    preguntas_map = {p["id"]: p for p in datos["preguntas"]}

    for qid, opcion in respuestas_raw.items():
        if opcion not in (1, 2, 3, 4):
            raise ValueError(f"Pregunta {qid}: respuesta inválida '{opcion}'. Solo 1-4.")
        pregunta = preguntas_map.get(qid)
        if not pregunta:
            continue
        idx = opcion - 1
        tag = pregunta["clave"][idx]
        respuestas.append({
            "questionId": qid,
            "optionId": f"q{qid}o{opcion}",
            "score": tag,
        })

    return respuestas


# ─── Interpretar nivel ─────────────────────────────────────────────────────────

def nivel(puntaje: int, umbrales: dict) -> str:
    if puntaje >= umbrales["muy_predominante"]:
        return "Muy predominante"
    if puntaje >= umbrales["moderado"]:
        return "Moderado"
    if puntaje >= umbrales["presente"]:
        return "Presente"
    return "Débil"


# ─── Determinar estilos dominantes ────────────────────────────────────────────

def dominante(puntajes_dim: Dict[str, int], opciones: List[str]) -> str:
    return max(opciones, key=lambda d: puntajes_dim.get(d, 0))


def estilo_kolb(puntajes_kolb: Dict[str, int]) -> Tuple[str, dict]:
    estilos = {
        "Divergente":  puntajes_kolb.get("CE", 0) + puntajes_kolb.get("RO", 0),
        "Asimilador":  puntajes_kolb.get("RO", 0) + puntajes_kolb.get("AC", 0),
        "Convergente": puntajes_kolb.get("AC", 0) + puntajes_kolb.get("AE", 0),
        "Acomodador":  puntajes_kolb.get("AE", 0) + puntajes_kolb.get("CE", 0),
    }
    nombre = max(estilos, key=estilos.get)
    return nombre, estilos


# ─── Derivar soft skills (replica diagnosticControllers.js) ───────────────────

def derivar_soft_skills(tally: Dict[str, int]) -> Dict[str, int]:
    """
    Replica la lógica de deriveSoftSkillScores() de diagnosticControllers.js.
    """
    def scale(count, max_val):
        return min(5, max(1, round((count / max_val) * 4) + 1))

    return {
        "autonomy": scale(tally.get("REF", 0) + tally.get("AC", 0) + tally.get("RO", 0), 12),
        "time_management": scale(tally.get("SEQ", 0) + tally.get("AE", 0) + tally.get("SNS", 0), 14),
        "problem_solving": scale(tally.get("GLO", 0) + tally.get("AC", 0) + tally.get("INT", 0), 14),
        "communication": scale(tally.get("ACT", 0) + tally.get("CE", 0) + tally.get("VRB", 0), 14),
        "teamwork": scale(tally.get("ACT", 0) + tally.get("CE", 0) + tally.get("SNS", 0), 14),
    }


def derivar_learning_style(tally: Dict[str, int]) -> str:
    """
    Replica deriveLearningStyle() de diagnosticControllers.js.
    """
    vark = {
        "visual": tally.get("V", 0) + tally.get("VIS", 0),
        "auditory": tally.get("A", 0) + tally.get("VRB", 0),
        "reading": tally.get("R", 0),
        "kinesthetic": tally.get("K", 0),
    }
    total = sum(vark.values())
    if total == 0:
        return "mixed"
    max_val = max(vark.values())
    dom = max(vark, key=vark.get)
    if max_val / total < 0.35:
        return "mixed"
    return dom


# ─── Construir resultado completo ──────────────────────────────────────────────

def generar_resultado(respuestas: List[dict], datos: dict) -> dict:
    interp = datos["interpretacion"]
    niveles = interp["niveles"]
    puntajes = calcular_puntajes(respuestas, datos)

    # Tally plano para soft skills (combina todos los tags)
    tally = {}
    for modelo_scores in puntajes.values():
        for tag, count in modelo_scores.items():
            tally[tag] = tally.get(tag, 0) + count

    # ── VARK ──────────────────────────────────────────────────────────────────
    vark_dims = ["V", "A", "R", "K"]
    vark_scores = {d: puntajes["vark"].get(d, 0) for d in vark_dims}
    vark_dom = dominante(vark_scores, vark_dims)

    vark_resultado = {
        "puntajes": vark_scores,
        "dominante": {
            "codigo": vark_dom,
            "nombre": interp["vark"][vark_dom]["nombre"],
            "descripcion": interp["vark"][vark_dom]["descripcion"],
            "estrategias": interp["vark"][vark_dom]["estrategias"],
        },
        "detalle": {
            d: {
                "puntaje": vark_scores[d],
                "nivel": nivel(vark_scores[d], niveles["vark"]),
                "nombre": interp["vark"][d]["nombre"],
            }
            for d in vark_dims
        },
    }

    # ── ILS ───────────────────────────────────────────────────────────────────
    pares_ils = [
        ("ACT", "REF"),
        ("SNS", "INT"),
        ("VIS", "VRB"),
        ("SEQ", "GLO"),
    ]
    ils_resultado = {
        "pares": {},
        "puntajes_brutos": {d: puntajes["ils"].get(d, 0) for dims in pares_ils for d in dims},
    }

    for a, b in pares_ils:
        sa = puntajes["ils"].get(a, 0)
        sb = puntajes["ils"].get(b, 0)
        dom = a if sa >= sb else b
        diferencia = abs(sa - sb)
        ils_resultado["pares"][f"{a}/{b}"] = {
            "dominante": {
                "codigo": dom,
                "nombre": interp["ils"][dom]["nombre"],
                "descripcion": interp["ils"][dom]["descripcion"],
            },
            "puntaje_a": {a: sa, "nivel": nivel(sa, niveles["ils"]), "nombre": interp["ils"][a]["nombre"]},
            "puntaje_b": {b: sb, "nivel": nivel(sb, niveles["ils"]), "nombre": interp["ils"][b]["nombre"]},
            "diferencia": diferencia,
            "equilibrio": diferencia <= 2,
        }

    # ── KOLB ──────────────────────────────────────────────────────────────────
    kolb_dims = ["CE", "RO", "AC", "AE"]
    kolb_scores = {d: puntajes["kolb"].get(d, 0) for d in kolb_dims}
    nombre_kolb, estilos_suma = estilo_kolb(kolb_scores)

    kolb_resultado = {
        "puntajes": kolb_scores,
        "estilo_combinado": {
            "nombre": nombre_kolb,
            "descripcion": interp["kolb_estilos_combinados"][nombre_kolb]["descripcion"],
            "dimensiones_dominantes": interp["kolb_estilos_combinados"][nombre_kolb]["dominantes"],
        },
        "puntajes_combinados": estilos_suma,
        "detalle": {
            d: {
                "puntaje": kolb_scores[d],
                "nivel": nivel(kolb_scores[d], niveles["kolb"]),
                "nombre": interp["kolb"][d]["nombre"],
            }
            for d in kolb_dims
        },
    }

    # ── Soft Skills (replica diagnosticControllers.js) ─────────────────────────
    soft_skills = derivar_soft_skills(tally)
    learning_style = derivar_learning_style(tally)

    # ── Resumen ejecutivo ──────────────────────────────────────────────────────
    ils_dominantes_str = " | ".join(
        v["dominante"]["nombre"] for v in ils_resultado["pares"].values()
    )

    resultado = {
        "total_preguntas_respondidas": len(respuestas),
        "vark": vark_resultado,
        "ils": ils_resultado,
        "kolb": kolb_resultado,
        "soft_skills": soft_skills,
        "learning_style": learning_style,
        "resumen": {
            "vark": f"{vark_resultado['dominante']['nombre']} ({vark_dom})",
            "ils": ils_dominantes_str,
            "kolb": nombre_kolb,
            "learning_style": learning_style,
        },
    }
    return resultado


# ─── Formatear salida en texto ─────────────────────────────────────────────────

def formatear_texto(resultado: dict) -> str:
    SEP = "\u2500" * 60
    lines = []

    def h(titulo):
        lines.append(f"\n{'\u2550'*60}")
        lines.append(f"  {titulo}")
        lines.append(f"{'\u2550'*60}")

    def s(titulo):
        lines.append(f"\n{SEP}")
        lines.append(f"  {titulo}")
        lines.append(SEP)

    h("RESULTADOS \u2014 TEST DE ESTILOS DE APRENDIZAJE")
    lines.append(f"  Preguntas respondidas: {resultado['total_preguntas_respondidas']}/30\n")

    # ── VARK ──
    h("MODELO VARK \u2014 Preferencia Sensorial")
    vark = resultado["vark"]
    lines.append(f"  Estilo dominante: {vark['dominante']['nombre']}")
    lines.append(f"     {vark['dominante']['descripcion']}\n")
    lines.append("  Estrategias recomendadas:")
    for e in vark["dominante"]["estrategias"]:
        lines.append(f"    - {e}")
    lines.append("")
    lines.append("  Puntajes por dimension:")
    for cod, det in vark["detalle"].items():
        bar = "#" * det["puntaje"]
        lines.append(f"    {det['nombre']:20s}  {det['puntaje']:2d}  {bar:10s}  [{det['nivel']}]")

    # ── ILS ──
    h("MODELO ILS (Felder-Silverman) \u2014 Dimensiones Cognitivas")
    for par, info in resultado["ils"]["pares"].items():
        dom = info["dominante"]
        eq = " <- equilibrado" if info["equilibrio"] else ""
        lines.append(f"  {par:10s}  ->  {dom['nombre']:15s} (D={info['diferencia']}){eq}")
        lines.append(f"               {dom['descripcion']}")

    # ── KOLB ──
    h("MODELO KOLB \u2014 Ciclo Experiencial")
    kolb = resultado["kolb"]
    lines.append(f"  Estilo Kolb: {kolb['estilo_combinado']['nombre']}")
    lines.append(f"     {kolb['estilo_combinado']['descripcion']}\n")
    lines.append("  Puntajes por fase:")
    for cod, det in kolb["detalle"].items():
        bar = "#" * det["puntaje"]
        lines.append(f"    {det['nombre']:30s}  {det['puntaje']:2d}  {bar:10s}  [{det['nivel']}]")
    lines.append("\n  Puntuacion de estilos combinados:")
    for estilo, suma in kolb["puntajes_combinados"].items():
        lines.append(f"    {estilo:15s}: {suma}")

    # ── Soft Skills ──
    h("SOFT SKILLS (derivadas para la BD)")
    ss = resultado["soft_skills"]
    lines.append(f"  autonomy:        {ss['autonomy']}/5")
    lines.append(f"  time_management: {ss['time_management']}/5")
    lines.append(f"  problem_solving: {ss['problem_solving']}/5")
    lines.append(f"  communication:   {ss['communication']}/5")
    lines.append(f"  teamwork:        {ss['teamwork']}/5")
    lines.append(f"  learning_style:  {resultado['learning_style']}")

    # ── Resumen ──
    h("RESUMEN EJECUTIVO")
    r = resultado["resumen"]
    lines.append(f"  VARK : {r['vark']}")
    lines.append(f"  ILS  : {r['ils']}")
    lines.append(f"  Kolb : {r['kolb']}")
    lines.append(f"  Style: {r['learning_style']}")

    lines.append(f"\n{'\u2550'*60}\n")
    return "\n".join(lines)


# ─── Modo interactivo CLI ──────────────────────────────────────────────────────

def modo_interactivo(datos: dict) -> List[dict]:
    print("\n" + "=" * 60)
    print("  TEST DE ESTILOS DE APRENDIZAJE")
    print("  VARK - Felder-Silverman ILS - Kolb")
    print("=" * 60)
    print("  Instrucciones: Para cada pregunta escribe 1, 2, 3 o 4.")
    print("  Elige la opcion que MAS te represente.\n")

    respuestas_raw = {}
    bloque_actual = None

    for pregunta in datos["preguntas"]:
        bloque = next(
            (b for b in datos["meta"]["bloques"] if pregunta["id"] in b["preguntas"]),
            None,
        )
        if bloque and bloque["id"] != bloque_actual:
            bloque_actual = bloque["id"]
            print(f"\n  -- Bloque {bloque['id']}: {bloque['nombre']} --")

        print(f"\n  [{pregunta['id']:02d}/30] {pregunta['texto']}")
        for i, op in enumerate(pregunta["opciones"], 1):
            print(f"       {i}. {op}")

        while True:
            try:
                r = int(input("  Tu respuesta (1-4): ").strip())
                if r in (1, 2, 3, 4):
                    respuestas_raw[pregunta["id"]] = r
                    break
                print("  Por favor escribe solo 1, 2, 3 o 4.")
            except (ValueError, KeyboardInterrupt):
                print("\n  Test cancelado.")
                sys.exit(0)

    return calcular_puntajes_desde_opciones(respuestas_raw, datos)


# ─── Respuestas de ejemplo (modo --demo) ──────────────────────────────────────

RESPUESTAS_DEMO = {
    # Bloque 1 - VARK: mayormente Visual
    1: 1, 2: 1, 3: 1, 4: 1,
    # Bloque 2 - VARK: mayormente Visual
    5: 1, 6: 1,
    # Bloque 3 - ILS: REF, SNS, VIS, SEQ
    7: 1, 8: 1, 9: 1, 10: 1,
    # Bloque 4 - ILS: ACT, SNS, VIS, SEQ
    11: 1, 12: 1, 13: 1, 14: 1,
    # Bloque 5 - ILS: SNS, SNS, VIS, SEQ, ACT, SNS
    15: 1, 16: 1, 17: 1, 18: 1, 19: 1, 20: 1,
    # Bloque 6 - Kolb: RO, CE, CE, CE, CE
    21: 1, 22: 1, 23: 1, 24: 1, 25: 1,
    # Bloque 7 - Kolb: AE, AE, CE, AE, CE
    26: 1, 27: 1, 28: 1, 29: 1, 30: 1,
}


# ─── Entry point ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Motor de calculo - Test Estilos de Aprendizaje"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help='Lee respuestas de stdin como JSON [{questionId, optionId, score}] y devuelve resultado JSON',
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Ejecuta con respuestas de ejemplo predefinidas",
    )
    parser.add_argument(
        "--banco",
        default="preguntas.json",
        help="Ruta al archivo JSON del banco de preguntas",
    )
    args = parser.parse_args()

    datos = cargar_preguntas(args.banco)

    if args.json:
        # Modo API: lee {"respuestas": [{questionId, optionId, score}, ...]}
        entrada = json.load(sys.stdin)
        respuestas = entrada["respuestas"]
        resultado = generar_resultado(respuestas, datos)
        print(json.dumps(resultado, ensure_ascii=False, indent=2))

    elif args.demo:
        print("\n[MODO DEMO] Usando respuestas predefinidas...\n")
        respuestas = calcular_puntajes_desde_opciones(RESPUESTAS_DEMO, datos)
        resultado = generar_resultado(respuestas, datos)
        print(formatear_texto(resultado))

    else:
        respuestas = modo_interactivo(datos)
        resultado = generar_resultado(respuestas, datos)
        print(formatear_texto(resultado))

        # Guardar resultado en JSON
        salida = Path("resultado_usuario.json")
        with open(salida, "w", encoding="utf-8") as f:
            json.dump(
                {"respuestas": respuestas, "resultado": resultado},
                f,
                ensure_ascii=False,
                indent=2,
            )
        print(f"\n  Resultado guardado en: {salida}\n")


if __name__ == "__main__":
    main()
