"""Exercise installed Codex against the local relay fixture, never a live model.

The provider URL must be loopback and the key is synthetic. Existing ChatGPT
authentication is used only by Codex's own Sites connector. No auth file is read
by this script. The only permitted connector call lists at most one owned Site.
"""
import json
import os
from pathlib import Path
import queue
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from urllib.parse import urlparse

base = sys.argv[1]
assert urlparse(base).hostname == '127.0.0.1' and urlparse(base).scheme == 'http'
binary = shutil.which('codex')
assert binary, 'Codex is not on PATH'
env = dict(os.environ, GALX_SITES_FIXTURE_KEY='sites-fixture-client')
config = {
    'model_provider': 'galx_sites_probe',
    'model': 'relay-sites-probe',
    'model_providers.galx_sites_probe.name': 'Local GALX compatibility fixture',
    'model_providers.galx_sites_probe.base_url': base + '/v1',
    'model_providers.galx_sites_probe.env_key': 'GALX_SITES_FIXTURE_KEY',
    'model_providers.galx_sites_probe.requires_openai_auth': False,
    'model_providers.galx_sites_probe.wire_api': 'responses',
    'model_providers.galx_sites_probe.supports_websockets': False,
    'model_providers.galx_sites_probe.request_max_retries': 0,
    'model_providers.galx_sites_probe.stream_max_retries': 0,
    'features.hooks': False,
    'features.unbounded_connection_retries': False,
}
args = [binary]
for key, value in config.items():
    args += ['-c', key + '=' + json.dumps(value)]
args += ['app-server', '--stdio']
proc = subprocess.Popen(args, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                        stderr=subprocess.DEVNULL, text=True, env=env, bufsize=1)
messages = queue.Queue()
events = []
sequence = 0

def reader():
    for line in proc.stdout:
        try:
            messages.put(json.loads(line))
        except json.JSONDecodeError:
            pass
    messages.put({'closed': True})

threading.Thread(target=reader, daemon=True).start()

def send(message):
    proc.stdin.write(json.dumps(message) + '\n')
    proc.stdin.flush()

def receive(deadline):
    item = messages.get(timeout=max(0.1, deadline - time.monotonic()))
    if item.get('closed'):
        raise RuntimeError('app-server closed unexpectedly')
    if 'id' in item and 'method' in item:
        send({'id': item['id'], 'error': {'code': -32601, 'message': 'Diagnostic does not grant approvals'}})
    return item

def request(method, params):
    global sequence
    assert method in {'initialize', 'skills/list', 'thread/start', 'app/installed',
                      'mcpServerStatus/list', 'mcpServer/tool/call', 'turn/start'}
    if method == 'mcpServer/tool/call':
        assert params['server'] == 'codex_apps' and params['tool'] == 'sites.list_sites'
        assert params['arguments'] == {'limit': 1, 'role': 'owner'}
    sequence += 1
    send({'id': sequence, 'method': method, 'params': params})
    deadline = time.monotonic() + 55
    while time.monotonic() < deadline:
        item = receive(deadline)
        if item.get('id') == sequence and 'method' not in item:
            return item
        if 'method' in item:
            events.append(item)
    raise TimeoutError(method)

def result(response):
    if 'error' in response:
        raise RuntimeError('RPC error code ' + str(response['error'].get('code')))
    return response.get('result', {})

report = {'provider': 'galx_sites_probe', 'provider_transport': 'loopback HTTP fixture',
          'provider_key': 'synthetic', 'live_model_requested': False,
          'site_mutations': False, 'credentials_copied': False, 'global_config_changed': False}
try:
    initialized = result(request('initialize', {'clientInfo': {'name': 'galx_relay_compatibility_probe',
                                 'version': '1.0.0'}, 'capabilities': {'experimentalApi': True}}))
    report['user_agent'] = initialized.get('userAgent')
    send({'method': 'initialized'})
    with tempfile.TemporaryDirectory(prefix='galx-sites-empty-workspace-') as cwd:
        skills = result(request('skills/list', {'cwds': [cwd], 'forceReload': True}))
        report['sites_skills'] = [{'name': s['name'], 'enabled': s.get('enabled')}
            for group in skills.get('data', []) for s in group.get('skills', [])
            if 'sites' in s.get('name', '')]
        started = result(request('thread/start', {'cwd': cwd, 'ephemeral': True, 'sandbox': 'read-only'}))
        thread_id = started['thread']['id']
        report['selected_provider'] = started.get('modelProvider')
        report['selected_model'] = started.get('model')
        apps = result(request('app/installed', {'threadId': thread_id, 'forceRefresh': True}))
        report['sites_runtime'] = [{key: app.get(key) for key in ('runtimeName', 'enabled', 'callable')}
             for app in apps.get('apps', []) if app.get('runtimeName') == 'Sites']
        status = result(request('mcpServerStatus/list', {'threadId': thread_id, 'detail': 'toolsAndAuthOnly'}))
        tools = [server['tools']['sites.list_sites'] for server in status.get('data', [])
                 if server.get('name') == 'codex_apps' and 'sites.list_sites' in server.get('tools', {})]
        report['sites_tool_present'] = bool(tools)
        if tools and tools[0].get('annotations', {}).get('readOnlyHint'):
            read = request('mcpServer/tool/call', {'threadId': thread_id, 'server': 'codex_apps',
                           'tool': 'sites.list_sites', 'arguments': {'limit': 1, 'role': 'owner'}})
            report['sites_read'] = {'rpc_success': 'error' not in read,
                                   'isError': read.get('result', {}).get('isError'),
                                   'metadata_retained': False}
        # This fixture deliberately has no Responses route. Codex cannot reach
        # any model or execute generated actions; the expected outcome is 404.
        turn = request('turn/start', {'threadId': thread_id, 'input': [{'type': 'text',
              'text': 'Protocol compatibility probe. Reply OK. Do not use tools or create or deploy any site.'}]})
        report['turn_start_rpc_success'] = 'error' not in turn
        deadline = time.monotonic() + 55
        completed = None
        while time.monotonic() < deadline:
            for item in events:
                if item.get('method') == 'turn/completed':
                    completed = item['params']['turn']
            events.clear()
            if completed:
                break
            events.append(receive(deadline))
        if not completed:
            raise TimeoutError('No terminal turn state')
        error = completed.get('error') or {}
        report['turn_status'] = completed.get('status')
        report['turn_error_mentions_404'] = '404' in json.dumps(error)
        report['turn_error_type'] = error.get('codexErrorInfo')
except Exception as error:
    report['probe_error_type'] = type(error).__name__
finally:
    proc.terminate()
    try:
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait()
    print(json.dumps(report, indent=2))
