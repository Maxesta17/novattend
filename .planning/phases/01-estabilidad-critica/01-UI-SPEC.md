---
phase: 1
slug: estabilidad-critica
status: approved
reviewed_at: 2026-03-30
shadcn_initialized: false
preset: none
created: 2026-03-30
---

# Phase 1 — UI Design Contract

> Visual and interaction contract para Phase 1: Estabilidad Critica.
> Generado por gsd-ui-researcher. Verificado por gsd-ui-checker.
>
> NOTA: Esta fase no realiza rediseno visual. El sistema de diseno existente
> (score 9.0/10 en auditoria) se mantiene intacto. Este contrato documenta
> los dos componentes nuevos (ErrorBanner.jsx, NotFoundPage.jsx) y el nuevo
> token (disabled) dentro de los patrones ya establecidos.

---

## Design System

| Property | Value | Source |
|----------|-------|--------|
| Tool | none — Tailwind tokens custom | CLAUDE.md / tailwind.config.js |
| Preset | not applicable | — |
| Component library | none — componentes propios en src/components/ui/ | CLAUDE.md |
| Icon library | none — SVGs inline (ver Button.jsx spinner como referencia) | Codebase |
| Font heading | Cinzel (serif) via Google Fonts — clase `font-cinzel` | tailwind.config.js |
| Font body | Montserrat (sans-serif) via Google Fonts — clase `font-montserrat` | tailwind.config.js |

**shadcn gate:** No aplica. El proyecto tiene un design system custom maduro con tokens Tailwind
completos. REQUIREMENTS.md declara explicitamente "Rediseno visual: UI score 9.0/10, no necesita
cambios". CLAUDE.md prohibe librerias UI externas ("zero-external-UI"). shadcn no se inicializa.

---

## Spacing Scale

Declarado: escala de 4 puntos via utilidades Tailwind estandar.

| Token | Value | Clase Tailwind | Uso en esta fase |
|-------|-------|----------------|------------------|
| xs | 4px | `gap-1`, `p-1` | Gaps internos de iconos |
| sm | 8px | `gap-2`, `p-2` | Gap entre icono X y texto en ErrorBanner |
| md | 16px | `p-4`, `gap-4` | Padding horizontal de ErrorBanner (`px-3` = 12px es la excepcion documentada abajo) |
| lg | 24px | `p-6`, `gap-6` | Padding de secciones en NotFoundPage |
| xl | 32px | `p-8`, `gap-8` | Padding exterior de NotFoundPage (`p-8`) |
| 2xl | 48px | `py-12` | Separacion mayor entre heading y boton en NotFoundPage (`mb-8` = 32px) |
| 3xl | 64px | `py-16` | No utilizado en esta fase |

**Excepciones documentadas:**
- `px-3 py-2` (12px / 8px) en ErrorBanner: padding compacto para banner inline — menor que md
  intencionalmente para que el banner no compita visualmente con el contenido de la pagina.
- Touch target del boton X en ErrorBanner: minimo 44px de area tactil mediante `p-1` en el elemento
  button para cumplir WCAG 2.5.5. El elemento visual es pequeño pero el area de toque no.

*Source: inspeccion de Button.jsx, NotFoundPage reference en RESEARCH.md, convenciones mobile-first CLAUDE.md*

---

## Typography

| Role | Clase Tailwind | Size | Weight | Line Height | Uso en esta fase |
|------|---------------|------|--------|-------------|------------------|
| Body | `font-montserrat text-sm` | 14px | 400 (regular) | 1.5 | Texto de mensaje en ErrorBanner, parrafo de NotFoundPage |
| Label | `font-montserrat text-xs` | 12px | 400 (regular) | 1.5 | Texto de ErrorBanner (variante compacta) — clase primaria del banner |
| Heading | `font-cinzel text-xl font-bold` | 20px | 700 (bold) | 1.2 | No utilizado directamente en nuevos componentes de esta fase |
| Display | `font-cinzel text-6xl font-bold` | 60px | 700 (bold) | 1.1 | Numero "404" en NotFoundPage — impacto visual maximo |

**Reglas de aplicacion:**
- `font-cinzel` se reserva para headings y display numericos (404). Nunca en copy de cuerpo ni labels.
- `font-montserrat` para todo el texto de interfaz: mensajes de error, parrafos, etiquetas de botones.
- Solo dos pesos: 400 (regular) para texto informativo, 700 (bold) para headings/display y labels de botones.
- `text-xs` (12px) es el minimo permitido. Ningun texto por debajo de 12px.

*Source: CONTEXT.md D-03, RESEARCH.md Patron ErrorBanner y NotFoundPage, tailwind.config.js, Button.jsx*

---

## Color

