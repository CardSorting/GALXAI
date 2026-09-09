"""Run the official device flow; publish only an allowlisted user-facing challenge."""
import json, os, pathlib, re, selectors, signal, subprocess, sys, time
from credential_files import read_private, save_private

DEVICE_URL = 'https://auth.openai.com/codex/device'
CODE = re.compile(r'(?<![A-Z0-9])([A-Z0-9]{4}-[A-Z0-9]{4,5})(?![A-Z0-9])')
ANSI = re.compile(r'\x1b\[[0-?]*[ -/]*[@-~]')

def process_start(pid):
    return (pathlib.Path('/proc') / str(pid) / 'stat').read_text().split(') ', 1)[1].split()[19]

def run_device(root, env):
    state_file = root / 'login-state.json'
    now = int(time.time() * 1000); deadline = time.monotonic() + 900
    state = {'state': 'starting', 'updatedAt': now, 'expiresAt': now + 900000,
             'pid': os.getpid(), 'started': process_start(os.getpid())}
    save_private(state_file, state)
    child = None
    def cancelled(_signum, _frame): raise KeyboardInterrupt()
    previous = signal.signal(signal.SIGTERM, cancelled)
    try:
        child = subprocess.Popen(['codex', '-c', 'cli_auth_credentials_store="file"', 'login', '--device-auth'],
            env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, start_new_session=True)
        selector = selectors.DefaultSelector(); selector.register(child.stdout, selectors.EVENT_READ)
        output = ''; published = False
        while child.poll() is None or selector.get_map():
            if time.monotonic() >= deadline: raise TimeoutError()
            for key, _ in selector.select(.25):
                chunk = os.read(key.fd, 4096)
                if not chunk: selector.unregister(key.fileobj); continue
                sys.stdout.write(chunk.decode('utf8', errors='replace')); sys.stdout.flush()
                output = (output + chunk.decode('utf8', errors='replace'))[-16384:]
                clean = ANSI.sub('', output); match = CODE.search(clean)
                if not published and DEVICE_URL in clean and match:
                    state.update(state='waiting', userCode=match[1]); save_private(state_file, state); published = True
        selector.close()
        state['state'] = 'saved' if child.returncode == 0 else 'failed'
        if child.returncode == 0: save_private(root / 'credential-source.json', {'codexHome': '.codex'})
        return child.returncode == 0
    except KeyboardInterrupt: state['state'] = 'cancelled'; return False
    except TimeoutError: state['state'] = 'expired'; return False
    except (OSError, ValueError): state['state'] = 'failed'; return False
    finally:
        if child and child.poll() is None:
            os.killpg(child.pid, signal.SIGTERM)
            try: child.wait(timeout=3)
            except subprocess.TimeoutExpired: os.killpg(child.pid, signal.SIGKILL); child.wait()
        state.pop('userCode', None); state['updatedAt'] = int(time.time() * 1000)
        save_private(state_file, state); signal.signal(signal.SIGTERM, previous)

def cancel_device(root):
    try:
        raw, _ = read_private(root.parent.parent, '.config/galx-relay/login-state.json')
        state = json.loads(raw); pid = state['pid']
        if state['state'] not in ('starting', 'waiting') or type(pid) is not int or pid <= 1: return
        if process_start(pid) != state['started']: return
        command = (pathlib.Path('/proc') / str(pid) / 'cmdline').read_bytes().split(b'\0')
        if b'/opt/galx-desktop/galx-relay' not in command or b'login-device' not in command: return
        os.kill(pid, signal.SIGTERM)
    except (OSError, ValueError, KeyError): pass
