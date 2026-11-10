from playwright.sync_api import sync_playwright
from pathlib import Path
import re,base64,posixpath,os
root=Path(__file__).resolve().parents[2];pub=root/'public'
html=(pub/'index.html').read_text().replace('<link rel="stylesheet" href="/css/styles.css" />',f'<style>{(pub/"css/styles.css").read_text()}</style>').replace('<script type="module" src="/js/main.mjs"></script>','')
paths=['engine/terrain.mjs','engine/scenarios.mjs','engine/risk.mjs','engine/replay.mjs','renderer/math.mjs','renderer/geometry.mjs','engine/solver.mjs','renderer/webgl.mjs','renderer/fallback.mjs','catalog.mjs','main.mjs']
with sync_playwright() as p:
 b=p.chromium.launch(headless=bool(int(os.environ.get('SIRM_HEADLESS','1'))),executable_path=os.environ.get('SIRM_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox','--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
 errs=[]
 page.on('pageerror',lambda ex:errs.append('JS: '+str(ex)))
 page.on('console',lambda msg:errs.append('CONSOLE '+msg.text) if msg.type=='error' else None)
 page.set_content(html)
 tex=base64.b64encode((pub/'assets/earth-geography.jpg').read_bytes()).decode()
 imgurl=page.evaluate('''b64=>{let b=atob(b64),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return URL.createObjectURL(new Blob([a],{type:'image/jpeg'}));}''',tex)
 urls={}
 for rel in paths:
  src=(pub/'js'/rel).read_text()
  def rep(m):
   target=posixpath.normpath(posixpath.join(posixpath.dirname(rel),m.group(2)))
   if target not in urls:raise Exception((rel,target,urls))
   return m.group(1)+urls[target]+m.group(3)
  src=re.sub(r"(from\s+['\"])(\.[^'\"]+)(['\"])",rep,src)
  src=src.replace('/assets/earth-geography.jpg',imgurl)
  urls[rel]=page.evaluate('''src=>URL.createObjectURL(new Blob([src],{type:'text/javascript'}))''',src)
 result=page.evaluate('''async (src)=>{await import(src); return document.querySelector('h1').textContent;}''',urls['main.mjs'])
 page.wait_for_timeout(1200)
 (root/'scratch/reports').mkdir(parents=True,exist_ok=True)
 page.screenshot(path=str(root/'scratch/reports/browser-earth-full3d.png'))
 print('Earth',result,'errors',errs[:10])
 page.locator('#enterButton').click()
 page.wait_for_timeout(1200)
 page.screenshot(path=str(root/'scratch/reports/browser-terrain-full3d.png'))
 print('Terrain mode',page.locator('#modeLabel').inner_text(),'errors',errs[:10])
 page.locator('#runButton').click()
 page.wait_for_timeout(2800)
 page.screenshot(path=str(root/'scratch/reports/browser-scenario-full3d.png'))
 print('Scenario',page.locator('#scenarioTitle').inner_text(),'playtime',page.locator('#playTime').inner_text(),'maxDepth',page.locator('#maxDepth').inner_text(),'errors',errs[:10])
 page.locator('#seek').fill('96')
 page.wait_for_timeout(350)
 page.screenshot(path=str(root/'scratch/reports/browser-impact-full3d.png'))
 print('Seek impact 96',page.locator('#playTime').inner_text(),'houses',page.locator('#houses').inner_text())
 page.locator('#seek').fill('180')
 page.wait_for_timeout(400)
 print('Seek 180',page.locator('#playTime').inner_text(),'houses',page.locator('#houses').inner_text())
 if os.environ.get('SIRM_RECORD_SMOKE')=='1':
  page.locator('#recordButton').click()
  page.wait_for_timeout(1600)
  print('Recorder status',page.locator('#recordStatus').inner_text(),'button',page.locator('#recordButton').inner_text(),'errors',errs[:10])
 page.locator('#returnEarth').click()
 print('return',page.locator('#modeLabel').inner_text())
 b.close()
