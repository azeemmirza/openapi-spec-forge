from pathlib import Path
from .parser import parse
from .resolver import resolve
from .grouper import group
from .renderer import render


def build(options):
    spec = parse(str(Path(options['input']).resolve()))
    resolved = resolve(spec)
    groups = group(resolved)

    endpoint_count = sum(
        len(g['endpoints']) + sum(len(sg['endpoints']) for sg in g['subGroups'])
        for g in groups
    )

    assets = render(resolved, groups, options)

    return {
        'output': str(Path(options['output']).resolve()),
        'assets': assets,
        'groupCount': len(groups),
        'endpointCount': endpoint_count,
    }
