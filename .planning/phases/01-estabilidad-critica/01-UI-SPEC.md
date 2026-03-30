---
phase: 1
slug: estabilidad-critica
status: draft
shadcn_initialized: false
preset: none
created: 2026-03-30
---

# Phase 1 — UI Design Contract: Estabilidad Critica

> Contrato visual e interactivo para la fase de estabilidad critica.
> Generado por gsd-ui-researcher. Verificado por gsd-ui-checker.
>
> NOTA: Esta fase no realiza rediseno visual (UI score 9.0/10 en auditoria — sin cambios).
> El contrato documenta los dos componentes nuevos (ErrorBanner.jsx, NotFoundPage.jsx)
> y el nuevo token `disabled` dentro del design system ya establecido.

---

## Design System

| Property | Value | Source |
|----------|-------|--------|
| Tool | none — Tailwind tokens custom | CLAUDE.md, tailwind.config.js |
| Preset | not applicable | No shadcn — design system custom maduro |
| Component library | none — componentes propios en src/components/ui/ | CLAUDE.md arquitectura |
| Icon library | SVG inline (sin biblioteca externa) | RESEARCH.md: "Sin nuevas dependencias" |
| Font headings | Cinzel (serif) via Google Fonts — clase `font-cinzel` | tailwind.config.js fontFamily.cinzel |
| Font body | Montserrat (sans-serif) via Google Fonts — clase `font-montserrat` | tailwind.config.js fontFamily.montserrat |

**shadcn gate:** No aplica. El proyecto declara "zero-external-UI" en CLAUDE.md y tiene un design
system custom completo con tokens Tailwind. REQUIREMENTS.md marca "Rediseno visual: Out of Scope
(UI score 9.0/10)". shadcn no se inicializa en este proyecto.

---

## Spacing Scale

Escala de 4 puntos via utilidades Tailwind estandar.

| Token | Value | Clase Tailwind | Uso en esta fase |
|-------|-------|----------------|-----------------|
| xs | 4px | `gap-1`, `p-1` | Area tactil extra en boton X de ErrorBanner |
| sm | 8px | `gap-2`, `py-2` | Padding vertical de ErrorBanner (`py-2`); gap interno del banner |
| md-compact | 12px | `px-3` | Padding horizontal de ErrorBanner (excepcion — ver abajo) |
| md | 16px | `p-4`, `gap-4` | Padding lateral de paginas y secciones |
| lg | 24px | `p-6`, `gap-6` | Separacion entre elementos en NotFoundPage |
| xl | 32px | `p-8`, `mb-8` | Padding exterior NotFoundPage (`p-8`); margen bajo parrafo (`mb-8`) |
| 2xl | 48px | `py-12` | No utilizado en esta fase |
| 3xl | 64px | `py-16` | No utilizado en esta fase |

**Excepciones:**
- `px-3` (12px) en ErrorBanner: padding horizontal compacto — el banner es un elemento inline
  que no debe competir visualmente con el contenido principal de la pagina. Mismo valor que usa
  el banner ad-hoc existente en AttendancePage lineas 161-165 (patron a reemplazar, no cambiar).
- Touch target boton X dismiss: minimo 44px de area tactil. Se logra con `p-1` en el `<button>`
  para cumplir WCAG 2.5.5 en mobile sin ampliar el elemento visual.

*Source: Button.jsx, AttendancePage.jsx lineas 161-165 (banner ad-hoc existente),
RESEARCH.md Patron 1, CONTEXT.md D-03*

---

## Typography

| Role | Clase Tailwind | Size | Weight | Line Height | Uso en esta fase |
|------|---------------|------|--------|-------------|-----------------|
| Label / mensaje de error | `font-montserrat text-xs` | 12px | 400 regular | 1.5 | Texto del mensaje en ErrorBanner |
| Body / parrafo | `font-montserrat text-sm` | 14px | 400 regular | 1.5 | Parrafo "Pagina no encontrada" en NotFoundPage |
| Boton | `font-montserrat text-sm font-bold` | 14px | 700 bold | automatico | Etiqueta de Button (patron existente — Button.jsx linea 23) |
| Display numerico | `font-cinzel text-6xl font-bold` | 60px | 700 bold | 1.1 | Heading "404" en NotFoundPage |

