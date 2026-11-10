# SIRM v2 — Catastro territorial + simulador 3D demostrativo

## Alcance real de esta entrega

Esta entrega es un prototipo local de visualización y análisis conceptual, no un sistema de gestión de riesgos operativo ni una predicción geotécnica certificada.

Los componentes que sí están implementados y comprobados en esta versión son:

- catálogo geográfico local con puntos del catastro oficial
- validación estructural de descargas ArcGIS
- caché verificable con hash SHA-256
- visor 3D con cuenca sintética e indicadores ilustrativos
- reproducción temporal y exportación JSON

Los componentes que aún no están implementados como función real, operativa y validada son:

- DEM Copernicus real cargado automáticamente en el visor principal
- Sentinel-2 real georreferenciado sobre el DEM
- modelado físico real de inundación, relaves y deslizamientos
- datos en vivo de DGA o MeteoChile con validación de calidad
- IA generativa con contexto, citas y control de incertidumbre
- video realista con DEM real + imágenes + cronología y trazabilidad completa

En otras palabras, el proyecto cumple la función de laboratorio de análisis visual y de validación técnica de flujo local, pero no reemplaza una modelación geotécnica, un levantamiento topográfico o un estudio operacional de amenaza.

**Versión 2 — octubre de 2026.** Conserva la visualización 3D anterior y añade una **interfaz de consulta territorial sobre datos reales de SERNAGEOMIN**. La vista del catastro muestra 836 puntos reales del Excel suministrado y ofrece descarga automática de polígonos completos desde ArcGIS cuando exista acceso a Internet. **No usa esos polígonos para simular físicamente una falla de muro.**

## Iniciar en Windows (VS Code)

1. Descomprimir este proyecto y abrir la carpeta `SIRM` en Visual Studio Code.
2. Abrir `INICIAR_SIRM_WINDOWS.cmd`, o ejecutar desde la terminal `node tools/server.mjs` (Node.js >= 20, sin `npm install`).
3. Abrir **http://localhost:5187/**.
4. Pulsar **Catastro oficial** y explorar 836 puntos georreferenciados; buscar por nombre, filtrar región, hacer zoom y seleccionar instalaciones.
5. Pulsar **Sincronizar polígonos**. El botón descargará todos los registros de SERNAGEOMIN directamente, sin copiar archivos. **Requiere acceso a ArcGIS**. Los fallos dejan intactos los datos anteriores.
6. Alternativa por consola: `npm run sync:relaves` o `SINCRONIZAR_RELAVES_WINDOWS.cmd`.
7. Pruebas: `npm run check`. Para el diseño y limitaciones: `docs/INTEGRACION_ARCGIS.md`.

**Estado de la fuente en esta entrega:** 836 ubicaciones del catastro Excel verificadas localmente; la fuente poligonal no se pudo sincronizar en el entorno de construcción por un bloqueo de DNS hacia ArcGIS. Por eso **NO se adjuntan polígonos descargados** ni se presentan como obtenidos. Nunca se incorporó el texto GeoJSON corrupto pegado previamente.

---

# SIRM — Simulador de Remociones en Masa

