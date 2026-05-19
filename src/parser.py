import json
from pathlib import Path


def parse(file_path):
    p = Path(file_path)
    try:
        raw = p.read_text(encoding='utf-8')
    except OSError as e:
        raise ValueError(f'Cannot read input file "{file_path}": {e}')

    try:
        spec = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f'Invalid JSON in "{file_path}": {e}')

    if not isinstance(spec.get('openapi'), str) or not spec['openapi'].startswith('3.'):
        raise ValueError('Input must be an OpenAPI 3.x spec (openapi field must start with "3.")')
    if not isinstance(spec.get('info'), dict):
        raise ValueError('Spec missing required "info" field')
    if not isinstance(spec.get('paths'), dict):
        raise ValueError('Spec missing required "paths" field')

    return spec
