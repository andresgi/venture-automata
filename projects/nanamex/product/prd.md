# PRD — Clin: Plataforma de niñeras

## 1. Visión

Crear una plataforma web que permita a familias en México **encontrar, evaluar y contactar niñeras confiables**, reduciendo la incertidumbre y el tiempo que actualmente implica buscar recomendaciones en grupos de WhatsApp, Facebook o conocidos.

## 2. Problema

Encontrar una niñera adecuada suele ser un proceso informal y fragmentado:

* Las familias dependen principalmente de recomendaciones.
* Es difícil comparar candidatas.
* La información sobre experiencia, disponibilidad y referencias no está estandarizada.
* Coordinar entrevistas requiere múltiples conversaciones.
* Para las niñeras también es difícil encontrar familias y oportunidades confiables.

## 3. Propuesta de valor

**Para familias:** encuentra niñeras compatibles con tus necesidades, revisa su perfil y experiencia, y agenda una entrevista desde un mismo lugar.

**Para niñeras:** crea un perfil profesional, indica tu disponibilidad y recibe oportunidades compatibles con lo que buscas.

## 4. Flujo principal

**Familia**

Registro → Crear necesidad → Ver candidatas compatibles → Revisar perfiles → Seleccionar candidatas → Contactar/agendar entrevista → Contratar.

**Niñera**

Registro → Crear perfil → Completar experiencia y disponibilidad → Recibir oportunidades → Mostrar interés → Entrevista → Contratación.

## 5. MVP

### Familias

* Registro/login.
* Perfil familiar.
* Crear una vacante/necesidad.
* Especificar:

  * Número y edad de niños.
  * Zona.
  * Días y horarios.
  * Modalidad: planta, entrada por salida u ocasional.
  * Rango de pago.
  * Fecha de inicio.
  * Responsabilidades esperadas.
* Listado de niñeras compatibles.
* Filtros básicos.
* Perfil completo de cada candidata.
* Guardar favoritas.
* Solicitar entrevista.
* Estado de candidatas: Nueva → Contactada → Entrevista → Contratada/Descartada.

### Niñeras

* Registro/login.
* Perfil con fotografía.
* Zona de trabajo.
* Años de experiencia.
* Experiencia con edades específicas.
* Disponibilidad.
* Expectativa salarial.
* Modalidades de trabajo aceptadas.
* Descripción personal.
* Referencias.
* Aplicar/mostrar interés en oportunidades.

### Confianza y seguridad

* Verificación de teléfono y correo.
* Verificación de identidad.
* Badge de "Identidad verificada".
* Referencias laborales/personales.
* Reportar usuario o comportamiento inapropiado.

## 6. Matching

El sistema genera un **Match Score** entre familia y niñera considerando inicialmente:

* Ubicación.
* Disponibilidad.
* Modalidad de trabajo.
* Expectativa salarial.
* Experiencia requerida.
* Edad de los niños.

Ejemplo:

**María — 92% compatible**

✓ Disponible L–V
✓ Trabaja en tu zona
✓ 4 años de experiencia
✓ Experiencia con bebés
✓ Dentro de tu presupuesto

En V1 el matching puede ser completamente basado en reglas, sin necesidad de IA.

## 7. Modelo de negocio

Inicialmente, **niñeras gratis**.

Las familias pueden explorar gratuitamente y pagar para desbloquear funciones de contratación.

Ejemplo:

* Gratis: crear necesidad y visualizar candidatas.
* MX$299: contactar candidatas durante 30 días.
* MX$499–699: búsqueda premium con verificaciones adicionales.

Posteriormente pueden agregarse planes para contratación recurrente, background checks y servicios adicionales.

## 8. Métricas principales

**North Star:** % de familias que logran contactar al menos una candidata compatible.

Métricas secundarias:

* Familias registradas.
* Niñeras activas.
* % perfiles completos.
* Matches por vacante.
* Contactos por familia.
* Entrevistas agendadas.
* % vacantes que terminan en contratación.
* Tiempo promedio hasta primera candidata compatible.
* CAC familia / niñera.
* Conversión Free → Paid.

## 9. Fuera del MVP

No construir inicialmente:

* App iOS/Android.
* Nómina.
* Contratos laborales.
* Pagos a niñeras.
* Seguimiento GPS.
* Control de asistencia.
* Chat complejo propio.
* Matching basado en ML.
* Agencia tradicional de reclutamiento.

La prioridad del MVP es validar una sola hipótesis:

> **¿Podemos generar suficiente confianza y liquidez para que una familia encuentre y contacte una niñera adecuada a través de la plataforma?**
