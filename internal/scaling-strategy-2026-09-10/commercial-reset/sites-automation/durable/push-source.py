"""Push a dedicated static Site checkout. Credentials remain in child-process
environment memory, never command arguments, Git configuration files or output.
This operation does not generate content, save a version or publish on push.
"""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import termios
from urllib.parse import urlsplit

spec = importlib.util.spec_from_file_location('sites_rpc', Path(__file__).with_name('sites-rpc.py'))
rpc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rpc)
phase = 'validation'

def git(root, args, env):
    result = subprocess.run(['git', '-c', 'core.hooksPath=/dev/null', '-c', 'core.attributesFile=/dev/null',
        '-c', 'credential.helper=', *args], cwd=root, env=env, capture_output=True, timeout=60)
    if result.returncode:
        raise RuntimeError('source_operation_failed')
    return result.stdout.decode().strip()

def validate(root):
    if root.is_symlink() or not root.is_dir():
        raise RuntimeError('invalid_source')
    expected = {'.openai/hosting.json', 'dist/index.html'}
    actual = set()
    for path in root.rglob('*'):
        relative = path.relative_to(root)
        if relative.parts[0] == '.git':
            continue
        if path.is_symlink():
            raise RuntimeError('invalid_source')
        if path.is_file():
            actual.add(str(relative))
    if actual != expected or (root/'dist/index.html').stat().st_size > 32000:
        raise RuntimeError('invalid_source')
    manifest = json.loads((root/'.openai/hosting.json').read_text())
    if set(manifest) != {'project_id', 'static'} or manifest['static'] != {'directory': 'dist'}:
        raise RuntimeError('invalid_source')
    return rpc.validate_command({'tool': 'sites.create_source_repository_write_credential',
                                'arguments': {'project_id': manifest['project_id']}})

def main():
    global phase
    root = Path(sys.argv[1]).absolute()
    command = validate(root)
    env = {k: v for k, v in os.environ.items() if k in ('PATH', 'TMPDIR', 'LANG', 'SYSTEMROOT')}
    env.update({'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_TERMINAL_PROMPT': '0'})
    # Never discover or mutate an enclosing repository.
    if not (root/'.git').exists():
        git(root, ['init', '--initial-branch=main'], env)
    if (root/'.git').is_symlink() or not (root/'.git').is_dir() or Path(git(root, ['rev-parse', '--show-toplevel'], env)).resolve() != root.resolve():
        raise RuntimeError('invalid_repository')
    git(root, ['add', '--', '.openai/hosting.json', 'dist/index.html'], env)
    if git(root, ['status', '--porcelain'], env):
        git(root, ['-c', 'user.name=GALX Site companion', '-c', 'user.email=sites@localhost', '-c', 'commit.gpgsign=false',
                   'commit', '-m', 'Prepare private delivery preview'], env)
    if git(root, ['ls-files'], env).splitlines() != ['.openai/hosting.json', 'dist/index.html']:
        raise RuntimeError('invalid_repository')
    phase = 'credential'
    if sys.argv[2:] == ['--credential-stdin']:
        # Hosted native tools may already hold the credential in session memory.
        # Never require it in argv, an environment file, or echoed terminal input.
        previous = termios.tcgetattr(sys.stdin.fileno()) if sys.stdin.isatty() else None
        try:
            if previous:
                muted = termios.tcgetattr(sys.stdin.fileno()); muted[3] &= ~termios.ECHO
                termios.tcsetattr(sys.stdin.fileno(), termios.TCSANOW, muted)
            print(json.dumps({'awaiting_credential': True}), flush=True)
            credential = json.loads(sys.stdin.buffer.readline(32769))
        finally:
            if previous:
                termios.tcsetattr(sys.stdin.fileno(), termios.TCSANOW, previous)
    elif len(sys.argv) == 2:
        credential = rpc.invoke(command)
    else:
        raise RuntimeError('invalid_command')
    remote = urlsplit(credential['remote_url'])
    branch, token = credential['branch'], credential['token']
    if credential.get('auth_mode') != 'http_extra_header' or remote.scheme != 'https' or remote.username or remote.password or remote.query or remote.fragment or not remote.hostname or any(c in token for c in '\r\n'):
        raise RuntimeError('invalid_credential')
    git(root, ['check-ref-format', 'refs/heads/'+branch], env)
    env.update({'GIT_CONFIG_COUNT': '2', 'GIT_CONFIG_KEY_0': 'http.extraHeader',
                'GIT_CONFIG_VALUE_0': 'Authorization: Bearer '+token,
                'GIT_CONFIG_KEY_1': 'http.followRedirects', 'GIT_CONFIG_VALUE_1': 'false'})
    phase = 'push'
    git(root, ['push', '--', credential['remote_url'], 'HEAD:refs/heads/'+branch], env)
    env.pop('GIT_CONFIG_VALUE_0')
    env.pop('GIT_CONFIG_COUNT')
    print(json.dumps({'project_id': command['arguments']['project_id'], 'commit_sha': git(root, ['rev-parse', '--verify', 'HEAD'], env), 'pushed': True}))

if __name__ == '__main__':
    try:
        main()
    except Exception:
        print(json.dumps({'error': 'source_push_failed', 'phase': phase}))
        sys.exit(1)
