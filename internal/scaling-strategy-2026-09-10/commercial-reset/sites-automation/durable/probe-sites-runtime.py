"""Read-only surface qualification. Skill discovery and callable tools are
separate observations. No model turn, installation, or access-policy change."""
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from connection_transport import ReadOnlyRpc, isolated_environment

def main():
    binary = os.environ.get('GALX_CODEX_BINARY') or shutil.which('codex')
    config = {'model_provider': 'galx_tools_only', 'model': 'unused-no-inference',
              'model_providers.galx_tools_only.name': 'No inference',
              'model_providers.galx_tools_only.base_url': 'http://127.0.0.1:1/v1',
              'model_providers.galx_tools_only.env_key': 'GALX_UNUSED_FIXTURE_KEY',
              'model_providers.galx_tools_only.requires_openai_auth': False,
              'model_providers.galx_tools_only.wire_api': 'responses', 'features.hooks': False}
    args = [binary]
    for key, value in config.items(): args += ['-c', key+'='+json.dumps(value)]
    args += ['app-server', '--stdio']
    report = {'model_turns_started': 0, 'mutations': 0, 'connected': False}
    with tempfile.TemporaryDirectory(prefix='galx-sites-surface-') as cwd:
        proc = subprocess.Popen(args, cwd=cwd, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                stderr=subprocess.DEVNULL, bufsize=0, env=isolated_environment(os.environ), start_new_session=True)
        rpc = ReadOnlyRpc(proc, request_seconds=35, total_seconds=55)
        try:
            rpc.request('initialize', {'clientInfo': {'name': 'galx_sites_surface_probe', 'version': '1.0.0'}, 'capabilities': {'experimentalApi': True}})
            rpc.send({'method': 'initialized'})
            skills = rpc.request('skills/list', {'cwds': [cwd], 'forceReload': True})
            report['listed_sites_skills'] = [s['name'] for group in skills.get('data', []) for s in group.get('skills', []) if s.get('name', '').startswith('sites:') and s.get('enabled')]
            thread = rpc.request('thread/start', {'cwd': cwd, 'ephemeral': True, 'sandbox': 'read-only'})
            cursor = None; names = []
            for _ in range(8):
                runtime = rpc.request('mcpServerStatus/list', {'threadId': thread['thread']['id'], 'detail': 'toolsAndAuthOnly', **({'cursor': cursor} if cursor else {})})
                names += [name for server in runtime.get('data', []) if server.get('name') == 'codex_apps' for name in server.get('tools', {}) if name.startswith('sites.')]
                for server in runtime.get('data', []):
                    if server.get('name') == 'codex_apps' and 'sites.save_site_version' in server.get('tools', {}):
                        report['save_tool_schema'] = server['tools']['sites.save_site_version'].get('inputSchema')
                        report['save_tool_metadata'] = {k:v for k,v in server['tools']['sites.save_site_version'].items() if k not in ('inputSchema','description','name')}
                cursor = runtime.get('nextCursor')
                if not cursor: break
            report['callable_sites_tools'] = names
            if 'sites.list_sites' in names:
                result = rpc.request('mcpServer/tool/call', {'threadId': thread['thread']['id'], 'server': 'codex_apps',
                                     'tool': 'sites.list_sites', 'arguments': {'limit': 1, 'role': 'owner'}})
                import importlib.util
                spec = importlib.util.spec_from_file_location('sites_rpc', Path(__file__).with_name('sites-rpc.py'))
                module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
                value = module.unwrap(result)
                report['connected'] = isinstance(value.get('items'), list)
        except Exception:
            report['failure'] = 'native_connection_unavailable'
        finally:
            report['methods'] = rpc.methods
            try: os.killpg(proc.pid, signal.SIGTERM)
            except ProcessLookupError: pass
            try: proc.wait(timeout=2)
            except subprocess.TimeoutExpired:
                os.killpg(proc.pid, signal.SIGKILL); proc.wait()
    print(json.dumps(report))

if __name__ == '__main__': main()
