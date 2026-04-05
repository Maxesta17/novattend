# Deploy Seguridad Backend (Phase 6)

Procedimiento para activar la validacion de API key en el endpoint de Apps Script.

**Orden critico:** Apps Script primero, frontend despues. Si se invierte, todos los requests fallan.

## Pre-requisitos

- Acceso al editor de Google Apps Script del proyecto NovAttend
- Acceso al dashboard de Vercel del proyecto NovAttend
- Node.js 18+ con clasp instalado (`npm install -g @google/clasp`)

## Paso 1: Generar UUID v4

Desde la consola del navegador o Node:

```javascript
crypto.randomUUID()
// Copiar el resultado, ej: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

Guardar este UUID — se usara en los pasos 2 y 3.

## Paso 2: Configurar Apps Script

1. Abrir el editor de Apps Script del proyecto NovAttend
2. En `Codigo.js`, buscar la funcion `setApiKey()`
3. Reemplazar `'REEMPLAZAR-CON-UUID-V4-REAL'` con el UUID generado
4. Ejecutar `setApiKey()` desde el menu Ejecutar
5. Verificar con `checkApiKey()` — debe mostrar `API_KEY presente: true`
6. **Revertir** el UUID en `setApiKey()` a `'REEMPLAZAR-CON-UUID-V4-REAL'` (no dejar el UUID real en el codigo)

Alternativa sin tocar codigo:
1. En el editor de Apps Script: Configuracion del proyecto (icono engranaje)
2. Seccion "Propiedades del script"
3. Agregar propiedad: Nombre = `API_KEY`, Valor = UUID generado

## Paso 3: Deploy Apps Script

Opcion A — Con clasp:
```bash
cd apps-script
clasp push
clasp deploy --description "SEC: validacion API key"
```

Opcion B — Desde el editor:
1. Implementar -> Nueva implementacion
2. Tipo: App web
3. Ejecutar como: Yo | Acceso: Cualquiera
4. Copiar la nueva URL de deploy

**Verificacion:** Abrir la URL del endpoint en el navegador sin `?api_key=`. Debe devolver:
```json
{"status":"error","error":"No autorizado","code":401}
```

## Paso 4: Configurar variable de entorno en .env

```bash
# En el archivo .env local (ya esta en .gitignore)
VITE_API_KEY=<UUID-del-paso-1>
```

## Paso 5: Configurar variable en Vercel

1. Dashboard de Vercel -> proyecto NovAttend -> Settings -> Environment Variables
2. Agregar: `VITE_API_KEY` = UUID del paso 1
3. Scope: Production + Preview

## Paso 6: Redeploy frontend

```bash
npm run build
# Si deploy automatico con Vercel: git push es suficiente
# Si deploy manual: vercel --prod
```

**Verificacion final:** Abrir la app en produccion, hacer login, verificar que la carga de convocatorias funciona normalmente.

## Troubleshooting

| Problema | Causa probable | Solucion |
|----------|---------------|----------|
| Todos los requests fallan tras deploy | Script Property no configurada o UUID diferente | Ejecutar `checkApiKey()` en el editor |
| App funciona en local pero no en produccion | VITE_API_KEY no configurada en Vercel | Verificar en Settings -> Environment Variables |
| No se ven logs AUTH_REJECTED | console.warn no visible por defecto | Apps Script Editor -> Ver -> Registros de ejecucion |
| Script Property desaparecio | Solo desaparece si se crea un proyecto NUEVO | Las properties persisten entre deploys del mismo proyecto |

---

## Procedimiento de rotacion de key

Si la key se compromete:

1. Generar nuevo UUID: `crypto.randomUUID()`
2. Actualizar Script Property: ejecutar `setApiKey()` con el nuevo UUID (o via Configuracion del proyecto)
3. Actualizar `.env` local con el nuevo UUID
4. Actualizar variable en Vercel con el nuevo UUID
5. Redeploy frontend: `npm run build` + push o `vercel --prod`
6. Revertir `setApiKey()` al placeholder

**Tiempo estimado de rotacion:** ~5 minutos. Downtime breve aceptable para 8 usuarios internos.
