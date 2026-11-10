# Datos espaciales: Copernicus / SERNAGEOMIN / DGA

El proyecto no contiene datos públicos de SERNAGEOMIN ni requiere credenciales. Descárgalos **directamente de sus publicaciones oficiales** y conserva su fuente original en `data/raw/`. No interpretes registros históricos como estados actualizados.

## Elevación

- Fuentes: Copernicus DEM GLO-30, otros DEM oficiales o levantamientos propios.
- Copernicus GLO-30 es un **modelo digital de superficie**, no necesariamente suelo desnudo.
- Recomendación técnica: recortar cuenca y reproyectar a UTM apropiado (metros), eliminar NoData, registrar fecha/producto/resolución.
- Conversión `.tif/.tiff`: requiere `rasterio` disponible en el Python usado. `python tools/import-dem.py --input "data/raw/cuenca.tif" --output "data/processed/cuenca.json"`.
- Conversión `.asc`: solo estándar Python, mismo comando modificando extensión.
- Importa `data/processed/cuenca.json` desde el visor. El programa conserva `provenance`, `boundsWGS84` si existía, y advierte que el resultado no está calibrado.

## Catastros

Los catastros de remociones y relaves no se importan automáticamente a este MVP; para una integración fiable deben verificarse geometría CRS, fechas, actualizaciones, estado de la instalación y volumen, y normalizarse a un esquema de capa con identificador persistente. El modelado de liberación de relaves no debe hacerse inferiendo altura o volumen solo de imágenes Sentinel.

## Calidad de datos mínima

- CRS explícito y resolución métrica.
- Sin pixeles nulos en la cuenca modelada.
- Fuente e instrumento de captura identificado.
- Precisión vertical y vigencia evaluadas.
- Aportes/precipitaciones y parámetros físicos documentados.
- Restricción de uso y licencias verificadas.

Fuentes de referencia:
- https://dataspace.copernicus.eu/browser/
- https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM
- https://www.sernageomin.cl/
- https://dga.mop.gob.cl/
