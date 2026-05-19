import json
import html as html_mod
from pathlib import Path

TMPL = Path(__file__).parent.parent / 'template'


def _read(name):
    return (TMPL / name).read_text(encoding='utf-8')


def render(spec, groups, options):
    output = options['output']
    title = options.get('title') or (spec.get('info') or {}).get('title') or 'API Documentation'
    base_url = options.get('baseUrl')
    embed_data = options.get('embedData', True)
    inline_js = options.get('inlineJs', True)

    out_path = Path(output).resolve()
    out_dir = out_path.parent
    out_base = out_path.stem
    assets = []

    payload = {
        'info': spec.get('info'),
        'servers': [{'url': base_url}] if base_url else spec.get('servers', []),
        'groups': groups,
    }

    if embed_data:
        data_block = f'<script>window.__SPEC__={json.dumps(payload)};</script>'
    else:
        data_file = out_dir / f'{out_base}.data.json'
        data_file.write_text(json.dumps(payload), encoding='utf-8')
        assets.append(str(data_file))
        data_block = f"<script>window.__SPEC_DATA_URL__='{out_base}.data.json';</script>"

    css = _read('style.css')
    if inline_js:
        style_block = f'<style>\n{css}\n</style>'
    else:
        css_file = out_dir / f'{out_base}.css'
        css_file.write_text(css, encoding='utf-8')
        assets.append(str(css_file))
        style_block = f'<link rel="stylesheet" href="{html_mod.escape(out_base + ".css")}">'

    js = _read('app.js')
    if inline_js:
        script_block = f'<script>\n{js}\n</script>'
    else:
        js_file = out_dir / f'{out_base}.js'
        js_file.write_text(js, encoding='utf-8')
        assets.append(str(js_file))
        script_block = f'<script src="{html_mod.escape(out_base + ".js")}"></script>'

    page = _read('index.html')
    page = page.replace('{{TITLE}}', html_mod.escape(title))
    page = page.replace('{{STYLE_BLOCK}}', style_block)
    page = page.replace('{{DATA_BLOCK}}', data_block)
    page = page.replace('{{SCRIPT_BLOCK}}', script_block)

    out_path.write_text(page, encoding='utf-8')
    return assets
