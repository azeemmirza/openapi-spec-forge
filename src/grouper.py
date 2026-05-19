import re

HTTP_METHODS = {'get', 'post', 'put', 'patch', 'delete', 'head', 'options'}


def _is_path_param(segment):
    return segment.startswith('{') and segment.endswith('}')


def _slug_to_title(slug):
    s = re.sub(r'-([a-z])', lambda m: ' ' + m.group(1).upper(), slug)
    return s[0].upper() + s[1:] if s else s


def group(spec):
    group_map = {}

    for path_str, path_item in (spec.get('paths') or {}).items():
        if not isinstance(path_item, dict):
            continue
        parts = [p for p in path_str.split('/') if p]
        if not parts:
            continue

        group_name = parts[0]
        sub_name = parts[1] if len(parts) > 1 and not _is_path_param(parts[1]) else None

        if group_name not in group_map:
            group_map[group_name] = {
                'name': group_name,
                'title': _slug_to_title(group_name),
                'endpoints': [],
                'subGroups': {},
            }

        grp = group_map[group_name]

        for method, operation in path_item.items():
            if method not in HTTP_METHODS:
                continue
            if not isinstance(operation, dict):
                continue

            endpoint = {
                'method': method,
                'path': path_str,
                'summary': operation.get('summary', ''),
                'description': operation.get('description', ''),
                'parameters': operation.get('parameters', []),
                'requestBody': operation.get('requestBody'),
                'responses': operation.get('responses', {}),
                'tags': operation.get('tags', []),
                'operationId': operation.get('operationId'),
            }

            if sub_name:
                if sub_name not in grp['subGroups']:
                    grp['subGroups'][sub_name] = {
                        'name': sub_name,
                        'title': _slug_to_title(sub_name),
                        'endpoints': [],
                    }
                grp['subGroups'][sub_name]['endpoints'].append(endpoint)
            else:
                grp['endpoints'].append(endpoint)

    result = []
    for grp in group_map.values():
        result.append({
            'name': grp['name'],
            'title': grp['title'],
            'endpoints': grp['endpoints'],
            'subGroups': list(grp['subGroups'].values()),
        })
    return result
