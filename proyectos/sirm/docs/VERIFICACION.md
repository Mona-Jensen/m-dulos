# Registro de verificación — 25 de octubre de 2026

## Automatizada

| Comprobación | Resultado |
|---|---|
| `npm run check` | APROBADO, 13/13 tests de Node.js |
| `python -m unittest discover -s scratch/tests -p 'test_*.py' -v` | APROBADO, 2/2 tests |
| Parser de módulos Node (`node --check`) | APROBADO |
| HTTP servido por Node con MIME correcto y ausencia de rutas fuera de `public/` | APROBADO |
| Conservación de volumen, profundidad no negativa, 3 escenarios | APROBADO |
| Construcción de geometrías, normales y malla de inundación | APROBADO |
| Conversión ESRI ASCII y rechazo de NoData | APROBADO |

## Visual funcional

- Chromium con Xvfb y WebGL2 vía SwiftShader: validado globo terráqueo, entrada a cuenca, ejecución de inundación, barra temporal, regreso y ausencia de errores de JavaScript.
- En el fotograma 96/180 del escenario de inundación (8 minutos físicos) se observaron **4 de 84 viviendas sobre umbrales ilustrativos**.
- Chromium sin WebGL2: el renderizador Canvas 2.5D y los controles también funcionan.
- Capturas originales de la inspección: `scratch/reports/browser-earth-full3d.png`, `browser-impact-full3d.png`, `browser-scenario-full3d.png` y capturas de modo fallback.
- Grabador WebM: **inicio de grabación validado** (`GRABANDO · 00:01 / 03:00`, sin errores de JavaScript). No se ejecutó una captura continua completa de 180 segundos en este entorno. **La duración exacta y la integridad del archivo deben verificarse en Chrome/Edge local**.

## Restricciones de los resultados

No se efectuó calibración de inundaciones con datos de campo, ensayos hidráulicos, análisis geotécnico ni pruebas de estabilidad de un depósito de relaves. El motor implementa una aproximación local-inercial para demostración. La fuente topográfica predeterminada es sintética y las viviendas son ilustrativas.

## Reproducción en VS Code (Windows)

1. Extraer la carpeta en ubicación nueva.
2. Abrir su `package.json` en VS Code desde la raíz del proyecto.
3. `node tools/server.mjs` y visitar `http://localhost:5187/`.
4. Abrir con GPU/WebGL2 para renderizado 3D. Si no está activo, comprobar banner `MODO COMPATIBILIDAD 2.5D`.
5. Seleccionar `Inundación`, ejecutar, buscar minuto **01:36** para observar viviendas expuestas y probar captura WebM.
