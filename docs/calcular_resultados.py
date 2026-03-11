"""
Motor de cálculo del Test de Estilos de Aprendizaje
Modelos integrados: VARK · ILS (Felder-Soloman) · Kolb

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


# ─── Cargar banco de preguntas ─────────────────────────────────────────────────

def cargar_preguntas(ruta: str = "preguntas.json") -> dict:
    with open(ruta, "r", encoding="utf-8") as f:
        return json.load(f)


# ─── Calcular puntajes ─────────────────────────────────────────────────────────

def calcular_puntajes(respuestas: Dict[int, int], datos: dict) -> Dict[str, Dict[str, int]]:
    """
    Recibe un dict {id_pregunta: opcion_elegida} donde opcion_elegida es 1, 2, 3 o 4.
    Retorna puntajes acumulados por modelo y dimensión.
    """
    puntajes = {
        "vark": defaultdict(int),  # V, A, R, K
        "ils":  defaultdict(int),  # ACT, REF, SNS, INT, VIS, VRB, SEQ, GLO
        "kolb": defaultdict(int),  # CE, RO, AC, AE
    }

    for pregunta in datos["preguntas"]:
        qid = pregunta["id"]
        if qid not in respuestas:
            continue

        opcion = respuestas[qid]           # 1 a 4
        if opcion not in (1, 2, 3, 4):
            raise ValueError(f"Pregunta {qid}: respuesta inválida '{opcion}'. Solo 1-4.")

        idx = opcion - 1                   # índice 0-3
        clave = pregunta["clave"]

        puntajes["vark"][clave["vark"][idx]] += 1
        puntajes["ils"][clave["ils"][idx]]   += 1
        puntajes["kolb"][clave["kolb"][idx]] += 1

    return {k: dict(v) for k, v in puntajes.items()}


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
    """Retorna la dimensión con mayor puntaje entre las opciones dadas."""
    return max(opciones, key=lambda d: puntajes_dim.get(d, 0))


def estilo_kolb(puntajes_kolb: Dict[str, int]) -> Tuple[str, str]:
    """Determina el estilo Kolb combinado (CE+RO=Divergente, etc.)."""
    estilos = {
        "Divergente":  puntajes_kolb.get("CE", 0) + puntajes_kolb.get("RO", 0),
        "Asimilador":  puntajes_kolb.get("RO", 0) + puntajes_kolb.get("AC", 0),
        "Convergente": puntajes_kolb.get("AC", 0) + puntajes_kolb.get("AE", 0),
        "Acomodador":  puntajes_kolb.get("AE", 0) + puntajes_kolb.get("CE", 0),
    }
    nombre = max(estilos, key=estilos.get)
    return nombre, estilos


# ─── Construir resultado completo ──────────────────────────────────────────────

def generar_resultado(respuestas: Dict[int, int], datos: dict) -> dict:
    interp  = datos["interpretacion"]
    niveles = interp["niveles"]
    puntajes = calcular_puntajes(respuestas, datos)

    # ── VARK ──────────────────────────────────────────────────────────────────
    vark_dims   = ["V", "A", "R", "K"]
    vark_scores = {d: puntajes["vark"].get(d, 0) for d in vark_dims}
    vark_dom    = dominante(vark_scores, vark_dims)

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
        ("ACT", "REF"),   # Activo / Reflexivo
        ("SNS", "INT"),   # Sensorial / Intuitivo
        ("VIS", "VRB"),   # Visual / Verbal
        ("SEQ", "GLO"),   # Secuencial / Global
    ]
    ils_resultado = {"pares": {}, "puntajes_brutos": {d: puntajes["ils"].get(d, 0) for dims in pares_ils for d in dims}}

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
    kolb_dims   = ["CE", "RO", "AC", "AE"]
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

    # ── Resumen ejecutivo ──────────────────────────────────────────────────────
    ils_dominantes_str = " | ".join(
        v["dominante"]["nombre"]
        for v in ils_resultado["pares"].values()
    )

    resultado = {
        "total_preguntas_respondidas": len(respuestas),
        "vark":    vark_resultado,
        "ils":     ils_resultado,
        "kolb":    kolb_resultado,
        "resumen": {
            "vark":  f"{vark_resultado['dominante']['nombre']} ({vark_dom})",
            "ils":   ils_dominantes_str,
            "kolb":  nombre_kolb,
        },
    }
    return resultado


# ─── Formatear salida en texto ─────────────────────────────────────────────────

def formatear_texto(resultado: dict) -> str:
    SEP = "─" * 60
    lines = []

    def h(titulo):
        lines.append(f"\n{'═'*60}")
        lines.append(f"  {titulo}")
        lines.append(f"{'═'*60}")

    def s(titulo):
        lines.append(f"\n{SEP}")
        lines.append(f"  {titulo}")
        lines.append(SEP)

    h("RESULTADOS — TEST DE ESTILOS DE APRENDIZAJE")
    lines.append(f"  Preguntas respondidas: {resultado['total_preguntas_respondidas']}/30\n")

    # ── VARK ──
    h("MODELO VARK — Preferencia Sensorial")
    vark = resultado["vark"]
    lines.append(f"  🏆 Estilo dominante: {vark['dominante']['nombre']}")
    lines.append(f"     {vark['dominante']['descripcion']}\n")
    lines.append("  Estrategias recomendadas:")
    for e in vark["dominante"]["estrategias"]:
        lines.append(f"    • {e}")
    lines.append("")
    lines.append("  Puntajes por dimensión:")
    for cod, det in vark["detalle"].items():
        bar = "█" * det["puntaje"]
        lines.append(f"    {det['nombre']:20s}  {det['puntaje']:2d}  {bar:15s}  [{det['nivel']}]")

    # ── ILS ──
    h("MODELO ILS (Felder-Soloman) — Dimensiones Cognitivas")
    for par, info in resultado["ils"]["pares"].items():
        dom = info["dominante"]
        eq  = " ← equilibrado" if info["equilibrio"] else ""
        lines.append(f"  {par:10s}  →  {dom['nombre']:15s} (Δ={info['diferencia']}){eq}")
        lines.append(f"               {dom['descripcion']}")

    # ── KOLB ──
    h("MODELO KOLB — Ciclo Experiencial")
    kolb = resultado["kolb"]
    lines.append(f"  🏆 Estilo Kolb: {kolb['estilo_combinado']['nombre']}")
    lines.append(f"     {kolb['estilo_combinado']['descripcion']}\n")
    lines.append("  Puntajes por fase:")
    for cod, det in kolb["detalle"].items():
        bar = "█" * det["puntaje"]
        lines.append(f"    {det['nombre']:30s}  {det['puntaje']:2d}  {bar:15s}  [{det['nivel']}]")
    lines.append("\n  Puntuación de estilos combinados:")
    for estilo, suma in kolb["puntajes_combinados"].items():
        lines.append(f"    {estilo:15s}: {suma}")

    # ── Resumen ──
    h("RESUMEN EJECUTIVO")
    r = resultado["resumen"]
    lines.append(f"  VARK : {r['vark']}")
    lines.append(f"  ILS  : {r['ils']}")
    lines.append(f"  Kolb : {r['kolb']}")

    lines.append(f"\n{'═'*60}\n")
    return "\n".join(lines)


# ─── Modo interactivo CLI ──────────────────────────────────────────────────────

def modo_interactivo(datos: dict) -> Dict[int, int]:
    print("\n" + "═"*60)
    print("  TEST DE ESTILOS DE APRENDIZAJE")
    print("  VARK · Felder-Soloman ILS · Kolb")
    print("═"*60)
    print("  Instrucciones: Para cada pregunta escribe 1, 2, 3 o 4.")
    print("  Elige la opción que MÁS te represente.\n")

    respuestas = {}
    bloque_actual = None

    for pregunta in datos["preguntas"]:
        # Mostrar encabezado de bloque si cambia
        bloque = next((b for b in datos["meta"]["bloques"] if pregunta["id"] in b["preguntas"]), None)
        if bloque and bloque["id"] != bloque_actual:
            bloque_actual = bloque["id"]
            print(f"\n  ── Bloque {bloque['id']}: {bloque['nombre']} ──")

        print(f"\n  [{pregunta['id']:02d}/30] {pregunta['texto']}")
        for i, op in enumerate(pregunta["opciones"], 1):
            print(f"       {i}. {op}")

        while True:
            try:
                r = int(input("  Tu respuesta (1-4): ").strip())
                if r in (1, 2, 3, 4):
                    respuestas[pregunta["id"]] = r
                    break
                print("  ⚠ Por favor escribe solo 1, 2, 3 o 4.")
            except (ValueError, KeyboardInterrupt):
                print("\n  Test cancelado.")
                sys.exit(0)

    return respuestas


# ─── Respuestas de ejemplo (modo --demo) ──────────────────────────────────────

RESPUESTAS_DEMO = {
    1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3,        # Bloque 1 → Lecto-escritura (R)
    7: 1, 8: 2, 9: 1, 10: 1,                     # Bloque 2 → Reflexivo
    11: 1, 12: 1, 13: 1, 14: 1,                  # Bloque 3 → Sensorial
    15: 1, 16: 1, 17: 1,                          # Bloque 4 → Secuencial
    18: 4, 19: 4, 20: 2,                          # Bloque 5 → Verbal
    21: 3, 22: 2, 23: 3, 24: 3,                  # Bloque 6 → Conceptualización Abstracta
    25: 2, 26: 2, 27: 3, 28: 2, 29: 3, 30: 3,   # Bloque 7 → mix Reflexivo/Conceptual
}


# ─── Entry point ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Motor de cálculo — Test Estilos de Aprendizaje")
    parser.add_argument("--json",   action="store_true", help="Lee respuestas de stdin (JSON) y devuelve resultado JSON")
    parser.add_argument("--demo",   action="store_true", help="Ejecuta con respuestas de ejemplo predefinidas")
    parser.add_argument("--banco",  default="preguntas.json", help="Ruta al archivo JSON del banco de preguntas")
    args = parser.parse_args()

    datos = cargar_preguntas(args.banco)

    if args.json:
        # Modo API: lee {"respuestas": {1: 2, 2: 4, ...}} de stdin
        entrada = json.load(sys.stdin)
        respuestas = {int(k): v for k, v in entrada["respuestas"].items()}
        resultado = generar_resultado(respuestas, datos)
        print(json.dumps(resultado, ensure_ascii=False, indent=2))

    elif args.demo:
        print("\n[MODO DEMO] Usando respuestas predefinidas...\n")
        resultado = generar_resultado(RESPUESTAS_DEMO, datos)
        print(formatear_texto(resultado))

    else:
        respuestas = modo_interactivo(datos)
        resultado  = generar_resultado(respuestas, datos)
        print(formatear_texto(resultado))

        # Guardar resultado en JSON
        salida = Path("resultado_usuario.json")
        with open(salida, "w", encoding="utf-8") as f:
            json.dump({"respuestas": respuestas, "resultado": resultado}, f, ensure_ascii=False, indent=2)
        print(f"\n  💾 Resultado guardado en: {salida}\n")


if __name__ == "__main__":
    main()
