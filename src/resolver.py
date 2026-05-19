MAX_DEPTH = 8


def _get_by_pointer(root, pointer):
    parts = [p.replace('~1', '/').replace('~0', '~') for p in pointer.split('/')]
    node = root
    for part in parts:
        if not isinstance(node, dict):
            return None
        node = node.get(part)
    return node


def _resolve_node(node, root, visited, depth):
    if depth > MAX_DEPTH:
        return node
    if node is None or not isinstance(node, (dict, list)):
        return node

    if isinstance(node, list):
        return [_resolve_node(item, root, visited, depth) for item in node]

    ref = node.get('$ref')
    if isinstance(ref, str):
        if not ref.startswith('#/'):
            return node
        if ref in visited:
            return {'type': 'object', 'description': f'[Circular: {ref}]'}

        pointer = ref[2:]
        target = _get_by_pointer(root, pointer)
        if target is None:
            return node

        visited.add(ref)
        resolved = _resolve_node(target, root, visited, depth + 1)
        visited.discard(ref)
        return resolved

    return {k: _resolve_node(v, root, visited, depth + 1) for k, v in node.items()}


def resolve(spec):
    return _resolve_node(spec, spec, set(), 0)
