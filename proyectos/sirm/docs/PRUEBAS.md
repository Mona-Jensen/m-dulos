# Plan de pruebas y criterios de aceptación

## Onda 0: base reproducible
- [ ] Node >= 20; `npm run dev` inicia HTTP en localhost:5187.
- [ ] `npm run check`: 0 errores.
- [ ] `python -m unittest discover -s scratch/tests -p "test_*.py" -v`: 0 errores.
- [ ] La primera pantalla muestra Tierra con continentes reales y rotación automática.
- [ ] Navegación: ratón mueve/rota y rueda acerca/aleja.

## Onda 1: física demostrativa
- [ ] Botón explorar abre cuenca 3D.
- [ ] Cada escenario crea 181 estados en tiempo simulado 0–900 s.
- [ ] Se ven agua/material, viviendas y métricas que cambian en el tiempo.
- [ ] Los controles reproducir/pausar/ir a tiempo funcionan.
- [ ] Exportación JSON incluye procedencia, parámetros y advertencia.

## Onda 2: video
- [ ] Chrome/Edge permite `MediaRecorder` con WebM.
- [ ] La grabación se detiene después de 180 s de reloj, en pestaña visible.
- [ ] Archivo `.webm` reproduce, muestra movimiento y tiene duración real >= 180 s (inspección posterior).

## Onda 3: datos GIS
- [ ] Convertidor ASCII no altera original.
- [ ] GeoTIFF reproyectado/recortado importa sin nulos.
- [ ] Proveniencia del archivo queda indicada.

## Qué NO se valida con estas pruebas
- Calibración hidrológica o geotécnica.
- Cálculo de brechas reales de relaves.
- Predicción de colapso o desplazamiento de edificios.
- Precisión cartográfica o normativa de seguridad pública.

Todos los resultados de capturas, comparaciones y diagnósticos deben almacenarse en `scratch/reports/`.
