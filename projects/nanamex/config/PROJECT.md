# Project

Populated during Project Initialization (see AGENTS.md, "Project Initialization"). Do not
begin DISCOVERY until this file is complete.

## Venture Name

Nanamex

Product/brand name used in-product and in the PRD: **Clin**.

## One-Line Mission

Ayudar a familias en México a encontrar, evaluar y contactar niñeras confiables — y ayudar a
niñeras a encontrar familias y oportunidades confiables — a través de una plataforma web con
perfiles estandarizados, matching por reglas, y señales de confianza (verificación de
identidad, teléfono/correo, referencias).

## Initial Concept / Hypothesis

Encontrar una niñera adecuada hoy es un proceso informal y fragmentado: las familias dependen
de recomendaciones en grupos de WhatsApp/Facebook o de conocidos, no pueden comparar
candidatas de forma estandarizada, y coordinar entrevistas requiere múltiples conversaciones
manuales. Del otro lado, las niñeras también tienen dificultad para encontrar familias y
oportunidades confiables.

Hipótesis central a validar en V1 (ver PRD sección 9):

> ¿Podemos generar suficiente confianza y liquidez para que una familia encuentre y contacte
> una niñera adecuada a través de la plataforma?

Este PRD fue entregado directamente por el fundador como especificación del V1 (ver
"Fast-start" en AGENTS.md) — es una hipótesis fundamentada, no evidencia de mercado validada
por investigación. Por decisión explícita del fundador (registrada en agent/DECISIONS.md),
DISCOVERY y BENCHMARK no se ejecutan como fases independientes para V1; se va directo a
PRODUCT_GATE sobre este PRD.

## Target User (initial hypothesis)

Two-sided:

- **Familias** en México que buscan contratar una niñera (planta, entrada por salida, u
  ocasional) y hoy dependen de recomendaciones informales.
- **Niñeras** en México que buscan familias/oportunidades de trabajo confiables y hoy dependen
  de los mismos canales informales (WhatsApp, Facebook, boca a boca).

## Problem (initial hypothesis)

- Las familias dependen principalmente de recomendaciones informales.
- Es difícil comparar candidatas entre sí (información no estandarizada: experiencia,
  disponibilidad, referencias).
- Coordinar entrevistas requiere múltiples conversaciones dispersas.
- Las niñeras no tienen un canal confiable y centralizado para encontrar familias/oportunidades.

## Known Constraints on Scope

Del PRD, sección 9 ("Fuera del MVP") — no construir inicialmente:

- App iOS/Android (web only para V1).
- Nómina.
- Contratos laborales.
- Pagos a niñeras (procesamiento de pagos entre familia y niñera).
- Seguimiento GPS.
- Control de asistencia.
- Chat complejo propio (no construir mensajería en tiempo real propia para V1).
- Matching basado en ML (V1 es 100% basado en reglas).
- Agencia tradicional de reclutamiento (Clin no actúa como agencia/intermediario formal).

## Notes

- Modelo de negocio V1: niñeras gratis; familias exploran gratis y pagan para desbloquear
  contacto/contratación (ver PRD sección 7 para rangos de precio de referencia — tratar como
  hipótesis de pricing a validar, no como precio final aprobado).
- Matching V1 es completamente basado en reglas (ubicación, disponibilidad, modalidad,
  expectativa salarial, experiencia requerida, edad de los niños) — sin IA/ML.
- Confianza y seguridad son centrales a la propuesta de valor: verificación de
  teléfono/correo, verificación de identidad (ver config/CONSTRAINTS.md para el enfoque de V1
  — revisión manual por admin), referencias, y reporte de usuarios.
- North Star Metric: % de familias que logran contactar al menos una candidata compatible.
