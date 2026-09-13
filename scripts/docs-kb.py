#!/usr/bin/env python3
"""Private, offline knowledge catalog, source impact and explicit review tooling."""
import argparse
from datetime import date, datetime, timezone
import fnmatch
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
CONFIG = 'docs/knowledge/registry.json'
REVIEWS = 'docs/knowledge/reviews.json'
CATALOG = 'docs/knowledge/catalog.json'
KINDS = {'tutorial', 'how-to', 'runbook', 'reference', 'explanation', 'decision', 'evidence', 'research', 'draft', 'navigation'}
STATUSES = {'proposed', 'accepted', 'rejected', 'deprecated', 'superseded'}
DELIVERY = {'not-started', 'local', 'deployed', 'verified'}
RUNBOOK_SECTIONS = ('Purpose and trigger', 'Authority and prerequisites', 'Procedure',
                    'Stop conditions', 'Recovery and rollback', 'Verification and evidence')


def read(root, path):
    return json.loads((root / path).read_text())


def dump(value):
    return json.dumps(value, indent=2, ensure_ascii=False) + '\n'


def safe_file(root, name):
    path = Path(name)
    if path.is_absolute() or '..' in path.parts or '/evidence/raw/' in '/' + name:
        raise ValueError(f'Unsafe repository reference: {name}')
    result = (root / path).resolve()
    if not result.is_relative_to(root.resolve()) or not result.is_file():
        raise ValueError(f'Missing or external repository reference: {name}')
    return result


def matches(name, pattern):
    return fnmatch.fnmatchcase(name, pattern) or fnmatch.fnmatchcase(name, pattern.replace('**/', ''))


def source_files(root, domain):
    paths = set(domain['guides'])
    for pattern in domain['sources']:
        paths.update(str(p.relative_to(root)) for p in root.glob(pattern)
                     if p.is_file() and not p.is_symlink() and '__pycache__' not in p.parts)
    return sorted(paths)


def fingerprints(root, domain):
    return {name: hashlib.sha256(safe_file(root, name).read_bytes()).hexdigest()
            for name in source_files(root, domain)}


def review_state(root, domain, review, today=None):
    if not review:
        return 'unreviewed'
    if review['files'] != fingerprints(root, domain):
        return 'stale'
    today = today or datetime.now(timezone.utc).date()
    return 'due' if date.fromisoformat(review['review_by']) < today else 'reviewed'


def documents(root, config):
    result = []
    paths = list((root / 'docs').rglob('*.md')) + [p for p in (root / 'post-mortem').rglob('*.md')
                                                if '/evidence/raw/' not in p.as_posix()]
    for path in sorted(paths):
        name = path.relative_to(root).as_posix()
        body = path.read_text()
        title = next((s[2:].strip() for s in body.splitlines() if s.startswith('# ')), path.stem)
        scope = re.search(r'<!-- docs-scope: ([\w-]+) -->', body)
        scope = scope[1] if scope else 'missing'
        override = config['documents'].get(name, {})
        kind = {'decision-record': 'decision', 'operational-record': 'evidence',
                'research-reference': 'research', 'commercial-draft': 'draft'}.get(scope, 'reference')
        for folder, folder_kind in [('tutorials', 'tutorial'), ('how-to', 'how-to'),
                                    ('runbooks', 'runbook'), ('explanations', 'explanation')]:
            if f'/{folder}/' in name:
                kind = folder_kind
        if path.name in {'README.md', 'CATALOG.md', 'DOMAINS.md', 'DECISIONS.md'}:
            kind = 'navigation'
        domains = [key for key, domain in config['domains'].items() if name in domain['guides']]
        result.append({'path': name, 'title': title, 'scope': scope,
                       'kind': override.get('kind', kind), 'domains': domains,
                       'curation': 'assigned' if domains else 'unreviewed',
                       'keywords': override.get('keywords', []),
                       'decision': config['decisions'].get(name) if kind == 'decision' else None})
    return result


