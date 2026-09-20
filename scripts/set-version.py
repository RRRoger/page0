"""Stamp a release number into the page and local asset URLs."""
from pathlib import Path
import re
import sys

number = int(sys.argv[1])
if number < 1:
    raise SystemExit('Release number must be positive')
version = f'0.0.{number}'
root = Path(__file__).resolve().parent.parent
page = root / 'index.html'
html = page.read_text()
html, count = re.subn(r'(<span id="appVersion"[^>]*>)[^<]*(</span>)', rf'\g<1>{version}\2', html)
if count != 1:
    raise SystemExit('Expected one version badge')
html = re.sub(r'((?:src|href)="\./assets/[^"?]+)(?:\?v=[^"]+)?"', rf'\1?v={version}"', html)
page.write_text(html)
(root / 'version.json').write_text('{"version": "' + version + '"}\n')
print(version)
