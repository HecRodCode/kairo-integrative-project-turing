# Documentación Técnica de Base de Datos — Kairo

## Rol: Database Architect & DB Documentation

### Proyecto Integrador · RIWI · Clan Turing · Marzo 2026

---

## Índice de Entregables

La documentación está dividida en 3 archivos independientes, uno por entregable:

| #   | Entregable                                   | Archivo                                                                                | Contenido                                                                                                        |
| --- | -------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | **Modelo Relacional + Diccionario de Datos** | [`docs/01_modelo_relacional_diccionario.md`](docs/01_modelo_relacional_diccionario.md) | Modelo relacional (4 bloques funcionales), diccionario de las 14 tablas, 8 ENUMs, políticas RLS                  |
| 2   | **Lógica de Persistencia de Progreso**       | [`docs/02_persistencia_progreso.md`](docs/02_persistencia_progreso.md)                 | Validación del botón "Completado", snapshots fire-and-forget, Moodle progress, vistas, 6 hallazgos código↔schema |
| 3   | **Diagramas de Modelado**                    | [`docs/03_diagramas_modelado.md`](docs/03_diagramas_modelado.md)                       | Diagrama ER (dbdiagram.io), Diagrama de Componentes (mermaid.live), restricciones pendientes                     |

---

## Herramientas de Diagramas

| Diagrama                | Herramienta                          |
| ----------------------- | ------------------------------------ |
| Diagrama ER             | [dbdiagram.io](https://dbdiagram.io) |
| Diagrama de Componentes | [mermaid.live](https://mermaid.live) |

---

## Resumen Técnico

- **Motor:** PostgreSQL 14+ en Supabase
- **Tablas:** 14 + 2 vistas + 8 ENUMs
- **Backend Node.js:** Express en puerto 3000
- **Microservicio Python:** FastAPI en puerto 8000
- **IA:** Groq API con llama-3.3-70b-versatile
- **Frontend:** HTML/CSS/JS en Live Server puerto 5500

---

> **Documento generado por:** Miguel Calle — Database Architect  
> **Fecha:** 11 de Marzo de 2026  
> **Proyecto:** Kairo · RIWI · Clan Turing