def validate(root, config, reviews, require_complete=True):
    errors = []
    if config.get('version') != 1:
        errors.append('Unsupported knowledge registry version')
    domains = config['domains']
    if require_complete and config.get('require_domain_reviews'):
        for key in domains.keys() - reviews.keys():
            errors.append(f'{key}: missing domain review; inspect source and canonical guides')
    for key, domain in domains.items():
        if not re.fullmatch(r'[a-z][a-z0-9-]*', key) or not domain.get('owner'):
            errors.append(f'{key}: domain requires an ID and responsible role')
        if not domain['sources'] or not domain['guides']:
            errors.append(f'{key}: source and guide coverage required')
        for pattern in domain['sources']:
            if Path(pattern).is_absolute() or '..' in Path(pattern).parts:
                errors.append(f'{key}: unsafe source pattern')
            elif not any(p.is_file() for p in root.glob(pattern)):
                errors.append(f'{key}: source pattern matches no files: {pattern}')
        for guide in domain['guides']:
            safe_file(root, guide)
        for command in domain['checks']:
            script = re.fullmatch(r'npm run ([\w:.-]+)', command)
            if not script or script[1] not in read(root, 'package.json')['scripts']:
                errors.append(f'{key}: check must name an existing npm script: {command}')
    for name, metadata in config['documents'].items():
        safe_file(root, name)
        if metadata.get('kind') not in KINDS:
            errors.append(f'{name}: invalid content kind')
    for name in config['runbooks']:
        body = safe_file(root, name).read_text()
        for heading in RUNBOOK_SECTIONS:
            if f'## {heading}\n' not in body:
                errors.append(f'{name}: missing runbook section: {heading}')
    for path in (root / 'docs/runbooks').glob('*.md'):
        name = path.relative_to(root).as_posix()
        if path.name != 'README.md' and name not in config['runbooks']:
            errors.append(f'{name}: new runbook requires registration')
    decisions = config['decisions']
    for path in (root / 'docs/adr').glob('[0-9]*.md'):
        if int(path.name.split('-', 1)[0]) >= config['managed_adr_from'] and path.relative_to(root).as_posix() not in decisions:
            errors.append(f'{path.name}: new ADR requires lifecycle metadata')
    for name, record in decisions.items():
        safe_file(root, name)
        if not re.fullmatch(r'docs/adr/\d{4}-.+\.md', name):
            errors.append(f'{name}: invalid ADR path')
        if record['status'] not in STATUSES or record['delivery'] not in DELIVERY:
            errors.append(f'{name}: invalid decision/delivery state')
        if record.get('domain') not in domains or not record.get('owner'):
            errors.append(f'{name}: missing decision domain/owner')
        date.fromisoformat(record['date'])
        for item in record.get('evidence', []):
            safe_file(root, item)
        if record['delivery'] != 'not-started' and not record.get('evidence'):
            errors.append(f'{name}: delivery state requires evidence')
        if record['delivery'] in {'deployed', 'verified'} and not all(record.get(k) for k in ('target', 'revision', 'observed_at')):
            errors.append(f'{name}: deployed/verified requires target, revision and observed_at')
        # Delivery records observations independently from decision approval.
        # Retain evidence requirements without forcing an acceptance transition.
        if record.get('observed_at'):
            observed = datetime.fromisoformat(record['observed_at'].replace('Z', '+00:00'))
            if observed.tzinfo is None or observed > datetime.now(timezone.utc):
                errors.append(f'{name}: observation requires a past timestamp with timezone')
        successor = record.get('superseded_by')
        if record['status'] == 'superseded' and not successor:
            errors.append(f'{name}: superseded requires a successor')
        if successor and (successor not in decisions or name not in decisions[successor].get('supersedes', [])):
            errors.append(f'{name}: successor must reciprocate supersession')
        for previous in record.get('supersedes', []):
            if previous not in decisions or decisions[previous].get('superseded_by') != name:
                errors.append(f'{name}: predecessor must reciprocate supersession')
        seen = {name}
        while successor in decisions:
            if successor in seen:
                errors.append(f'{name}: supersession cycle')
                break
            seen.add(successor)
            successor = decisions[successor].get('superseded_by')
    for key, review in reviews.items():
        if key not in domains:
            errors.append(f'{key}: review for unknown domain')
            continue
        if not all(review.get(k) for k in ('reviewer', 'note', 'reviewed_at', 'review_by', 'files')):
            errors.append(f'{key}: incomplete explicit review')
            continue
        evidence = review.get('evidence', {})
        if config.get('require_review_evidence') and not evidence:
            errors.append(f'{key}: explicit review requires retained evidence')
        for name, expected in evidence.items():
            path = safe_file(root, name)
            if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
                errors.append(f'{key}: review evidence changed: {name}')
        reviewed = date.fromisoformat(review['reviewed_at'])
        due = date.fromisoformat(review['review_by'])
        if due < reviewed or reviewed > datetime.now(timezone.utc).date():
            errors.append(f'{key}: invalid review dates')
        if review_state(root, domains[key], review) == 'stale':
            errors.append(f'{key}: source/guide review stale; review affected bodies before docs:review')
    return errors


