"""Use Codex only as an authenticated Sites tool host. No turn/start method.

This proof allows one inventory read, not registration, saving or publication.
An inert local provider records any unexpected model request.
"""
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading
import sys
from connection_transport import isolated_environment, ReadOnlyRpc

model_requests = 0
class NoInference(BaseHTTPRequestHandler):
    def log_message(self, *args): pass
    def do_GET(self):
        self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers()
        self.wfile.write(b'{"data":[]}')
    def do_POST(self):
        global model_requests
        model_requests += 1
        self.send_response(503); self.end_headers()

server = ThreadingHTTPServer(('127.0.0.1', 0), NoInference)
threading.Thread(target=server.serve_forever, daemon=True).start()
binary = shutil.which('codex')
assert binary
config = {
    'model_provider': 'galx_tools_only', 'model': 'unused-no-inference',
    'model_providers.galx_tools_only.name': 'No model execution permitted',
    'model_providers.galx_tools_only.base_url': f'http://127.0.0.1:{server.server_port}/v1',
    'model_providers.galx_tools_only.env_key': 'GALX_UNUSED_FIXTURE_KEY',
    'model_providers.galx_tools_only.requires_openai_auth': False,
    'model_providers.galx_tools_only.wire_api': 'responses',
    'features.hooks': False,
}
args = [binary]
for key, value in config.items(): args += ['-c', key + '=' + json.dumps(value)]
args += ['app-server', '--stdio']
proc = subprocess.Popen(args, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                        stderr=subprocess.DEVNULL, bufsize=0,
                        env=isolated_environment(os.environ))
rpc = ReadOnlyRpc(proc)
request = rpc.request
send = rpc.send

report = {'connected': False, 'model_turns_started': 0, 'site_mutations': False, 'site_metadata_retained': False}
try:
    init = request('initialize', {'clientInfo': {'name': 'galx_sites_workflow_probe', 'version': '1.0.0'},
                                 'capabilities': {'experimentalApi': True}})
    report['user_agent'] = init.get('userAgent')
    send({'method': 'initialized'})
    with tempfile.TemporaryDirectory(prefix='galx-sites-tool-host-') as cwd:
        skills = request('skills/list', {'cwds': [cwd], 'forceReload': True})
        selected = [s for group in skills.get('data', []) for s in group.get('skills', [])
                    if s.get('name') in ('sites:sites-building', 'sites:sites-hosting') and s.get('enabled')]
        assert len(selected) == 2, 'sites_skills_unavailable'
        hosting = next(s for s in selected if s['name'] == 'sites:sites-hosting')
        root = Path(hosting['path']).resolve().parents[2]
        manifest = json.loads((root/'.codex-plugin/plugin.json').read_text())
        assert manifest['name'] == 'sites'
        contract = json.loads((Path(__file__).resolve().parent / 'connection-contract.json').read_text())
        report['compatibility'] = 'checking'
        if manifest['version'] != contract['plugin_version'] or any(
                hashlib.sha256((root / name).read_bytes()).hexdigest() != expected
                for name, expected in contract['file_sha256'].items()):
            report['compatibility'] = 'plugin_contract_changed'
            raise RuntimeError('plugin_contract_changed')
        for skill in selected:
            relative = str(Path(skill['path']).resolve().relative_to(root))
            assert relative in contract['file_sha256']
        report['compatibility'] = 'reviewed_contract_matched'
        report['plugin_root'] = str(root)
        report['plugin_version'] = manifest['version']
        report['skill_sha256'] = {s['name']: hashlib.sha256(Path(s['path']).read_bytes()).hexdigest() for s in selected}
        thread = request('thread/start', {'cwd': cwd, 'ephemeral': True, 'sandbox': 'read-only'})
        thread_id = thread['thread']['id']
        tools = []
        cursor = None
        seen_cursors = set()
        for page in range(8):
            runtime = request('mcpServerStatus/list', {'threadId': thread_id, 'detail': 'toolsAndAuthOnly',
                              **({'cursor': cursor} if cursor else {})})
            tools = [s['tools']['sites.list_sites'] for s in runtime.get('data', [])
                     if s.get('name') == 'codex_apps' and 'sites.list_sites' in s.get('tools', {})]
            if tools or not runtime.get('nextCursor'):
                break
            cursor = runtime['nextCursor']
            assert isinstance(cursor, str) and cursor not in seen_cursors and len(cursor) <= 4096
            seen_cursors.add(cursor)
        assert tools and tools[0].get('annotations', {}).get('readOnlyHint'), 'sites_tool_unavailable'
        result = request('mcpServer/tool/call', {'threadId': thread_id, 'server': 'codex_apps',
                         'tool': 'sites.list_sites', 'arguments': {'limit': 1, 'role': 'owner'}})
        def has_error(value):
            if isinstance(value, list): return any(has_error(v) for v in value)
            if isinstance(value, dict):
                if value.get('isError') is True or value.get('error'): return True
                for key, item in value.items():
                    if key == 'text' and isinstance(item, str):
                        try:
                            if has_error(json.loads(item)): return True
                        except json.JSONDecodeError: pass
                    elif isinstance(item, (dict, list)) and has_error(item): return True
            return False
        assert not has_error(result), 'sites_read_failed'
        report['connected'] = True
        report['read_is_error'] = result.get('isError')
except Exception as error:
    report['error_type'] = type(error).__name__
    allowed_errors = {'rpc_frame_too_large', 'rpc_frame_invalid', 'rpc_id_invalid', 'rpc_response_invalid',
                      'rpc_output_budget_exhausted', 'rpc_stream_invalid', 'rpc_closed', 'rpc_failed',
                      'rpc_result_invalid', 'rpc_timeout', 'plugin_contract_changed'}
    report['error_code'] = str(error) if str(error) in allowed_errors else 'connection_check_failed'
finally:
    proc.terminate()
    try: proc.wait(timeout=10)
    except subprocess.TimeoutExpired: proc.kill(); proc.wait()
    server.shutdown(); server.server_close()
    report['unexpected_model_requests'] = model_requests
    report['rpc_methods'] = rpc.methods
    report['transport'] = {'largest_frame_bytes': rpc.largest_frame, 'total_bytes': rpc.total_bytes, 'failure': rpc.failure}
    report['environment_policy'] = 'allowlisted; application/model credentials not inherited'
    print(json.dumps(report))

if not report['connected'] or model_requests:
    sys.exit(1)
