"""Single explicitly scoped native Sites call; never a Codex model turn.

This is a private companion transport, not a generic MCP proxy. Runtime approval
requests are denied, never silently approved. Caller receives sanitized errors.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import shutil
import signal
import sys
import tempfile
import re

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from connection_transport import ReadOnlyRpc, isolated_environment

FIELDS = {
    'sites.list_sites': {'limit', 'role'},
    'sites.get_site': {'project_id'},
    'sites.get_site_version': {'project_id', 'version_id'},
    'sites.get_deployment_status': {'project_id', 'deployment_id'},
    'sites.deploy_private_site_version': {'project_id', 'version_id'},
    'sites.create_source_repository_write_credential': {'project_id'},
    'sites.save_site_version': {'project_id', 'commit_sha', 'archive'},
}

def validate_command(command):
    if not isinstance(command, dict) or set(command) != {'tool', 'arguments'}:
        raise RuntimeError('invalid_command')
    tool, args = command['tool'], command['arguments']
    if tool not in FIELDS or not isinstance(args, dict) or set(args) != FIELDS[tool]:
        raise RuntimeError('invalid_command')
    if tool == 'sites.list_sites':
        if args != {'limit': 1, 'role': 'owner'}:
            raise RuntimeError('invalid_command')
    elif tool == 'sites.save_site_version':
        import re
        if not isinstance(args['project_id'], str) or not re.fullmatch(r'[a-zA-Z0-9_.:~-]{1,120}', args['project_id']) or not isinstance(args['commit_sha'], str) or not re.fullmatch(r'[a-f0-9]{40}', args['commit_sha']):
            raise RuntimeError('invalid_command')
        p = args['archive']
        if not isinstance(p, str) or len(p) > 4096 or any(ord(c) < 32 for c in p) or not Path(p).is_absolute() or Path(p).is_symlink() or not Path(p).is_file() or Path(p).stat().st_size > 128000:
            raise RuntimeError('invalid_command')
    elif any(not isinstance(v, str) or not 1 <= len(v) <= 120 or any(ord(c) < 32 for c in v) for v in args.values()):
        raise RuntimeError('invalid_command')
    return command

class ScopedRpc(ReadOnlyRpc):
    def __init__(self, process, command):
        self.command = validate_command(command)
        self.called = False
        super().__init__(process, request_seconds=35, total_seconds=55)

    def authorize_tool(self, params):
        if self.called or params.get('server') != 'codex_apps' or params.get('tool') != self.command['tool'] or params.get('arguments') != wire_arguments(self.command):
            raise RuntimeError('rpc_tool_not_allowed')
        self.called = True

def wire_arguments(command):
    # Preserve the discovered local-path contract. A URI is not an uploaded
    # file object and cannot repair an app-server argument conversion failure.
    return dict(command['arguments'])

class SitesCallError(RuntimeError):
    def __init__(self, value):
        super().__init__('sites_call_failed')
        # Fixed vocabulary only: no paths, URLs, credentials, IDs or raw errors.
        encoded = json.dumps(value, separators=(',', ':'))[:32768].lower()
        vocabulary = ('archive', 'upload', 'file', 'local', 'path', 'permission', 'approval', 'denied',
                      'invalid', 'unsupported', 'not found', 'uri', 'url', 'base64', 'sediment', 'required', 'missing')
        self.diagnostic = {'kind': 'tool_error', 'keywords': [word for word in vocabulary if word in encoded],
                           'statuses': sorted(set(re.findall(r'\b(?:400|401|403|404|409|413|422|429|500|502|503)\b', encoded)))}
        types = sorted(set(re.findall(r"expected type \['(object|string|array)'\]", encoded)))
        if types:
            self.diagnostic['expectedTypes'] = types
            if 'archive' in encoded:
                self.diagnostic['category'] = 'archive_argument_type_mismatch'
        for phrase, category in (
                ('chatgpt auth is required to upload files for codex apps tools', 'upload_chatgpt_auth_required'),
                ('no primary turn environment is available', 'upload_environment_unavailable'),
                ('selected executor does not support sandboxed file streaming', 'upload_streaming_unavailable')):
            if phrase in encoded:
                self.diagnostic['category'] = category
                break

def unwrap(result):
    # Different app-server versions wrap native structured results differently.
    # Only these reviewed wrappers are accepted; arbitrary recursive JSON is not.
    for _ in range(4):
        if not isinstance(result, dict) or result.get('isError') is True or result.get('error'):
            raise SitesCallError(result)
        if isinstance(result.get('structuredContent'), dict):
            result = result['structuredContent']
        elif isinstance(result.get('result'), dict):
            result = result['result']
        elif isinstance(result.get('content'), list):
            parts = [x['text'] for x in result['content'] if isinstance(x, dict) and x.get('type') == 'text' and isinstance(x.get('text'), str)]
            if len(parts) != 1:
                raise RuntimeError('sites_result_invalid')
            result = json.loads(parts[0])
        else:
            return result
    raise RuntimeError('sites_result_invalid')

def project(tool, value):
    if tool == 'sites.create_source_repository_write_credential':
        return {'credential_available': isinstance(value.get('token'), str) and bool(value['token'])}
    if tool == 'sites.list_sites':
        if not isinstance(value.get('items'), list):
            raise RuntimeError('sites_result_invalid')
        return {'owned_site_count_on_page': len(value['items']), 'has_more': bool(value.get('cursor'))}
    fields = ({'id', 'status', 'current_user_role', 'access_policy'} if tool == 'sites.get_site'
              else {'id', 'project_id', 'source', 'archive_storage', 'deployment_id'} if tool in ('sites.get_site_version', 'sites.save_site_version')
              else {'id', 'project_id', 'version_id', 'status', 'type', 'url'})
    output = {k: value[k] for k in fields if k in value}
    if isinstance(output.get('source'), dict):
        output['source'] = {k: output['source'][k] for k in ('commit_sha',) if k in output['source']}
    if isinstance(output.get('archive_storage'), dict):
        output['archive_storage'] = {k: output['archive_storage'][k] for k in
            ('archive_format', 'content_hash', 'size_bytes', 'file_count') if k in output['archive_storage']}
    if isinstance(output.get('access_policy'), dict):
        output['access_policy'] = {k: output['access_policy'][k] for k in
            ('project_id', 'access_mode', 'allowed_account_user_ids', 'allowed_workspace_group_ids',
             'allowed_tenant_group_ids', 'external_visitor_count', 'allowed_groups', 'allowed_users', 'allowed_editors')
            if k in output['access_policy']}
        # No names/email addresses leave the connector host.
        for key in ('allowed_users', 'allowed_editors'):
            if isinstance(output['access_policy'].get(key), list):
                output['access_policy'][key] = [{k: row.get(k) for k in ('account_user_id', 'role', 'is_external')} if isinstance(row, dict) else None
                    for row in output['access_policy'][key]]
        if isinstance(output['access_policy'].get('allowed_groups'), list):
            output['access_policy']['allowed_groups'] = [{'id': g.get('id')} if isinstance(g, dict) else None for g in output['access_policy']['allowed_groups']]
    return output

def reviewed_plugin(skills, home, contract=None, codex_home=None):
    """Local helpers are pinned separately from the authenticated tool surface.

    Some CLI releases expose native Sites tools without listing their skills.
    A cached helper alone never authorizes a call: runtime discovery below must
    also expose that exact tool for this authenticated thread.
    """
    contract = contract or json.loads((Path(__file__).resolve().parent.parent / 'connection-contract.json').read_text())
    selected = [s for group in skills.get('data', []) for s in group.get('skills', [])
                if s.get('name') == 'sites:sites-hosting' and s.get('enabled')]
    if len(selected) > 1:
        raise RuntimeError('plugin_contract_changed')
    root = (Path(selected[0]['path']).resolve().parents[2] if selected else
            (Path(codex_home) if codex_home else Path(home) / '.codex') / 'plugins/cache/openai-bundled/sites' / contract['plugin_version'])
    manifest = json.loads((root / '.codex-plugin/plugin.json').read_text())
    if manifest['name'] != 'sites' or manifest['version'] != contract['plugin_version'] or any(
            hashlib.sha256((root / name).read_bytes()).hexdigest() != expected
            for name, expected in contract['file_sha256'].items()):
        raise RuntimeError('plugin_contract_changed')
    return root

def require_runtime_tool(rpc, thread_id, tool):
    cursor = None
    seen = set()
    for _ in range(8):
        result = rpc.request('mcpServerStatus/list', {'threadId': thread_id, 'detail': 'toolsAndAuthOnly',
                             **({'cursor': cursor} if cursor else {})})
        if any(server.get('name') == 'codex_apps' and tool in server.get('tools', {}) for server in result.get('data', [])):
            return
        cursor = result.get('nextCursor')
        if not cursor or not isinstance(cursor, str) or cursor in seen:
            break
        seen.add(cursor)
    raise RuntimeError('sites_unavailable')

def invoke(command, diagnostics=None):
    def interrupted(signum, frame):
        raise InterruptedError('sites_interrupted')
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    command = validate_command(command)
    binary = os.environ.get('GALX_CODEX_BINARY') or shutil.which('codex') or ''
    if not Path(binary).is_absolute() or not Path(binary).is_file():
        raise RuntimeError('codex_unavailable')
    config = {'model_provider': 'galx_tools_only', 'model': 'unused-no-inference',
              'model_providers.galx_tools_only.name': 'No model execution permitted',
              'model_providers.galx_tools_only.base_url': 'http://127.0.0.1:1/v1',
              'model_providers.galx_tools_only.env_key': 'GALX_UNUSED_FIXTURE_KEY',
              'model_providers.galx_tools_only.requires_openai_auth': False,
              'model_providers.galx_tools_only.wire_api': 'responses', 'features.hooks': False}
    args = [binary]
    for key, value in config.items():
        args += ['-c', key + '=' + json.dumps(value)]
    args += ['app-server', '--stdio']
    with tempfile.TemporaryDirectory(prefix='galx-sites-call-') as cwd:
        proc = subprocess.Popen(args, cwd=cwd, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                stderr=subprocess.DEVNULL, bufsize=0, env=isolated_environment(os.environ), start_new_session=True)
        try:
            rpc = ScopedRpc(proc, command)
            rpc.request('initialize', {'clientInfo': {'name': 'galx_sites_companion', 'version': '1.0.0'},
                                      'capabilities': {'experimentalApi': True}})
            rpc.send({'method': 'initialized'})
            skills = rpc.request('skills/list', {'cwds': [cwd], 'forceReload': True})
            reviewed_plugin(skills, os.environ['HOME'], codex_home=os.environ.get('CODEX_HOME'))
            thread = rpc.request('thread/start', {'cwd': cwd, 'ephemeral': True, 'sandbox': 'read-only'})
            require_runtime_tool(rpc, thread['thread']['id'], command['tool'])
            result = rpc.request('mcpServer/tool/call', {'threadId': thread['thread']['id'], 'server': 'codex_apps',
                                 'tool': command['tool'], 'arguments': wire_arguments(command)})
            try:
                return unwrap(result)
            except SitesCallError as error:
                if diagnostics is not None:
                    diagnostics.update(error.diagnostic)
                raise
        finally:
            if diagnostics is not None and 'rpc' in locals():
                diagnostics['deniedRequests'] = rpc.denied_requests
            try:
                os.killpg(proc.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
            try:
                proc.wait(timeout=2)
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(proc.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                proc.wait()

def main():
    command = validate_command(json.loads(sys.stdin.buffer.read(8193)))
    print(json.dumps(project(command['tool'], invoke(command))))

if __name__ == '__main__':
    try:
        main()
    except Exception:
        print(json.dumps({'error': 'sites_connection_failed'}))
        sys.exit(1)
