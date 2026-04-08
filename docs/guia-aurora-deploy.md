# Como activar NovAttend en tu spreadsheet

Guia para Aurora. Sigue los pasos en orden. Si algo no coincide, para y pregunta.

---

## Paso 1 — Abrir el editor de scripts

1. Abre el spreadsheet **"Control de Asistencia Global"** en Google Sheets
2. Arriba, pulsa **Extensiones**
3. Pulsa **Apps Script**
4. Se abre una pestaña nueva con codigo. No toques nada del codigo.

---

## Paso 2 — Crear un nuevo despliegue

1. Arriba a la derecha, pulsa el boton azul **Implementar**
2. Pulsa **Nueva implementacion**
3. Aparece una ventana. Al lado de "Tipo", pulsa el engranaje (rueda dentada)
4. Elige **Aplicacion web**

---

## Paso 3 — Configurar los permisos

En la misma ventana veras dos campos:

- **Ejecutar como:** tiene que decir **Yo** (tu email)
- **Quien tiene acceso:** cambialo a **Cualquier usuario**

Escribe una descripcion corta, por ejemplo: `NovAttend v1`

---

## Paso 4 — Pulsar Implementar

1. Pulsa el boton **Implementar**
2. Google te pedira permiso. Pulsa **Autorizar acceso**
3. Si sale una pantalla que dice "Google no ha verificado esta aplicacion":
   - Pulsa **Avanzado** (abajo a la izquierda, en letra pequeña)
   - Pulsa **Ir a NovAttend (no seguro)**
   - Pulsa **Permitir**
4. Aparece una URL larga que empieza por `https://script.google.com/macros/...`
5. **Copia esa URL** (pulsa el icono de copiar o selecciona todo y Ctrl+C)

---

## Paso 5 — Enviar la URL

Envia esa URL por WhatsApp o email a Manuel. El la configurara en la app.

**No compartas esta URL con nadie mas.** Quien tenga esta URL puede ver los datos del spreadsheet.

---

## Si necesitas hacer un nuevo despliegue despues de cambios

1. Extensiones → Apps Script
2. Implementar → **Administrar implementaciones**
3. Pulsa el lapiz (editar) en la implementacion existente
4. En "Version", elige **Nueva version**
5. Pulsa **Implementar**
6. La URL no cambia, no hace falta enviarla otra vez.

---

## Problemas comunes

**"No tengo la opcion Extensiones"**
→ Necesitas ser propietaria o editora del spreadsheet. Pide acceso.

**"Me pide permiso otra vez"**
→ Normal. Pulsa Autorizar y sigue los mismos pasos del Paso 4.

**"La app no muestra los datos nuevos"**
→ Espera 2 minutos (la app guarda los datos en memoria temporal). Si sigue igual, cierra la app y vuelve a abrirla.