![Estado](https://img.shields.io/badge/estado-prototipo%20demostrativo-blue)

**Aplicación local 3D para Visual Studio Code, sin instalaciones de paquetes npm.** Incluye una Tierra geográfica giratoria, cuenca sintética 3D, escenarios de inundación, remoción y relaves, animación, viviendas expuestas, gráficas básicas de alcance, importación de terrenos y grabación de video de **03:00** mediante WebM.

> **ADVERTENCIA:** Es un **prototipo visual y un modelo físico simplificado**, no una evaluación de amenaza validada, una predicción geotécnica ni una herramienta de gestión de emergencias. El terreno y las viviendas iniciales son sintéticos. Las casas que parecen desplazarse representan una regla visual ilustrativa, **no** un cálculo de colapso estructural.

## Ejecución en Windows + Visual Studio Code

**Requisito:** Node.js 20 o superior (comprobado con Node.js 22). No se necesita React, Vite, Cesium, Antigravity, Docker ni Internet.

1. Descomprime el ZIP en una ubicación nueva, por ejemplo `C:\Proyectos\simulador de remociones en masa`.
2. En VS Code abre **Archivo → Abrir carpeta** y elige la carpeta que contiene `package.json`.
3. Abre **Terminal → Nueva terminal**. Ejecuta:

   ```powershell
   npm run dev
   # Alternativa si PowerShell bloquea npm.ps1: node tools/server.mjs
   ```

4. Abre **http://localhost:5187/** en Chrome o Edge (WebGL2 activado).
5. Gira el planeta arrastrando con el ratón. Pulsa **Explorar cuenca piloto**.
6. Selecciona `Inundación`, `Remoción en masa` o `Relaves`. Ajusta los parámetros y pulsa **Ejecutar simulación**.
7. Reproduce/pausa, utiliza la barra temporal, descarga resultados JSON o pulsa **Grabar video 03:00**. Mantén la pestaña activa durante la grabación.

**Si WebGL2 está deshabilitado, el programa cambia a un **modo de compatibilidad 2.5D** que conserva los controles y métricas, pero no ofrece la perspectiva 3D completa.

**Sin `npm install`**: el proyecto usa solamente módulos JavaScript nativos del navegador y un servidor Node incorporado. Los archivos de textura se encuentran en `public/assets/`.

### Pruebas

Desde la raíz en otra terminal:

```powershell
npm run check
python -m unittest discover -s scratch/tests -p "test_*.py" -v
```

Para ejecutar únicamente el test del solver: `npm test`. Los scripts de prueba, benchmarks y diagnósticos viven en `scratch/`.

## Entregables funcionales

| Componente | Estado |
|---|---|
| Planeta con continentes reales y rotación automática | Implementado (textura geográfica Natural Earth; **no** es una imagen satelital NASA) |
| Cuenca piloto 3D sintética y cámara interactiva | Implementado (WebGL2; fallback 2.5D si falta GPU) |
| 3 escenarios configurables: agua, detritos, relaves | Implementado como **aproximación de flujo superficial** |
| Profundidad, extensión y viviendas afectadas | Implementado con indicadores ilustrativos |
| Reproducción de 180 segundos | Implementado (15 min físicos comprimidos a 3 min de película) |
| Grabación de video WebM de 180 s | Implementado con MediaRecorder; requiere navegador compatible y pestaña abierta |
| Exportación de resultados JSON | Implementado |
| Importación de terreno JSON y conversor ESRI ASCII/GeoTIFF | Implementado; GeoTIFF requiere `rasterio` opcional |
| Cálculo avanzado de rotura de presa de relaves | **NO incluido**: requiere física y datos especializados |
| Modelos geotécnicos 3D y fallas de edificios | **NO incluidos**: animación visual orientativa |
| Catastros SERNAGEOMIN y Copernicus descargados | **NO incluidos**: necesitan fuentes reales y revisión |

## Organización del repositorio

```text
simulador de remociones en masa/
├── .vscode/                    tareas y ejecución
├── public/
│   ├── index.html              estructura de la interfaz
│   ├── assets/                 textura local con geografía real
│   ├── css/styles.css          diseño responsivo
│   └── js/
│       ├── main.mjs            controles, interfaz, video y exportación
│       ├── engine/             solver, escenarios, terreno, riesgos y reproducción
│       └── renderer/           geometría, WebGL2, matrices y escena
├── tools/
│   ├── server.mjs              servidor HTTP local con Node.js
│   └── import-dem.py           conversión ASC/GeoTIFF a terreno SIRM
├── data/                       reservado para datos del usuario
├── docs/                       arquitectura, metodología y guía de datos
├── scratch/
│   ├── tests/                  pruebas aisladas
│   └── benchmarks/             medición reproducible
├── .gitignore
└── package.json
```

## Importación de elevaciones Copernicus

1. Descarga un DEM en GeoTIFF, preferentemente recortado a la cuenca piloto.
2. Ábrelo en QGIS. Reproyecta a un CRS **métrico** y recorta celdas sin datos. Para Chile, selecciona la zona UTM apropiada a la región estudiada.
3. Con Python y `rasterio` instalado en un entorno virtual aislado, ejecuta:

   ```powershell
   python tools/import-dem.py --input "data/raw/cuenca.tif" --output "data/processed/cuenca.json"
   ```

4. En el visor, pulsa **Importar terreno JSON** y selecciona el resultado.

Para una grilla ESRI ASCII (`.asc`), el conversor funciona sin `rasterio`. Más detalles en [docs/DATOS.md](docs/DATOS.md).

## Limitaciones importantes

El terreno tiene una resolución máxima de 256×256 celdas en el visor; el conversor reduce GeoTIFF a 128×128 para evitar saturar la memoria. No utilices la distancia de la cámara ni la exageración vertical para inferir cotas precisas. No se garantiza que los resultados sean comparables a HEC-RAS, r.avaflow o RAMMS. Los depósitos reales y sus características no se obtienen automáticamente. El cálculo de daño de edificios emplea umbrales de visualización sin una curva de fragilidad calibrada.

El video se exporta como **WebM**, no MP4, porque el navegador controla los códecs disponibles. Es una animación de **180 segundos de duración objetivo**, producida en tiempo real; se debe comprobar su duración efectiva tras la descarga. Se preserva la escena 3D, no los paneles HTML superpuestos.

## Fuentes y créditos

- Costas/continentes: Natural Earth (datos cartográficos de dominio público, usado para generar una textura offline).
- [Copernicus Data Space Ecosystem — DEM](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM).
- [HEC-RAS — documentación de referencia](https://www.hec.usace.army.mil/software/hec-ras/documentation.aspx) (referencia metodológica, no motor usado en este prototipo).
- [NASA Blue Marble](https://science.nasa.gov/earth/earth-observatory/history-of-the-blue-marble/) — referencia futura para textura fotográfica satelital; **la imagen NASA no está incluida en este paquete**.

Consulta los documentos de `docs/` antes de emplear conjuntos de datos reales.
