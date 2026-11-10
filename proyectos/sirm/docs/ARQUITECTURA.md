# Arquitectura del sistema

## Principios

- **Offline-first:** la interfaz, imágenes y servidor están incluidos; no hay CDN ni API remota requerida.
- **Separación física/visual:** `engine/solver.mjs` nunca manipula WebGL. `renderer/` nunca decide qué es una inundación.
- **Reproducibilidad:** los tres escenarios parten del mismo DEM determinista; los pasos y parámetros quedan registrados en la exportación JSON.
- **Fidelidad semántica:** terrenos demo, exposiciones ilustrativas y parámetros no calibrados se etiquetan siempre.
- **Aislamiento de pruebas:** todas las pruebas, benchmarks y capturas diagnósticas viven bajo `scratch/`.

## Datos

`terrain` = `{rows, cols, dx, heights: Float32Array, provenance, boundsWGS84?}`. Orden de lectura por filas, de norte a sur cuando proviene de un GeoTIFF. Elevaciones y longitudes expresadas en metros.

`scenario` = `{id, material, rainfallMMH, sourceRate, duration, manning}`.

`timeline` = 181 fotogramas (0 a 900 s físicos), reproducidos a 180 s de animación. Cada fotograma contiene `depth`, `speed`, `stats`.

## Motor físico

Aproximación local-inercial de flujo somero, conservación interna de masa sobre límites cerrados, fricción tipo Manning; no representa reología real de relaves ni geología de deslizamientos. Usa volumen de aporte hipotético repartido sobre nueve celdas, y lluvia opcional uniforme. El término `speed` es una aproximación de velocidades derivada de los caudales de cara de celda.

## Renderizador

WebGL2 puro: shader de iluminación y textura, globo UV con geografía de Natural Earth, malla de terreno con normales, malla dinámica de agua/materia, viviendas modelo 3D e interacción orbital con ratón. Se renderiza la superficie libre; no se simula la estructura tridimensional del interior del flujo.

## Exportación

- JSON: metadatos del escenario, DEM, parámetros, última malla de profundidades/velocidades orientativas y evaluaciones de viviendas.
- WebM 180 s: `MediaRecorder(canvas.captureStream(24))`. Duración real depende de la disponibilidad del codificador y del navegador. Mantener la pestaña activa; no grabar información personal.

## Próxima arquitectura científica (NO implementada)

1. PostGIS y catálogo de fuentes con licencia, fecha, resolución y procedencia.
2. Preprocesamiento hidro-geotécnico con hidrología de cuenca real.
3. Adaptadores a HEC-RAS 2D y r.avaflow, ejecutados separadamente y con esquemas de salida verificables.
4. Calibración y comparación con evento histórico; curvas de fragilidad y exposición reales.
5. Experimentos A/B y propagación de incertidumbre.
