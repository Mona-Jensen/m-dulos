# Chile Volcánico

Aplicación web para explorar información volcánica, capas geográficas y recursos de prevención.

**Autoría:** Gianina Jensen Guzmán.

## Qué incluye

- Mapa interactivo, búsqueda y paneles de consulta.
- Manifiesto y service worker.
- Funciones de Netlify para consulta de fuentes externas.

## Tecnologías

HTML, CSS, JavaScript, Leaflet y funciones Node.js.

## Estado de la muestra

Prototipo en desarrollo.

## Ejecución

```text
python -m http.server 8080
# Las funciones externas requieren un entorno Netlify configurado.
```

## Alcance y pendientes

No se ha comprobado la actualización en vivo ni el funcionamiento offline de todas las capas. No utilizar sus estados ilustrativos como alertas oficiales.

[Volver al portafolio](../../README.md)

La capa FIRMS está desactivada en la muestra pública: se retiró una clave incrustada. La función de servidor adjunta es un mock; integrar la fuente desde servidor con una variable de entorno antes de habilitarla.
