# SIRM — Visualización territorial y simulación demostrativa

Prototipo que reúne consulta cartográfica, validación de datos y visualización de escenarios 3D.

**Autoría:** Gianina Jensen Guzmán.

## Qué incluye

- Catálogo territorial con datos incorporados en la muestra.
- Conector ArcGIS con validación, paginación y caché verificable.
- Escenarios sintéticos, reproducción temporal y exportación de resultados.

## Tecnologías

JavaScript ES Modules, Node.js, WebGL2 y Python.

## Estado de la muestra

Prototipo local; no es un sistema operativo de evaluación de amenazas.

## Ejecución

```text
node tools/server.mjs
# Abrir http://localhost:5187/
```

## Verificación realizada

23 pruebas Node.js aprobadas en esta revisión; incluye pruebas HTTP locales y ArcGIS con respuestas simuladas. No implica una sincronización con ArcGIS real.

## Alcance y pendientes

La sincronización externa, el terreno real y la física geotécnica requieren validaciones adicionales. La documentación original incluye afirmaciones de versiones anteriores: consultar su contexto.

[Volver al portafolio](../../README.md)