**Reglas de aplicacion:**
- `font-cinzel` reservado para headings y display numericos. Nunca en cuerpo ni labels.
- `font-montserrat` para todo texto de interfaz: errores, parrafos, etiquetas de botones.
- Dos pesos: **400 (regular)** para texto informativo, **700 (bold)** para headings y botones.
- `text-xs` (12px) es el minimo permitido. Ningun texto por debajo de 12px.

*Source: CONTEXT.md D-03, RESEARCH.md Patron 1 y NotFoundPage, tailwind.config.js,
Button.jsx linea 23*

---

## Color

Paleta extraida de `tailwind.config.js`. Unico cambio: agregar token `disabled`.

| Role | Token Tailwind | Hex | Uso en esta fase |
|------|---------------|-----|-----------------|
| Dominant (60%) | `bg-dark-bg` | `#111111` | Fondo de NotFoundPage; fondo general de la app via MobileContainer |
| Secondary (30%) | `bg-error-soft` | `#FFEBEE` | Fondo de ErrorBanner — superficie suave de estado de error |
| Accent (10%) | `bg-burgundy` / `text-gold` | `#800000` / `#C5A059` | Ver "Acento reservado para" abajo |
| Semantic error texto | `text-error` | `#C62828` | Texto del mensaje en ErrorBanner |
| Semantic error borde | `border-error/30` | `#C62828` a 30% opacidad | Borde sutil de ErrorBanner |
| Semantic error dismiss | `text-error/70` hover `text-error` | `#C62828` a 70% / 100% | Boton X en ErrorBanner (reposo / hover) |
| Disabled (nuevo token) | `bg-disabled` | `#CCCCCC` | Button variant disabled; ToggleSwitch estado off |
| Texto jerarquia baja | `text-white/60` | `#FFFFFF` a 60% opacidad | Parrafo "Pagina no encontrada" en NotFoundPage |
| Destructive | `text-error` | `#C62828` | Sin acciones destructivas en esta fase |

**Acento reservado EXCLUSIVAMENTE para:**
1. `text-gold` — heading "404" en NotFoundPage (decision D-03)
2. `bg-burgundy` — boton "Volver al inicio" en NotFoundPage (decision D-03)
3. `bg-burgundy` / `text-gold` — elementos existentes sin cambio (botones CTA, titulos cinzel)

**Token `disabled` — especificacion completa (COMP-01, decision D-04):**
- Agregar a `tailwind.config.js` bajo `extend.colors`: `disabled: '#CCCCCC'`
- Clase Tailwind generada: `bg-disabled`
- Reemplaza `bg-[#CCCCCC]` en `Button.jsx` linea 32 (variante disabled)
- Reemplaza `bg-[#CDCDCD]` en `ToggleSwitch.jsx` (valor unificado a `#CCCCCC`)
- Restriccion: solo para elementos de interfaz en estado deshabilitado. No usar como superficie.

**ErrorBanner — paleta completa:**
- Fondo: `bg-error-soft` (`#FFEBEE`) — indica error sin generar alarma visual excesiva
- Borde: `border border-error/30` — bordeado sutil que refuerza el caracter de error
- Texto: `text-error` (`#C62828`) — contraste suficiente sobre fondo error-soft
- Dismiss reposo: `text-error/70` — indica interactividad sin dominar
- Dismiss hover: `text-error` — confirmacion visual al pasar el cursor/dedo

**NotFoundPage — paleta completa:**
- Fondo: `bg-dark-bg` (`#111111`) — consistente con app shell
- Heading "404": `text-gold` (`#C5A059`) — impacto visual sin alarma
- Parrafo: `text-white/60` — jerarquia visual correcta bajo el heading
- Boton: Button variant `primary` — hereda `bg-burgundy text-white` del componente existente

*Source: CONTEXT.md D-03, D-04; RESEARCH.md Patrones 1 y NotFoundPage; tailwind.config.js*

---

## Copywriting Contract

