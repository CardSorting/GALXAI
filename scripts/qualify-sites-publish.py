"""Explicit, synthetic owner-private update through the customer's native CLI.
No model turns, wallet writes, new Sites, audience changes or repeated mutations.
An interrupted mutation stays pending in an fsynced local journal.
"""
import hashlib
import importlib.util
import json
import os
import re
from pathlib import Path
import subprocess
import sys
import time

BASE = Path(__file__).resolve().parents[1] / 'internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable'
def module(name, file):
    spec = importlib.util.spec_from_file_location(name, BASE / file)
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result); return result
rpc = module('sites_rpc', 'sites-rpc.py')
archive_check = module('archive_check', 'archive-check.py')

def write(file, value):
    encoded = (json.dumps(value, indent=2)+'\n').encode()
    temporary = file.with_suffix('.tmp')
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(encoded); stream.flush(); os.fsync(stream.fileno())
        os.replace(temporary, file)
        directory = os.open(file.parent, os.O_RDONLY)
        try: os.fsync(directory)
        finally: os.close(directory)
    finally:
        if temporary.exists(): temporary.unlink()

def owner(project):
    site = rpc.invoke({'tool': 'sites.get_site', 'arguments': {'project_id': project}})
    p = site.get('access_policy', {})
    if not (site.get('id') == project and site.get('status') == 'active' and site.get('current_user_role') == 'owner'
            and p.get('project_id') == project and p.get('access_mode') == 'custom'
            and len(p.get('allowed_account_user_ids', [])) == 1 and p.get('external_visitor_count') == 0
            and p.get('allowed_workspace_group_ids') == [] and p.get('allowed_tenant_group_ids') == [] and p.get('allowed_groups') == []):
        raise RuntimeError('owner_private_required')
    return p['allowed_account_user_ids'][0]

def main():
    if len(sys.argv) != 4 or sys.argv[1] != '--live-private-update':
        raise RuntimeError('explicit_flag_required')
    root, archive = Path(sys.argv[2]).resolve(), Path(sys.argv[3]).resolve()
    command = module('push_source', 'push-source.py').validate(root)
    project = command['arguments']['project_id']
    manifest = json.loads((root/'.openai/hosting.json').read_text())
    html = (root/'dist/index.html').read_bytes()
    archive.write_bytes(archive_check.normalize(archive.read_bytes(), html, manifest))
    package = archive_check.check(archive.read_bytes(), html, manifest)
    commit = subprocess.check_output(['git', 'rev-parse', '--verify', 'HEAD'], cwd=root, text=True).strip()
    if subprocess.check_output(['git', 'status', '--porcelain'], cwd=root, text=True).strip(): raise RuntimeError('source_changed')
    journal = archive.with_suffix('.publication.json')
    state = json.loads(journal.read_text()) if journal.exists() else {
        'checkedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'projectId': project,
        'commitSha': commit, 'localArchiveHash': package['hash'], 'modelTurns': 0, 'walletWrites': False,
        'phase': 'prepared', 'nativeCalls': 0}
    if (state['projectId'], state['commitSha'], state['localArchiveHash']) != (project, commit, package['hash']): raise RuntimeError('journal_conflict')
    def call(tool, args):
        state['nativeCalls'] += 1; write(journal, state)
        diagnostics = {}
        try:
            return rpc.invoke({'tool': tool, 'arguments': args}, diagnostics)
        except Exception:
            state['lastCallDiagnostic'] = diagnostics
            write(journal, state)
            print(json.dumps({'diagnostic': diagnostics}))
            raise
    if state['phase'] in ('save_started', 'deploy_started'): raise RuntimeError('mutation_needs_reconciliation')
    account = owner(project)
    if state['phase'] == 'prepared':
        state['archivePathEncoding'] = 'absolute_path'
        state['phase'] = 'save_started'; write(journal, state)
        saved = call('sites.save_site_version', {'project_id': project, 'commit_sha': commit, 'archive': str(archive)})
        if saved.get('project_id') != project or saved.get('source', {}).get('commit_sha') != commit or not saved.get('archive_storage'): raise RuntimeError('saved_version_mismatch')
        state.update(phase='saved', versionId=saved['id'], remoteArchive=rpc.project('sites.save_site_version', saved)['archive_storage'])
        write(journal, state)
    if state['phase'] == 'saved':
        if owner(project) != account: raise RuntimeError('owner_changed')
        state['phase'] = 'deploy_started'; write(journal, state)
        deployed = call('sites.deploy_private_site_version', {'project_id': project, 'version_id': state['versionId']})
        if deployed.get('project_id') != project or deployed.get('version_id') != state['versionId'] or deployed.get('type') != 'publish': raise RuntimeError('deployment_mismatch')
        state.update(phase='deploying', deploymentId=deployed['id'], deploymentStatus=deployed['status'])
        if deployed.get('url'): state['url'] = deployed['url']
        write(journal, state)
    for _ in range(12):
        if state.get('deploymentStatus') in ('succeeded', 'failed'): break
        if state['phase'] != 'deploying': raise RuntimeError('invalid_phase')
        time.sleep(1.5)
        result = call('sites.get_deployment_status', {'project_id': project, 'deployment_id': state['deploymentId']})
        if result.get('project_id') != project or result.get('version_id') != state['versionId']: raise RuntimeError('deployment_mismatch')
        state['deploymentStatus'] = result['status']
        if result.get('url'): state['url'] = result['url']
        write(journal, state)
    if state.get('deploymentStatus') != 'succeeded': raise RuntimeError('publication_incomplete')
    if owner(project) != account: raise RuntimeError('owner_changed')
    state.update(phase='published', ownerPrivateVerified=True)
    write(journal, state)
    # Private operational evidence, never part of the Site or app assets.
    write(BASE/'cli-publication-verification.json', state)
    print(json.dumps({'published': True, 'ownerPrivateVerified': True, 'modelTurns': 0, 'walletWrites': False, 'url': state['url']}))

if __name__ == '__main__':
    try: main()
    except Exception as error:
        allowed = {'owner_private_required', 'mutation_needs_reconciliation', 'saved_version_mismatch', 'publication_incomplete', 'sites_call_failed', 'rpc_failed', 'sites_unavailable'}
        print(json.dumps({'published': False, 'failure': str(error) if re.fullmatch(r'[a-z_]{1,80}', str(error)) else 'qualification_failed', 'errorType': type(error).__name__}))
        sys.exit(1)
