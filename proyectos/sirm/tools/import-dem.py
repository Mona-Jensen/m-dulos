#!/usr/bin/env python3
"""Convert ASCII Grid (stdlib) or GeoTIFF (optional rasterio) to SIRM terrain JSON.

Usage:
  python tools/import-dem.py --input data/raw/cuenca.asc --output data/processed/cuenca.json
  python tools/import-dem.py --input data/raw/copernicus_dem.tif --output data/processed/cuenca.json

All metric distances must be known and CRS projected for accurate cell size.
No input file is changed. Geometry is downsampled to max 128 x 128.
"""
from __future__ import annotations
import argparse
import json
import math
from pathlib import Path
from datetime import datetime, timezone


def parse_ascii_grid(filename: Path):
    """Read ESRI ASCII grid with lower-left corner and cellsize."""
    with filename.open('r', encoding='utf-8-sig') as f:
        header = {}
        while len(header) < 6:
            s = f.readline()
            if not s:
                raise ValueError('Cabecera ESRI ASC incompleta')
            chunks = s.strip().split()
            if len(chunks) != 2:
                raise ValueError(f'Cabecera ASC incorrecta: {s!r}')
            header[chunks[0].lower()] = float(chunks[1])
        cols = int(header['ncols']); rows = int(header['nrows'])
        size = header['cellsize'];nodata = header.get('nodata_value', -9999)
        if not 2 <= cols <= 20000 or not 2 <= rows <= 20000 or size <= 0:
            raise ValueError('Dimensiones o tamaño de celda inválidos')
        raster = []
        for line in f:
            raster.extend(float(v) for v in line.strip().split())
        if len(raster) != cols * rows:
            raise ValueError('Cantidad de píxeles diferente de la cabecera')
        if any(not math.isfinite(v) or v == nodata for v in raster):
            raise ValueError('ASC contiene NoData: recorta una cuenca válida antes de convertir')
        return rows,cols,size,raster,None,'ASC; unidades métricas asumidas (comprobar CRS)',None


def parse_geotiff(filename: Path):
    try:
        import numpy as np
        import rasterio
        from rasterio.enums import Resampling
        from rasterio.warp import transform_bounds
    except ImportError as exc:
        raise RuntimeError('Para GeoTIFF instala rasterio en un entorno Python aislado. Para ASC no hay dependencias.') from exc
    with rasterio.open(filename) as ds:
        if ds.crs is None:
            raise ValueError('GeoTIFF sin CRS: es necesario georreferenciarlo antes')
        if not ds.crs.is_projected:
            raise ValueError('GeoTIFF con CRS geográfico: reproyecta a un sistema métrico (UTM) en QGIS antes')
        if ds.crs.to_epsg() == 4326:
            raise ValueError('GeoTIFF en EPSG:4326: reproyecta a UTM o otro CRS métrico antes de importar')
        rows=min(128,ds.height);cols=min(128,ds.width)
        data=ds.read(1,out_shape=(rows,cols),resampling=Resampling.bilinear,masked=True)
        if np.ma.getmaskarray(data).any():
            raise ValueError('El recorte contiene píxeles NoData: completa los huecos antes de importar')
        if not np.isfinite(data).all():
            raise ValueError('El raster tiene elevaciones no finitas')
        xres=abs(ds.transform.a)*ds.width/cols
        yres=abs(ds.transform.e)*ds.height/rows
        if abs(xres-yres)/max(xres,yres)>.04:
            raise ValueError('Píxeles no cuadrados. Reproyecta con una resolución X/Y uniforme')
        b=transform_bounds(ds.crs,'EPSG:4326',*ds.bounds)
        bounding=[round(float(v),7) for v in b]
        return rows,cols,(xres+yres)/2,data.filled().ravel().tolist(),bounding,ds.crs.to_string(),ds.res


def downsample(rows,cols,dx,values,max_size=128):
    if rows <= max_size and cols <= max_size:return rows,cols,dx,values
    # Nearest-cell resampling; user should prefer QGIS/rasterio bilinear for scientific analysis.
    factor=max(rows/max_size,cols/max_size)
    nr=max(8,round(rows/factor));nc=max(8,round(cols/factor))
    output=[]
    for r in range(nr):
        ir=min(rows-1,round(r*(rows-1)/(nr-1)))
        for c in range(nc):
            ic=min(cols-1,round(c*(cols-1)/(nc-1)))
            output.append(values[ir*cols+ic])
    dx *= ((cols-1)/(nc-1)+(rows-1)/(nr-1))/2
    return nr,nc,dx,output


def convert(source: Path, destination: Path):
    source=source.resolve(); destination=destination.resolve()
    if not source.exists():raise FileNotFoundError(source)
    if source==destination:raise ValueError('Origen y destino no pueden ser el mismo archivo')
    suffix=source.suffix.lower()
    if suffix in ('.asc','.txt'):
        rows,cols,dx,vals,bbox,crs,_=parse_ascii_grid(source)
        rows,cols,dx,vals=downsample(rows,cols,dx,vals)
    elif suffix in ('.tif','.tiff'):
        rows,cols,dx,vals,bbox,crs,_=parse_geotiff(source)
    else:raise ValueError('Formato no admitido: usa .asc o .tif/.tiff')
    if rows<8 or cols<8:raise ValueError('El terreno debe tener al menos 8 × 8 celdas')
    if not all(math.isfinite(v) for v in vals):raise ValueError('Los valores deben ser finitos')
    doc={'rows':rows,'cols':cols,'dx':round(float(dx),6),
         'heights':[round(float(x),4) for x in vals],
         'realTerrain': True,
         'provenance':{'type':'imported','label':source.stem,'sourceFilename':source.name,
           'sourceCRS':crs,'importedAt':datetime.now(timezone.utc).isoformat(),
           'warning':'DEM importado. Calidad, precisión y condiciones geotécnicas NO validadas.'}}
    if bbox:doc['boundsWGS84']=bbox
    destination.parent.mkdir(parents=True,exist_ok=True)
    destination.write_text(json.dumps(doc,separators=(',',':'),ensure_ascii=False),encoding='utf-8')
    return doc


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',required=True,type=Path)
    parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args()
    doc=convert(args.input,args.output)
    print('Terreno convertido:',args.output)
    print(f"Cuadrícula: {doc['rows']} x {doc['cols']} | celda: {doc['dx']} m | fuente: {doc['provenance']['sourceCRS']}")
    print('NOTA: No se ha calibrado ningún modelo físico ni geotécnico.')

if __name__=='__main__':main()
