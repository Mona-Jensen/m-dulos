"""Browser smoke offline: blob imports and intercepted API; no network dependency.
Does not test live ArcGIS network: client integration is covered in arcgis.test.mjs.
"""
import base64, posixpath, re
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];pub=ROOT/'public'
html=(pub/'index.html').read_text().replace('<link rel="stylesheet" href="/css/styles.css" />',f'<style>{(pub/"css/styles.css").read_text()}</style>').replace('<script type="module" src="/js/main.mjs"></script>','')
paths=['engine/terrain.mjs','engine/scenarios.mjs','engine/risk.mjs','engine/replay.mjs','renderer/math.mjs','renderer/geometry.mjs','engine/solver.mjs','renderer/webgl.mjs','renderer/fallback.mjs','catalog.mjs','main.mjs']
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 page=b.new_page(viewport={'width':1500,'height':920})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html)
 data=(pub/'data/relaves_puntos_oct2025.geojson').read_text()
 page.evaluate('''d=>{window.fetch=async (url, options)=>{if(url==='/api/catalog/status')return new Response(JSON.stringify({ready:false,kind:'puntos',offlinePoints:836,syncing:false}),{status:200});if(url==='/api/catalog/geojson')return new Response(JSON.stringify({...JSON.parse(d),sirm:{kind:'puntos',source:'Excel oficial'}}),{status:200});throw Error('API no interceptada: '+url);}}''',data)
 tex=base64.b64encode((pub/'assets/earth-geography.jpg').read_bytes()).decode()
 imgurl=page.evaluate('''b64=>{let b=atob(b64),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return URL.createObjectURL(new Blob([a],{type:'image/jpeg'}));}''',tex)
 urls={}
 for rel in paths:
  src=(pub/'js'/rel).read_text()
  def rep(m):
   target=posixpath.normpath(posixpath.join(posixpath.dirname(rel),m.group(2)))
   assert target in urls,(rel,target)
   return m.group(1)+urls[target]+m.group(3)
  src=re.sub(r"(from\s+['\"])(\.[^'\"]+)(['\"])",rep,src)
  src=src.replace('/assets/earth-geography.jpg',imgurl)
  urls[rel]=page.evaluate('''src=>URL.createObjectURL(new Blob([src],{type:'text/javascript'}))''',src)
 page.evaluate('''async src=>await import(src)''',urls['main.mjs'])
 page.locator('#headerCatalog').click()
 page.wait_for_function("document.querySelector('#catalogCount').textContent.includes('836')")
 assert 'PUNTUALES' in page.locator('#catalogMode').inner_text()
 print('Catastro puntos:',page.locator('#catalogCount').inner_text(),page.locator('#catalogMode').inner_text())
 page.locator('#catalogSearch').fill('PAMPA PABELLON')
 assert '1 entidades' in page.locator('#visibleCount').inner_text()
 page.locator('#catalogSearch').fill('')
 page.locator('#regionFilter').select_option(label='Tarapacá')
 print('Filtro Tarapacá:',page.locator('#visibleCount').inner_text())
 page.locator('#regionFilter').select_option('')
 (ROOT/'scratch/reports').mkdir(parents=True,exist_ok=True)
 page.screenshot(path=str(ROOT/'scratch/reports/catalog-browser.png'),full_page=True)
 assert not errors,errors
 page.locator('#closeCatalog').click()
 assert not page.locator('#catalogView').is_visible()
 print('Browser OK; sin errores JS')
 b.close()
