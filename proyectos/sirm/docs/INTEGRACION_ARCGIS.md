# Conector ArcGIS oficial — SIRM v2 (25/10/2026)

## Alcance técnico

- Fuente: SERNAGEOMIN / ArcGIS FeatureServer / `CDR_CHILE_AREAL_2025`, capa 0.
- URL fija: https://services1.arcgis.com/OyjvVdFTl5hfSdX3/ArcGIS/rest/services/CDR_CHILE_AREAL_2025/FeatureServer/0
- El programa **no solicita URLs arbitrarias** al usuario: no actúa como proxy abierto.
- La descarga completa solo ocurre bajo comando `npm run sync:relaves` o botón **Sincronizar polígonos**. Debe haber acceso HTTPS a ArcGIS.
- Antes de esa descarga el visor utiliza `public/data/relaves_puntos_oct2025.geojson`, obtenido del libro `CATASTRO_RELAVES_CHILE_OCT2025_1.xlsx` aportado por la usuaria. Contiene 836 **puntos** y no representa áreas o muros.
- El fichero geoquímico original se conserva en `data/raw/` como insumo recibido, **aún no integrado por falta de cruce espacial e ID acreditados**.

## Descarga íntegra: procedimiento implementado

1. Consulta los metadatos (`?f=json`) y confirma geometría `esriGeometryPolygon` y soporte `geoJSON`.
2. Obtiene el conteo completo (`returnCountOnly=true`).
3. Solicita todos los `OBJECTID` (`returnIdsOnly=true`) y compara longitud/duplicados con el conteo.
4. Descarga por `objectIds` explícitos en lotes de 125, `outFields=*`, `returnGeometry=true`, `outSR=4326`, `f=geojson`.
5. Rechaza JSON/GeoJSON inválido, lote incompleto, ID extra o duplicado, anillos abiertos, coordenadas fuera de WGS84 y discrepancias de conteo.
6. Solo si **todo** es correcto escribe un archivo inmutable en `data/cache/sernageomin-relaves/snapshots/<sha256>.geojson`. Publica `manifest.json` al final como puntero de la versión activa; el fallo de una corrida no altera el conjunto activo.
7. La API local comprueba el hash SHA-256 antes de usar el archivo activo; si falla, NO oculta el error ni sustituye el polígono por uno inventado.

La validación estructural **no equivale** a certificación topológica ni a validez geotécnica. El catastro puede contener contornos cartográficos con calidad variable. No incluye cotas reales de muro ni información suficiente para calcular una rotura.

## Endpoints locales

| HTTP | Ruta | Resultado |
|--|--|--|
| GET | `/api/catalog/status` | Estado, fuente, fecha y SHA-256 si está sincronizado |
| GET | `/api/catalog/geojson` | GeoJSON completo (polígonos si hay snapshot íntegro; de lo contrario 836 puntos), con etiqueta `sirm.kind` |
| POST | `/api/catalog/sync` | Ejecuta sincronización oficial; devuelve 502 si falla y conserva snapshot anterior |

Todos los endpoints se atienden solamente en `127.0.0.1` (servidor local, sin autenticación). No expongas directamente este servidor a redes públicas.

## Pruebas reproducibles

- `npm run check`: análisis sintáctico y pruebas Node, incluye lotes de 1205 entidades ficticias **solo de prueba**; rechaza datos alterados y preserva la versión previa.
- `python scratch/tests/catalog_browser_smoke.py`: navegador Chromium local sin red, con API interceptada para probar consulta, filtros y navegación; prueba la UI con **836 puntos del catastro original**.
- `npm run sync:relaves`: prueba real de interoperabilidad. **No ejecutada exitosamente en este entorno**, porque su red no resuelve el servidor ArcGIS. Ejecutar en el equipo de la usuaria con Internet.

## Riesgos y siguiente fase

- Necesidad de inspección topológica avanzada con librerías GIS (orientación de anillos, huecos, solapes, geometrías inválidas, superficies y precisión), hoy no implementada.
- Los polígonos no son sólidos geotécnicos ni geometrías Z del muro.
- Sin confirmación de unidades y calidad, `VOL_ACTUAL` y `VOL_AUTORIZADO` son solo atributos de la fuente, jamás volumen automáticamente liberado.
- Los 836 puntos Excel y la capa poligonal ArcGIS pueden diferir en cobertura, fecha e identificadores; **no se asume** correspondencia uno a uno.
- A futuro: motor de inventario de fuentes OGC/ArcGIS, normalización en PostGIS/GeoPackage, revisión histórica del SEA, DEM de alta resolución, modelo físico certificado por caso de uso.
