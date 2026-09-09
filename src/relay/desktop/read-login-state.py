import json, pathlib, sys
sys.path.insert(0, '/opt/galx-desktop')
from credential_files import read_private
from device_login import process_start

try:
    raw, _ = read_private(pathlib.Path('/home/operator'), '.config/galx-relay/login-state.json')
    state = json.loads(raw)
    if state.get('state') in ('starting', 'waiting'):
        try:
            if type(state.get('pid')) is not int or state['pid'] <= 1 or process_start(state['pid']) != state['started']:
                raise ValueError('Login ended')
        except (OSError, ValueError, KeyError):
            state['state'] = 'expired'; state.pop('userCode', None)
    print(json.dumps({key: state[key] for key in ('state', 'updatedAt', 'expiresAt', 'userCode') if key in state}))
except FileNotFoundError: print('null')
except (OSError, ValueError, AttributeError): print('{"state":"unavailable"}')
