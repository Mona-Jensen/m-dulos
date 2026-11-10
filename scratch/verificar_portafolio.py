"""Comprueba estructura, JSON y enlaces Markdown locales sin modificar fuentes."""
from pathlib import Path
import json, re, sys
from urllib.parse import unquote
root = Path(__file__).resolve().parents[1]
errors = []
checks = 0
for p in root.rglob('*'):
    if not p.is_file() or any(x in p.parts for x in ['node_modules', '.git']):
        continue
    if p.suffix in ['.json', '.geojson'] and not p.name.startswith('tsconfig'):
        try:
            json.loads(p.read_text(encoding='utf-8-sig'))
            checks += 1
        except Exception as e:
            errors.append(f'{p.relative_to(root)}: {e}')
for p in [root/'README.md', *root.glob('proyectos/*/README.md')]:
    text = p.read_text(encoding='utf-8-sig')
    for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)', text):
        if target.startswith(('http:', 'https:', 'mailto:', '#')):
            continue
        dest = (p.parent / unquote(target.split('#')[0])).resolve()
        if not dest.exists():
            errors.append(f'{p.relative_to(root)}: enlace inexistente {target}')
        checks += 1
for d in (root/'proyectos').iterdir():
    if d.is_dir() and not (d/'README.md').exists():
        errors.append(f'Falta README: {d.name}')
    checks += 1
result = {'checks': checks, 'errors': errors}
print(json.dumps(result, ensure_ascii=False, indent=2))
sys.exit(bool(errors))