def generated(root, config):
    rows = documents(root, config)
    titles = {row['path']: row['title'].replace('|', '\\|') for row in rows}
    domain_page = ['# Knowledge domains', '', '<!-- docs-scope: current-guide -->', '',
                   'Generated from [registry.json](registry.json). Roles identify responsibility; they do not grant repository or production access. Run `npm run docs:status` for current review state.', '']
    for key, domain in config['domains'].items():
        domain_page += [f'## {domain["title"]}', '', f'Owner role: **{domain["owner"]}**. Domain: `{key}`.', '',
                        *[f'- [{titles.get(p, Path(p).stem)}](../../{p})' for p in domain['guides']], '',
                        'Relevant checks (select for the change; impact discovery never executes these): ' + ', '.join(f'`{c}`' for c in domain['checks']) + '.', '']
    decisions = ['# Decision lifecycle register', '', '<!-- docs-scope: current-guide -->', '',
                 'Generated metadata, separate from [the full ADR catalog](../adr/README.md). Unregistered legacy decisions retain their original text and topic scope; no status or deployment is inferred.', '',
                 '| Decision | Decision status | Delivery evidence | Owner |', '| --- | --- | --- | --- |']
    for name, row in sorted(config['decisions'].items()):
        decisions.append(f'| [{titles.get(name, Path(name).stem)}](../../{name}) | {row["status"]} | {row["delivery"]} | {row["owner"]} |')
    return {CATALOG: dump({'version': 1, 'documents': rows}),
            'docs/knowledge/DOMAINS.md': '\n'.join(domain_page).rstrip() + '\n',
            'docs/knowledge/DECISIONS.md': '\n'.join(decisions).rstrip() + '\n'}


def search(root, config, query, history=False, limit=10):
    terms = re.findall(r'[\w-]+', query.lower())
    if not terms:
        return []
    results = []
    for row in documents(root, config):
        if row['kind'] == 'navigation':
            continue
        if not history and (row['scope'] != 'current-guide' and
                            (not row['decision'] or row['decision']['status'] != 'accepted')):
            continue
        title = (row['title'] + ' ' + ' '.join(row['keywords'])).lower()
        body = safe_file(root, row['path']).read_text().lower()
        # Every query term must match; exact title/keywords outrank incidental body mentions.
        if not all(t in body or t in title for t in terms):
            continue
        score = sum(10 * title.count(t) + min(body.count(t), 3) for t in terms)
        results.append({**row, 'score': score})
    return sorted(results, key=lambda r: (-r['score'], r['path']))[:limit]


def changed_files(root, base=None):
    if base:
        # Resolve one commit before passing it to diff; reject options/ref expressions as commands.
        oid = subprocess.run(['git', 'rev-parse', '--verify', '--end-of-options', base + '^{commit}'],
                             cwd=root, capture_output=True, text=True, check=True).stdout.strip()
        args = ['git', 'diff', '--name-only', '-z', oid, '--']
    else:
        args = ['git', 'diff', '--name-only', '-z', 'HEAD', '--']
    tracked = subprocess.run(args, cwd=root, capture_output=True, check=True).stdout
    untracked = subprocess.run(['git', 'ls-files', '--others', '--exclude-standard', '-z'],
                               cwd=root, capture_output=True, check=True).stdout
    return sorted(set(p.decode() for p in (tracked + untracked).split(b'\0') if p))


