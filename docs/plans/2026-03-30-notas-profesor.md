# Plan: Notas del profesor sobre alumnos

## Objetivo

Permitir que un profesor anote observaciones sobre un alumno desde la app (dentro del popup de detalle), y que cualquier profesor pueda ver las notas existentes. Indicador visual en la lista de asistencia para alumnos con notas.

---

## Arquitectura

```
[Profesor escribe nota] → [POST guardarNota] → [NOTAS sheet]
[Profesor abre popup]   → [GET getNotas]      → [Lista de notas]
[Lista de asistencia]   → [GET getAlumnos]     → [Campo tieneNotas: true/false]
```

---

## Paso 1 — Hoja NOTAS en el spreadsheet

Crear manualmente (o via setupSheets) la hoja NOTAS con cabeceras:

| A | B | C | D |
|---|---|---|---|
| alumno_id | profesor_id | fecha | nota |

- Una fila por nota (un alumno puede tener muchas)
- Ordenar por fecha descendente al leer

**Tambien:** Anadir `'NOTAS'` a la lista `hojasExcluidas` en `Gestion convocatorias.js` linea 276.

---

## Paso 2 — Backend: Codigo.js

### 2a. Endpoint GET: getNotas

Anadir case en `doGet`:
```js
case 'getNotas':
  return handleGetNotas(e);
```

Funcion `handleGetNotas(e)`:
- Parametro requerido: `alumno_id`
- Lee hoja NOTAS, filtra por alumno_id
- Para cada nota, busca el nombre del profesor en PROFESORES (profesor_id → nombre)
- Retorna array ordenado por fecha desc:
  ```json
  [
    { "profesorNombre": "Samuel", "fecha": "2026-03-30", "nota": "Le cuesta el listening" },
    { "profesorNombre": "Samuel", "fecha": "2026-03-15", "nota": "Va a faltar 2 semanas" }
  ]
  ```
- No cachear (las notas son pocas y deben estar frescas)

### 2b. Endpoint POST: guardarNota

Anadir case en `doPost`:
```js
case 'guardarNota':
  return handleGuardarNota(e);
```

Funcion `handleGuardarNota(e)`:
- Parametros requeridos: `alumno_id`, `profesor_id`, `nota`
- Validar que `nota` no este vacia y tenga max 500 caracteres
- Append fila a NOTAS: `[alumno_id, profesor_id, new Date(), nota]`
- Log en LOG: `[fecha, profesor_id, 'GUARDAR_NOTA', alumno_id]`
- Retorna `{ guardado: true }`

### 2c. Ampliar handleGetAlumnos

Para el indicador visual, `handleGetAlumnos` debe devolver un campo extra `tieneNotas` (boolean) por alumno:
- Leer hoja NOTAS una vez
- Crear Set con los alumno_id que tienen al menos una nota
- Al construir la respuesta de alumnos, anadir: `tieneNotas: setNotas.has(alumnoId)`
- Invalidar cache de alumnos cuando se guarda una nota nueva

---

## Paso 3 — Frontend: src/services/api.js

Anadir dos funciones:

```js
export async function getNotas(alumnoId) {
  return apiGet('getNotas', { alumno_id: alumnoId })
}

export async function guardarNota(alumnoId, profesorId, nota) {
  return apiPost('guardarNota', {
    alumno_id: alumnoId,
    profesor_id: profesorId,
    nota
  })
}
```

---

## Paso 4 — Frontend: StudentDetailPopup.jsx

Este es el componente mas afectado. Actualmente tiene 152 lineas.

### 4a. Estado nuevo

```js
const [notas, setNotas] = useState([])
const [loadingNotas, setLoadingNotas] = useState(false)
const [nuevaNota, setNuevaNota] = useState('')
const [guardandoNota, setGuardandoNota] = useState(false)
```

### 4b. Cargar notas al abrir

Anadir un useEffect que llame a `getNotas(student.id)` cuando el popup se abre. Patron identico al de `fetchAbsences` que ya existe.

### 4c. UI — debajo del indicador de estado (linea 149)

Seccion de notas con:

1. **Lista de notas existentes** (si hay):
   - Cada nota: nombre del profesor en negrita, fecha en gris, texto debajo
   - Ordenadas de mas reciente a mas antigua
   - Si no hay notas: no mostrar nada (ni mensaje "sin notas")

2. **Campo de texto + boton**:
   - `<textarea>` con placeholder "Escribe una nota sobre este alumno..."
   - Tailwind: `w-full border border-border-light rounded-lg p-2.5 font-montserrat text-xs resize-none`
   - Max 500 caracteres
   - Boton "Guardar nota" debajo, estilo `bg-burgundy text-off-white`
   - Deshabilitado si el textarea esta vacio o si esta guardando
   - Al guardar: POST → anadir la nota al array local → limpiar textarea

### 4d. Ojo con el tamano

El popup ya tiene 152 lineas. Con notas se acercara al limite de 250. Si se pasa, extraer la seccion de notas a un componente `NotasAlumno.jsx` en `src/components/features/`.

---

## Paso 5 — Indicador visual en la lista de asistencia

### 5a. StudentRow.jsx

Recibe una prop nueva `tieneNotas` (boolean).

Si es true, mostrar un punto pequeno al lado del nombre:
```jsx
{tieneNotas && (
  <span className="inline-block size-2 rounded-full bg-gold ml-1.5" />
)}
```

Un punto dorado sutil. El profesor lo ve y sabe: "este alumno tiene notas, puedo pulsar para leerlas."

### 5b. AttendancePage.jsx

Al mapear alumnos para renderizar `StudentRow`, pasar la prop `tieneNotas` que viene de la API (paso 2c).

---

## Paso 6 — Dashboard CEO (opcional, fase posterior)

Seccion "Notas recientes" en DashboardPage.jsx:
- Nuevo endpoint `getNotasRecientes(convocatoriaId, limite)` que devuelve las ultimas N notas de toda la convocatoria
- Renderizar como feed: nombre alumno, profesor, fecha, texto
- Limite: 10-15 notas

**No incluir en la primera implementacion.** Primero validar que los profesores usan las notas.

---

## Orden de implementacion

| Orden | Que | Donde | Depende de |
|-------|-----|-------|------------|
| 1 | Crear hoja NOTAS + anadir a hojasExcluidas | Spreadsheet + Gestion convocatorias.js | Nada |
| 2 | Endpoints getNotas y guardarNota | Codigo.js | Paso 1 |
| 3 | Ampliar getAlumnos con tieneNotas | Codigo.js | Paso 1 |
| 4 | Funciones getNotas/guardarNota en api.js | src/services/api.js | Paso 2 |
| 5 | UI de notas en StudentDetailPopup.jsx | src/components/features/ | Pasos 2, 4 |
| 6 | Indicador visual en StudentRow.jsx | src/components/features/ | Paso 3 |
| 7 | clasp push + deploy + test E2E | - | Pasos 1-6 |

---

## Datos de referencia

- StudentDetailPopup.jsx: 152 lineas actuales, limite 250
- api.js: 161 lineas actuales
- Codigo.js: doGet cases en linea 190-200, doPost cases en linea 416-420
- Gestion convocatorias.js: hojasExcluidas en linea 276
- Prop student ya incluye: id, name, teacher, group, weekly, biweekly, monthly
- El profesor_id esta disponible en sessionStorage ('user') como user.id