| Element | Copy exacto | Componente |
|---------|-------------|-----------|
| Primary CTA — NotFoundPage | "Volver al inicio" | NotFoundPage.jsx — `<Button variant="primary">` |
| Heading display — NotFoundPage | "404" | NotFoundPage.jsx — `<h1>` con `font-cinzel text-6xl text-gold` |
| Parrafo — NotFoundPage | "Pagina no encontrada" | NotFoundPage.jsx — `<p>` con `font-montserrat text-sm text-white/60` |
| Error de carga de alumnos | "No se pudieron cargar los alumnos. Revisa tu conexion." | ErrorBanner en AttendancePage cuando `loadError` es truthy |
| Error de guardado | Mensaje dinamico de la API (estado `saveError`) | ErrorBanner en AttendancePage — texto viene del catch de `guardarAsistencia` |
| Error HTTP generico (interno) | "Error HTTP {status}: {statusText}" | Lanzado por `apiGet`/`apiPost` cuando `!res.ok` — propagado al caller |
| Dismiss accesibilidad | "Cerrar error" | `aria-label` del boton X en ErrorBanner |

**Reglas de copywriting para mensajes de error:**
- Todos los textos visibles al usuario en espanol.
- Sin abreviaciones ni jerga tecnica.
- Mayuscula solo en la primera palabra de cada mensaje.
- ErrorBanner muestra el mensaje recibido tal cual — no lo reformatea.

**Acciones destructivas en esta fase:** Ninguna. No hay confirmaciones de borrado ni sobreescrituras
irreversibles. El contrato de confirmacion no aplica.

*Source: CONTEXT.md D-01, D-02, D-03; RESEARCH.md Patron 1 ErrorBanner y NotFoundPage*

---

## Component Inventory

Dos componentes nuevos que crea esta fase:

### ErrorBanner.jsx

| Propiedad | Especificacion |
|-----------|---------------|
| Ubicacion | `src/components/ui/ErrorBanner.jsx` |
| Patron | UI puro — export default function, props destructuradas, sin efectos secundarios |
| Props | `message: string\|null`, `onDismiss?: function` |
| Render guard | `if (!message) return null` — no ocupa espacio en DOM |
| Layout | `flex items-center gap-2 mb-2 px-3 py-2` |
| Superficie | `bg-error-soft border border-error/30 rounded-lg` |
| Texto | `text-error text-xs font-montserrat` |
| ARIA | `role="alert"` en el div raiz |
| Boton dismiss | Solo renderiza si `onDismiss` definido. Classes: `shrink-0 text-error/70 hover:text-error font-bold text-sm leading-none p-1`. `aria-label="Cerrar error"`. `type="button"`. |
| Limite de lineas | Maximo 50 lineas (limite CLAUDE.md: 250) |
| JSDoc | Obligatorio con `@param` para `message` y `onDismiss` |
| Inline styles | Prohibido `style={{}}` — cero excepciones |

### NotFoundPage.jsx

| Propiedad | Especificacion |
|-----------|---------------|
| Ubicacion | `src/pages/NotFoundPage.jsx` |
| Patron | Pagina ligera y orquestadora — usa `useNavigate` y `Button` de ui/ |
| Layout raiz | `min-h-dvh min-h-screen w-full max-w-[430px] mx-auto bg-dark-bg flex flex-col items-center justify-center p-8 box-border` |
| Heading h1 | `font-cinzel text-6xl font-bold text-gold m-0 mb-3` — texto: "404" |
| Parrafo p | `font-montserrat text-sm text-white/60 m-0 mb-8 text-center` — texto: "Pagina no encontrada" |
| Boton | `<Button variant="primary" onClick={() => navigate('/')}>Volver al inicio</Button>` |
| Animaciones | Ninguna (decision D-03 — branded minima) |
| Ruta | Sin ProtectedRoute — publica. Se monta como `<Route path="*" />` al final de Routes en App.jsx |
| Limite de lineas | Maximo 40 lineas (limite CLAUDE.md: 250) |
| JSDoc | Obligatorio en cabecera del componente |
| Inline styles | Prohibido `style={{}}` — cero excepciones |

### Token `disabled` (configuracion — no componente)