| Role | Token Tailwind | Hex | Uso en esta fase |
|------|---------------|-----|------------------|
| Dominant (60%) | `bg-dark-bg` | #111111 | Fondo de NotFoundPage y fondo general de la app |
| Secondary (30%) | `bg-error-soft` | #FFEBEE | Fondo de ErrorBanner — superficie secundaria del banner |
| Accent (10%) | `bg-burgundy` / `text-gold` | #800000 / #C5A059 | Boton CTA de NotFoundPage (`bg-burgundy`), heading "404" (`text-gold`) |
| Semantic error | `text-error` / `border-error` | #C62828 | Texto y borde de ErrorBanner — solo para mensajes de error de API |
| Disabled state | `bg-disabled` | #CCCCCC | Button variant disabled, ToggleSwitch estado off — NUEVO TOKEN (COMP-01) |
| Destructive | `text-error` | #C62828 | Sin acciones destructivas en esta fase |

**Accent reservado EXCLUSIVAMENTE para:**
1. Boton primario de NotFoundPage: `bg-burgundy` con texto blanco (`text-white`)
2. Numero "404" en NotFoundPage: `text-gold`
3. Botones CTA existentes en la app (sin cambios — solo referencia)

**Nuevo token `disabled` (#CCCCCC):**
- Agregar a `tailwind.config.js` bajo `extend.colors.disabled`
- Reemplaza `bg-[#CCCCCC]` en Button.jsx linea 32 y `bg-[#CDCDCD]` en ToggleSwitch.jsx
- Uso: UNICAMENTE para elementos de interfaz en estado deshabilitado
- Nombre semantico: indica el estado, no el color

**ErrorBanner — especificacion de color completa:**
- Fondo: `bg-error-soft` (#FFEBEE) — superficie suave, no alarma
- Borde: `border border-error/30` — bordeado sutil a 30% de opacidad
- Texto mensaje: `text-error` (#C62828) — maximo contraste sobre fondo error-soft
- Boton X (dismiss): `text-error/70 hover:text-error` — interactividad sutil

**NotFoundPage — especificacion de color completa:**
- Fondo: `bg-dark-bg` (#111111) — consistente con app shell
- Heading "404": `text-gold` (#C5A059) — impacto visual sin ser alarma
- Parrafo: `text-white/60` — jerarquia visual bajo el heading
- Boton: variante `primary` de Button.jsx existente (`bg-burgundy`)

*Source: CONTEXT.md D-03 y D-04, RESEARCH.md Patron 1 ErrorBanner y NotFoundPage, tailwind.config.js*

---

## Copywriting Contract

| Element | Copy | Componente / Pagina |
|---------|------|---------------------|
| Primary CTA — NotFoundPage | "Volver al inicio" | NotFoundPage.jsx — boton `<Button variant="primary">` |
| Heading de error — NotFoundPage | "404" | NotFoundPage.jsx — `<h1>` en `font-cinzel text-6xl text-gold` |
| Parrafo de error — NotFoundPage | "Pagina no encontrada" | NotFoundPage.jsx — `<p>` en `font-montserrat text-sm text-white/60` |
| Error de guardado — AttendancePage | Mensaje dinamico de la API (`saveError` state) | ErrorBanner message prop — texto viene de api.js |
| Error de carga — AttendancePage | "No se pudieron cargar los alumnos. Revisa tu conexion." | ErrorBanner en AttendancePage cuando `loadError` es truthy |
| Dismiss label (accesibilidad) | "Cerrar error" | `aria-label` del boton X en ErrorBanner |

**Reglas de copywriting para errores de API (ErrorBanner):**
- Los mensajes de error de `api.js` siguen el patron: "Error HTTP {status}: {statusText}" (ERR-01)
- Si el mensaje viene de la API, se muestra directamente. ErrorBanner NO reformatea el mensaje.
- Si el mensaje de carga falla sin respuesta HTTP, mostrar: "No se pudieron cargar los alumnos. Revisa tu conexion."
- Todos los textos en espanol. Sin abreviaciones. Mayuscula solo en primera palabra.

**Acciones destructivas en esta fase:** Ninguna. Esta fase no introduce confirmaciones de borrado ni
acciones irreversibles. El componente Modal existente no se modifica.

*Source: CONTEXT.md D-03, RESEARCH.md NotFoundPage.jsx completo y ErrorBanner.jsx completo*

---

## Component Inventory

Componentes nuevos que crea esta fase (con contrato visual completo):

### ErrorBanner.jsx

- **Ubicacion:** `src/components/ui/ErrorBanner.jsx`
- **Patron:** Componente UI puro — export default function, props destructuradas, cero efectos secundarios
- **Props:** `message: string|null`, `onDismiss?: function`
- **Render guard:** Si `!message`, retorna `null` — no ocupa espacio en el DOM
- **Layout:** `flex items-center gap-2 mb-2 px-3 py-2`
- **Superficie:** `bg-error-soft border border-error/30 rounded-lg`
- **Texto:** `text-error text-xs font-montserrat`
- **Accesibilidad:** `role="alert"` en el div raiz para anuncio automatico a lectores de pantalla
- **Boton X:** Solo renderiza si `onDismiss` esta definido. Classes: `shrink-0 text-error/70 hover:text-error font-bold text-sm leading-none`. `aria-label="Cerrar error"`. `type="button"` explicito.
- **Linea limit:** < 40 lineas (bien dentro del limite 250 de CLAUDE.md)
- **JSDoc:** Obligatorio con `@param` para `message` y `onDismiss`

### NotFoundPage.jsx

- **Ubicacion:** `src/pages/NotFoundPage.jsx`
- **Patron:** Pagina ligera y orquestadora — usa `useNavigate` de react-router-dom y `Button` de ui/
- **Layout raiz:** `min-h-dvh min-h-screen w-full max-w-[430px] mx-auto bg-dark-bg flex flex-col items-center justify-center p-8 box-border`
- **Heading "404":** `font-cinzel text-6xl font-bold text-gold m-0 mb-3`
- **Parrafo:** `font-montserrat text-sm text-white/60 m-0 mb-8 text-center`
- **Boton:** `<Button variant="primary" onClick={() => navigate('/')}>Volver al inicio</Button>`
- **Sin animaciones:** Decision D-03 — pagina branded minima, sin keyframes
- **Ruta:** NO usa ProtectedRoute. Publica. Se monta en `<Route path="*" />` al final de Routes en App.jsx
- **Linea limit:** < 40 lineas (bien dentro del limite 250 de CLAUDE.md)
- **JSDoc:** Obligatorio en cabecera del componente

### Token nuevo: `disabled`

- **Archivo:** `tailwind.config.js` bajo `extend.colors`
- **Valor:** `'#CCCCCC'`
- **Clase generada:** `bg-disabled`
- **Uso en Button.jsx:** Reemplaza `bg-[#CCCCCC]` en variante disabled
- **Uso en ToggleSwitch.jsx:** Reemplaza `bg-[#CDCDCD]` (valor unificado a #CCCCCC, diferencia imperceptible)
- **Restriccion:** Solo para elementos deshabilitados. No usar como color de superficie general.

*Source: CONTEXT.md D-01, D-02, D-03, D-04; RESEARCH.md Patrones 1-5*

---

## Interaction Contracts

### ErrorBanner — Estados e interacciones

| Estado | Trigger | Resultado visual |
|--------|---------|-----------------|
| Oculto (default) | `message` es null o string vacio | Componente no renderiza (`return null`) — sin espacio en layout |
| Visible | `message` tiene valor | Banner aparece con fondo error-soft, borde, texto, boton X si hay onDismiss |
| Dismiss | Click en boton X | Llama `onDismiss()` — el padre setea `saveError(null)` o `loadError(null)` — banner desaparece |
| Reintento | El usuario reintenta la accion | El padre limpia el error antes de lanzar la peticion — banner desaparece durante loading |

### NotFoundPage — Flujo de navegacion

| Accion | Resultado |
|--------|----------|
| Navegar a URL inexistente | React Router ruta `path="*"` monta NotFoundPage |
| Click "Volver al inicio" | `navigate('/')` — redirige a LoginPage |
| Usuario sin sesion en URL invalida | Ver NotFoundPage directamente (sin redireccion a login primero) |

### Integracion en AttendancePage

| Error | Donde aparece ErrorBanner | onDismiss |
|-------|--------------------------|-----------|
| Fallo al guardar asistencia (`saveError`) | Arriba del boton "Guardar" o donde actualmente esta el bloque ad-hoc (lineas 161-165) | `() => setSaveError(null)` |
| Fallo al cargar alumnos (`loadError` de useStudents) | Arriba de la lista de alumnos, bajo el header | `() => setLoadError(null)` — hook debe exponer este setter |

*Source: RESEARCH.md Pitfall 6, Open Question 2, Patron 1*

---

## Registry Safety

| Registry | Bloques utilizados | Safety Gate |
|----------|--------------------|-------------|
| shadcn official | ninguno — no inicializado | not applicable |
| Terceros | ninguno | not applicable |

Esta fase no utiliza ningun registry externo. Cero dependencias nuevas instaladas.
Todos los componentes son construidos localmente siguiendo patrones del codebase.

*Source: RESEARCH.md "Sin nuevas dependencias", CLAUDE.md "zero-external-UI"*

---

## Compliance Checklist

Verificaciones obligatorias de CLAUDE.md para esta fase:

| Regla | Aplicacion | Estado |
|-------|-----------|--------|
| CERO estilos inline | ErrorBanner.jsx y NotFoundPage.jsx: cero `style={{}}` | Contractual |
| Max 250 lineas/archivo | Ambos componentes nuevos < 50 lineas | Contractual |
| Prohibido hardcodear hex | COMP-01 elimina los 3 hex restantes; nuevos componentes usan solo tokens | Contractual |
| UI en espanol | Todos los textos visibles en espanol | Contractual |
| Codigo en ingles | `ErrorBanner`, `NotFoundPage`, `message`, `onDismiss` | Contractual |
| JSDoc obligatorio | Cabecera con `@param` en ambos componentes nuevos | Contractual |
| `npm run lint` antes de entrega | Verificacion al final de cada tarea | Contractual |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
