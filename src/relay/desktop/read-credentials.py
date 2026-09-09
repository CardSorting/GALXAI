"""Only the explicitly selected guest login and manual setup enter the host pipe."""
import json, pathlib, sys
sys.path.insert(0, '/opt/galx-desktop')
from credential_files import read_private, selected_home

def credentials(root):
    files = []
    try: codex_home = selected_home(root)
    except (OSError, ValueError, UnicodeError):
        return [{'source': 'codex', 'modifiedAt': 9007199254740991, 'data': None}]
    for source, relative in [('codex', codex_home + '/auth.json'), ('manual', '.config/galx-relay/config.json')]:
        modified_at = 9007199254740991
        try:
            raw, modified_at = read_private(root, relative)
            files.append({'source': source, 'modifiedAt': modified_at, 'data': json.loads(raw)})
        except FileNotFoundError:
            if source == 'codex' and codex_home != '.codex':
                files.append({'source': source, 'modifiedAt': modified_at, 'data': None})
        except (OSError, ValueError, UnicodeError):
            files.append({'source': source, 'modifiedAt': modified_at, 'data': None})
    return files

if __name__ == '__main__': print(json.dumps(credentials(pathlib.Path('/home/operator'))))