| Propiedad | Especificacion |
|-----------|---------------|
| Archivo | `tailwind.config.js` bajo `extend.colors` |
| Entrada | `disabled: '#CCCCCC'` |
| Clase generada | `bg-disabled` |
| Reemplaza en Button.jsx | `bg-[#CCCCCC]` en linea 32 (variante disabled) |
| Reemplaza en ToggleSwitch.jsx | `bg-[#CDCDCD]` (diferencia de 1 punto unificada a #CCCCCC) |
| Restriccion de uso | Solo estado deshabilitado de elementos interactivos |

*Source: CONTEXT.md D-01, D-02, D-03, D-04; RESEARCH.md Patrones 1-5*

---

## Interaction Contracts

### ErrorBanner — Estados

| Estado | Trigger | Resultado |
|--------|---------|----------|
| Oculto (default) | `message` es `null`, `undefined` o vacio | `return null` — sin espacio en layout, sin render en DOM |
| Visible | `message` tiene contenido | Banner con fondo error-soft, borde, texto y boton X |
| Dismiss manual | Click en boton X | Llama `onDismiss()` — padre setea error a null — banner desaparece |
| Auto-limpieza | Usuario reintenta la accion | Padre limpia error antes de lanzar peticion — banner desaparece durante loading |

### NotFoundPage — Flujo

| Accion | Resultado |
|--------|----------|
| Navegar a URL sin ruta definida | React Router `path="*"` monta NotFoundPage |
| Click "Volver al inicio" | `navigate('/')` — redirige a LoginPage |
| Usuario sin sesion en URL invalida | NotFoundPage se muestra directamente, sin redireccion a login primero |
| Tecla Enter sobre boton | Identico a click (comportamiento nativo de `<button>`) |

### Integracion ErrorBanner en AttendancePage

| Error | Posicion en layout | Props |
|-------|-------------------|-------|
| Guardado fallido (`saveError`) | Dentro del footer fijo, sobre el Button "Guardar" — reemplaza bloque ad-hoc lineas 161-165 | `message={saveError}` / `onDismiss={() => setSaveError(null)}` |
| Carga fallida (`loadError`) | Bajo el header, sobre la lista de alumnos | `message={loadError}` / `onDismiss={() => setLoadError(null)}` |

**Nota de integracion:** El hook `useStudents` debe exponer un campo `loadError` ademas de `students`
y `loading`. Si el hook actualmente no lo expone, la tarea ERR-02 debe incluir esa modificacion.
Ver RESEARCH.md Open Question 2.

*Source: RESEARCH.md Pitfall 6, Open Question 2, Patron 1; AttendancePage.jsx lineas 161-165*

---

## Registry Safety

| Registry | Bloques utilizados | Safety Gate |
|----------|--------------------|-------------|
| shadcn official | ninguno | not applicable — shadcn no inicializado |
| Terceros | ninguno | not applicable |

Esta fase no agrega ninguna dependencia de UI de terceros. Cero paquetes nuevos instalados.
Todos los componentes son construidos localmente siguiendo los patrones del codebase.

*Source: RESEARCH.md "Sin nuevas dependencias"; CLAUDE.md "zero-external-UI"*

---

## Compliance de CLAUDE.md

| Regla | Como se cumple en esta fase |
|-------|----------------------------|
| CERO estilos inline | ErrorBanner.jsx y NotFoundPage.jsx: prohibido `style={{}}` — cero excepciones |
| Max 250 lineas/archivo | Ambos componentes nuevos < 50 lineas; archivos modificados verificados |
| Prohibido hardcodear hex | COMP-01 elimina 3 hex hardcodeados; nuevos componentes usan solo tokens Tailwind |
| UI en espanol | Todos los textos visibles en espanol (ver Copywriting Contract) |
| Codigo en ingles | `ErrorBanner`, `NotFoundPage`, `message`, `onDismiss`, `loadError` |
| JSDoc obligatorio | Cabecera con `@param` en ErrorBanner.jsx y NotFoundPage.jsx |
| `npm run lint` antes de entrega | Verificacion al final de cada tarea antes de commit |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending

---

*Phase: 01-estabilidad-critica*
*UI-SPEC creado: 2026-03-30*
*Fuentes: CONTEXT.md (4 decisiones bloqueadas D-01 a D-04), RESEARCH.md (10 patrones + 6 pitfalls),
tailwind.config.js (tokens existentes), Button.jsx (patron componentes ui/),
AttendancePage.jsx lineas 161-165 (banner ad-hoc a reemplazar)*