def impact(config, names):
    result = {}
    covered = set()
    for key, domain in config['domains'].items():
        hits = sorted(name for name in names if name in domain['guides'] or
                      any(matches(name, pattern) for pattern in domain['sources']))
        if hits:
            covered.update(hits)
            result[key] = {'changed': hits, 'owner': domain['owner'],
                           'guides': domain['guides'], 'checks': domain['checks']}
    return {'domains': result, 'unmapped': sorted(set(names) - covered),
            'notice': 'Discovery only. Unmapped paths require judgment; no test or deployment was executed.'}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['sync', 'check', 'find', 'impact', 'status', 'review'])
    parser.add_argument('query', nargs='*')
    parser.add_argument('--history', action='store_true')
    parser.add_argument('--json', action='store_true')
    parser.add_argument('--base')
    parser.add_argument('--files', nargs='+')
    parser.add_argument('--domain')
    parser.add_argument('--reviewer')
    parser.add_argument('--note')
    parser.add_argument('--review-by')
    parser.add_argument('--fail-on-due', action='store_true')
    parser.add_argument('--fail-on-unreviewed', action='store_true')
    parser.add_argument('--markdown', action='store_true', help='Render review status for GitHub job summaries')
    parser.add_argument('--evidence', action='append', default=[], help='Retained repository evidence for an explicit domain review')
    args = parser.parse_args(argv)
    root = ROOT
    config, reviews = read(root, CONFIG), read(root, REVIEWS)
    if args.command == 'review':
        if not args.reviewer or not args.note:
            parser.error('review requires --reviewer and --note after semantic source review')
        if args.domain:
            if args.domain not in config['domains'] or not args.review_by:
                parser.error('domain review requires a known --domain and --review-by YYYY-MM-DD')
            today = datetime.now(timezone.utc).date()
            if date.fromisoformat(args.review_by) < today:
                parser.error('--review-by cannot be in the past')
            reviews[args.domain] = {'reviewer': args.reviewer, 'note': args.note,
                                   'reviewed_at': today.isoformat(), 'review_by': args.review_by,
                                   'evidence': {name: hashlib.sha256(safe_file(root, name).read_bytes()).hexdigest() for name in args.evidence},
                                   'files': fingerprints(root, config['domains'][args.domain])}
            errors = validate(root, config, {args.domain: reviews[args.domain]}, require_complete=False)
            if errors:
                raise ValueError('\n'.join(errors))
            (root / REVIEWS).write_text(dump(reviews))
            print(f'Recorded explicit review for {args.domain}; no runtime acceptance implied.')
            return 0
        return subprocess.run([sys.executable, 'scripts/verify-post-mortem.py', '--review',
                               '--reviewer', args.reviewer, '--note', args.note], cwd=root).returncode
    if args.command == 'find':
        rows = search(root, config, ' '.join(args.query), args.history)
        if args.json:
            print(dump(rows), end='')
        else:
            for row in rows:
                print(f'{row["title"]}\n  {row["path"]} [{row["kind"]}; {row["scope"]}; {row["curation"]}]')
            if not rows:
                print('No matching active guide. Try fewer terms or --history for unreviewed references and dated records.')
        return 0
    if args.command == 'impact':
        report = impact(config, args.files or changed_files(root, args.base))
        print(dump(report), end='')
        return 0
    if args.command == 'status':
        report = {key: {'state': review_state(root, domain, reviews.get(key)),
                        'owner': domain['owner'], 'review_by': reviews.get(key, {}).get('review_by')}
                  for key, domain in config['domains'].items()}
        if args.markdown:
            print('## Knowledge review status\n\n| Domain | State | Owner role | Review by |\n| --- | --- | --- | --- |')
            for key, row in report.items():
                owner = row['owner'].replace('|', '\\|').replace('\n', ' ')
                print(f'| {key} | {row["state"]} | {owner} | {row["review_by"] or "Missing"} |')
            print('\nMissing or stale: review sources and full guides, retain evidence, then use docs:review. Due: perform the scheduled review. Index synchronization never records a review.')
        else:
            print(dump(report), end='')
        return int((args.fail_on_due and any(r['state'] in {'due', 'stale'} for r in report.values())) or
                   (args.fail_on_unreviewed and any(r['state'] == 'unreviewed' for r in report.values())))
    errors = validate(root, config, {} if args.command == 'sync' else reviews, require_complete=args.command != 'sync')
    views = generated(root, config)
    if args.command == 'sync' and not errors:
        for name, body in views.items():
            (root / name).write_text(body)
        print(f'Generated {len(views)} knowledge views; review records unchanged.')
        return 0
    for name, body in views.items():
        if not (root / name).exists() or (root / name).read_text() != body:
            errors.append(f'Knowledge view stale: {name}; run npm run docs:sync')
    if errors:
        print('\n'.join(errors), file=sys.stderr)
        return 1
    print(f'Knowledge validation passed: {len(documents(root, config))} documents, {len(config["domains"])} domains; lifecycle, runbook contracts and source review.')
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (KeyError, ValueError, OSError, subprocess.CalledProcessError) as error:
        print(f'Knowledge command failed: {error}', file=sys.stderr)
        sys.exit(1)
