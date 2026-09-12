"""Isolated application regression/build check with no dotenv or real credentials."""
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import tempfile
import sys

repo = Path(__file__).resolve().parents[5]
node = Path('/private/tmp/galx-audit-node22/node-v22.21.1-darwin-arm64/bin/node')
if not node.is_file():
    raise SystemExit('Previously verified Node 22 runtime is unavailable; configure an equivalent local runtime before verification.')
workspace = Path(tempfile.mkdtemp(prefix='galx-sites-application-check-'))
tracked = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=repo).decode().split('\0')
allowed_directories = {'src', 'public', 'scripts', 'workers'}
allowed_root_files = {'package.json', 'package-lock.json', 'tsconfig.json', 'next.config.ts',
                      'next-env.d.ts', 'postcss.config.mjs', 'eslint.config.mjs', 'tailwind.config.ts', '.vercelignore', 'README.md',
                      'docs/API_REFERENCE.md', 'docs/API_BASE_URL.md', 'docs/QUICKSTART.md'}
for relative in tracked:
    if not relative:
        continue
    rel = Path(relative)
    if rel.parts[0] not in allowed_directories and relative not in allowed_root_files:
        continue
    if rel.name.startswith('.env') or rel.name in {'.npmrc', '.yarnrc', '.DS_Store'}:
        continue
    source = repo / rel
    if not source.is_file() or source.is_symlink():
        continue
    destination = workspace / rel
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
(workspace / 'node_modules').symlink_to(repo / 'node_modules', target_is_directory=True)
environment = {key: os.environ[key] for key in ('PATH', 'HOME', 'TMPDIR', 'LANG') if key in os.environ}
environment.update({'CI': 'true', 'NEXT_TELEMETRY_DISABLED': '1'})
tests = [
    'scripts/test-image-public-http.ts', 'scripts/test-public-information-boundary.ts',
    'scripts/test-image-retry-contract.ts', 'scripts/test-auth-identity-boundary.ts',
    'scripts/test-relay-chat-transport.ts', 'scripts/test-postgres-admission.ts',
    'scripts/test-relay-capabilities.ts', 'scripts/test-federation-admission.ts', 'scripts/test-ci-build.mjs',
    'scripts/test-sites-content-route.ts',
    'scripts/test-relay-completion-usage.ts', 'scripts/test-relay-federation-http.ts',
    'scripts/test-relay-durable-receipts.ts', 'scripts/test-sites-activation.ts',
    'scripts/test-relay-receipt-transport.ts',
    'scripts/test-sites-relay-preflight.ts',
    'scripts/test-sites-fixed-price.ts',
    'scripts/test-sites-domains.ts',
    'scripts/test-sites-domain-worker.ts',
    'scripts/test-sites-workspace.ts',
]
print(json.dumps({'workspace': str(workspace), 'runtime': str(node), 'real_credentials': False}), flush=True)
result = {'scope': 'isolated validation only; never deploy this output', 'workspace': str(workspace),
          'runtime': subprocess.check_output([str(node), '--version'], text=True).strip(),
          'production_credentials': False, 'dotenv_copied': False, 'source_changed': True}
for name, command in [('regressions', [str(node), '--import', 'tsx', '--test', *tests]),
                      ('build', [str(node), 'scripts/build-ci.mjs'])]:
    log = workspace / (name + '.log')
    child_environment = dict(environment)
    if name == 'regressions':
        child_environment.update({'GALX_VAULT_ACTIVE_KEY_VERSION': 'v1',
                                  'GALX_VAULT_KEY_V1': secrets.token_urlsafe(48),
                                  'GALX_AUDIT_SIGNING_SECRET': secrets.token_urlsafe(48)})
    with log.open('w') as output:
        completed = subprocess.run(command, cwd=workspace, env=child_environment, stdout=output,
                                   stderr=subprocess.STDOUT, timeout=600)
    text = log.read_text()
    result[name] = {'exit_code': completed.returncode, 'log_sha256': hashlib.sha256(log.read_bytes()).hexdigest()}
    if name == 'regressions':
        for field in ('tests', 'pass', 'fail', 'skipped'):
            match = re.search(r'^# ' + field + r' (\d+)$', text, re.M)
            if match: result[name][field] = int(match.group(1))
    print(json.dumps({name: result[name]}), flush=True)
    if completed.returncode:
        break
if result.get('build', {}).get('exit_code') == 0:
    markers = [b'sites-static-v2', b'publication_outcome_unknown', b'workflow.sqlite',
               b'GALX_SITES_TEST_RELAY', b'sites-automation/durable', b'connection-contract.json',
               b'PostgresSitesBilling', b'sites-generation-v1', b'GALX_SITES_RATE_CARD', b'private-relay.example',
               b'GALX_SITES_ACTIVATION_EVIDENCE', b'receipt_writer_fenced', b'receipt_commit_unavailable', b'requireSitesActivation',
               b'GALX_SITES_DELIVERY_MODE', b'hosted_receipt_mismatch', b'onUpstreamDiagnostic',
               b'GALX_SITES_RELAY_ADMIN_KEY', b'/api/sites/contract', b'outputLimitForwarded',
               b'sites-local-v1', b'fixed_completion', b'fixedChargeMicroUsd', b'maxDailyGenerations',
               b'GALX_SITES_COHORT_ACCOUNT_IDS', b'galx_site_namespaces', b'galx_site_domains',
               b'GALX_SITES_DNS_API_TOKEN', b'galx-sites-domain-v1', b'_openai-site-verification',
               b'GALX_SITES_WORKER_TOKEN', b'galx_site_domains_due_idx', b'site-addresses.sqlite', b'GALX_SITES_DOMAINS_WORKER_ENABLED', b'galx_site_workspaces', b'GALX_SITES_HOSTING_TOKEN',
               b'GALX_SITES_HOSTING_PROJECT', b'GALX_SITES_MANAGED_PUBLISH_ENABLED', b'ManagedSitesHosting']
    files = [p for p in (workspace / '.next/static').rglob('*') if p.is_file()]
    files += list((workspace / '.next/server/app').rglob('*.html'))
    hits = []
    for file in files:
        content = file.read_bytes()
        if any(marker in content for marker in markers): hits.append(str(file.relative_to(workspace)))
    result['private_implementation_asset_scan'] = {'files': len(files), 'markers': len(markers), 'hits': hits,
                                                   'live_site_scanned': False}
evidence_name = sys.argv[1] if len(sys.argv) == 2 else 'application-verification.json'
if not re.fullmatch(r'[a-z0-9-]+\.json', evidence_name):
    raise SystemExit('Invalid evidence filename')
result_path = Path(__file__).resolve().parent / evidence_name
result_path.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'evidence': str(result_path)}), flush=True)
if result.get('regressions', {}).get('exit_code') or result.get('build', {}).get('exit_code', 1):
    raise SystemExit(1)
if result['private_implementation_asset_scan']['hits']:
    raise SystemExit(1)
