# Phase 6: Seguridad Backend - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 06-seguridad-backend
**Areas discussed:** Estrategia de rollout, Logging de rechazos, Modo mock/local, Generacion de la key

---

## Estrategia de rollout

### Transicion al activar validacion

| Option | Description | Selected |
|--------|-------------|----------|
| Corte duro | Deploy 3 capas en orden. Solo 8 usuarios — si algo falla, se corrige en minutos. | ✓ |
| Grace period temporal | Apps Script acepta sin token 48h pero loguea warning. Margen para verificar. | |
| Feature flag en Apps Script | Script Property AUTH_ENABLED=false, activar manualmente tras verificar frontend. | |

**User's choice:** Corte duro
**Notes:** Para 8 usuarios internos, un downtime breve es aceptable.

### Orden de deploy

| Option | Description | Selected |
|--------|-------------|----------|
| Backend primero | Apps Script → .env/Vercel → Redeploy frontend. Downtime breve <5 min. | ✓ |
| Frontend primero | Frontend envia token antes de que backend lo requiera. Sin downtime. | |
| Simultaneo coordinado | Deploy casi simultaneo. Requiere coordinacion precisa. | |

**User's choice:** Backend primero
**Notes:** Orden natural: backend valida, luego frontend inyecta.

---

## Logging de rechazos

### Destino de logs

| Option | Description | Selected |
|--------|-------------|----------|
| console.warn solo | Visible en Stackdriver. Hoja LOG reservada para acciones legitimas. | ✓ |
| console.warn + hoja LOG | Doble registro. Visibilidad para Aurora/Rafa pero puede llenar hoja. | |
| Solo hoja LOG | Todo en hoja LOG. Sin console.warn. | |

**User's choice:** console.warn solo
**Notes:** Hoja LOG para negocio, Stackdriver para seguridad.

### Datos en el log

| Option | Description | Selected |
|--------|-------------|----------|
| Timestamp + action + IP | Suficiente para detectar patrones sin ser verboso. | ✓ |
| Minimo: solo action | Ultra simple, solo que endpoint intentaron. | |
| Tu decides | Claude elige nivel de detalle. | |

**User's choice:** Timestamp + action + IP

---

## Modo mock/local

### Token en modo mock

| Option | Description | Selected |
|--------|-------------|----------|
| Ignorar token | Si isApiEnabled() es false, no se inyecta ni valida. Mock sigue igual. | ✓ |
| Requerir VITE_API_KEY siempre | Fuerza configurar .env completo desde dia 1. | |
| Warning en consola si falta | No bloquear, pero avisar en dev si hay API_URL sin API_KEY. | |

**User's choice:** Ignorar token
**Notes:** Token solo tiene sentido con API real.

### API_URL sin API_KEY

| Option | Description | Selected |
|--------|-------------|----------|
| Warning + seguir sin token | console.warn avisando que falta key. Requests fallan en backend. No rompe build. | ✓ |
| Error que bloquea | Impide usar la app sin key configurada. | |
| Silencioso | No avisar. Errores genericos de API. | |

**User's choice:** Warning + seguir sin token

---

## Generacion de la key

### Formato

| Option | Description | Selected |
|--------|-------------|----------|
| UUID v4 | Estandar, facil de generar, suficiente entropia para 8 usuarios. | ✓ |
| Random alfanumerico 32 chars | Mas compacto, igualmente seguro. | |
| Tu decides | Claude elige formato. | |

**User's choice:** UUID v4

### Quien genera

| Option | Description | Selected |
|--------|-------------|----------|
| Manual por el dev | Dev genera UUID, configura Script Properties y Vercel. Paso-a-paso documentado. | ✓ |
| Script automatico | Script genera UUID y configura via clasp. Mas complejo. | |
| Claude genera en el plan | Claude genera UUID durante ejecucion. | |

**User's choice:** Manual por el dev

### Rotacion

| Option | Description | Selected |
|--------|-------------|----------|
| Manual sin automatizar | Nuevo UUID, actualizar Script Properties y Vercel, redeploy. Documentar procedimiento. | ✓ |
| Script de rotacion | Automatiza rotacion via clasp y Vercel API. Over-engineered. | |

**User's choice:** Manual sin automatizar

---

## Claude's Discretion

- Ubicacion del check de validacion en doGet/doPost
- Nombre de la Script Property para el API key
- Estructura del JSON de error 401-equivalente
- Orden de modificacion de archivos

## Deferred Ideas

None — discussion stayed within phase scope.
