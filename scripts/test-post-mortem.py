#!/usr/bin/env python3
"""Adversarial checks for the incident documentation guard; no production I/O."""
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
from subprocess import CompletedProcess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('incident_guard', Path(__file__).with_name('verify-post-mortem.py'))
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)


class IncidentGuardTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        for name, text in {
            'post-mortem/failure-modes/README.md': '# Failures\nFM-IMG-001\n',
            'post-mortem/incidents/test/README.md': '# Evidence\n',
            '.vercelignore': '/post-mortem/\n/internal/\n/docs/\n',
            '.dockerignore': '/post-mortem/\n/internal/\n/docs/\n',
            '.gitignore': '/post-mortem/**/evidence/raw/\n',
            'src/lib/images/example.ts': 'export const safe = true;\n',
        }.items():
            p = self.root / name
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(text)
        evidence = ['post-mortem/incidents/test/README.md']
        self.register = {'incidents': [{'id': 'INC-20260913-IMAGES', 'category': 'images',
            'severity': 'SEV-1', 'owner': 'maintainer', 'status': 'recovered', 'title': 'Image incident',
            'record': evidence[0], 'evidence': evidence, 'recovery_evidence': evidence,
            'failure_modes': ['FM-IMG-001']}], 'actions': [{'id': 'ACT-001',
            'incident': 'INC-20260913-IMAGES', 'status': 'open', 'owner': 'maintainer',
            'review_by': '2026-09-20', 'next_step': 'Review recovery', 'closure': 'Evidence retained'}]}
        self.events = [{'id': 'EVT-1', 'incident': 'INC-20260913-IMAGES', 'observed_at': '2026-09-13',
            'kind': 'verification', 'observation': 'Observed result', 'action': 'Verified',
            'result': 'Recovered', 'next_step': 'Review follow-up', 'evidence': evidence}]

    def errors(self):
        return guard.validate_records(self.root, self.register, self.events)

    def test_valid_recovered_incident_can_keep_open_prevention(self):
        self.assertEqual(self.errors(), [])

    def test_closed_incident_cannot_hide_open_actions(self):
        self.register['incidents'][0]['status'] = 'closed'
        self.assertTrue(any('closed with open' in error for error in self.errors()))

    def test_recovery_requires_evidence(self):
        self.register['incidents'][0]['recovery_evidence'] = []
        self.assertTrue(any('recovery evidence' in error for error in self.errors()))

    def test_completed_action_requires_evidence(self):
        self.register['actions'][0]['status'] = 'completed'
        self.assertTrue(any('evidence is required' in error for error in self.errors()))

    def test_duplicate_events_rejected(self):
        self.events.append(deepcopy(self.events[0]))
        self.assertTrue(any('Invalid event ID' in error for error in self.errors()))

    def test_utc_timestamps_accept_equivalent_offsets_without_rewriting_events(self):
        for timestamp in ('2026-09-15T00:00:00Z', '2026-09-15T00:00:00+00:00'):
            self.events[0]['observed_at'] = timestamp
            self.assertEqual(self.errors(), [])
            self.assertEqual(self.events[0]['observed_at'], timestamp)
        for timestamp in ('2026-09-15T00:00:00', '2026-09-14T18:00:00-06:00'):
            self.events[0]['observed_at'] = timestamp
            self.assertTrue(any('timestamp must be UTC' in error for error in self.errors()))

    def test_correction_must_reference_prior_event(self):
        self.events[0]['supersedes'] = 'EVT-future'
        self.assertTrue(any('earlier event' in error for error in self.errors()))

    def test_append_only_correction_supersedes_invalid_evidence(self):
        self.events[0]['evidence'] = ['scripts/nonexistent-test.ts']
        correction = {'id': 'EVT-2', 'incident': 'INC-20260913-IMAGES',
            'observed_at': '2026-09-15T00:00:00Z', 'kind': 'correction',
            'supersedes': 'EVT-1', 'observation': 'Corrects evidence reference',
            'action': 'Preserve original and link valid evidence', 'result': 'Correction retained',
            'next_step': 'Use corrected reference', 'evidence': ['src/lib/images/example.ts']}
        self.events.append(correction)
        self.assertEqual(self.errors(), [])
        views = guard.generated_views(self.root, self.register, self.events)
        self.assertIn('superseded by correction `EVT-2`', views['post-mortem/ROLLING_LOG.md'])
        self.assertNotIn('nonexistent-test.ts', views['post-mortem/ROLLING_LOG.md'])

    def test_credentials_field_rejected_from_journal(self):
        self.events[0]['authorization'] = 'should never be retained'
        self.assertTrue(any('unexpected journal fields' in error for error in self.errors()))

    def test_raw_evidence_cannot_close_incident(self):
        self.register['incidents'][0]['recovery_evidence'] = ['post-mortem/evidence/raw/trace.json']
        self.assertTrue(any('missing, raw' in error for error in self.errors()))

    def test_retired_evidence_preserves_deleted_source_reference(self):
        retired = 'src/lib/images/retired-example.ts'
        self.events[0]['evidence'] = [retired]
        (self.root / 'post-mortem/retired-evidence.json').write_text(json.dumps({
            'version': 1,
            'paths': {retired: {
                'retired_at': '2026-09-22',
                'reason': 'Fixture source was intentionally retired',
                'replacement': 'src/lib/images/example.ts',
                'historical_evidence': ['post-mortem/incidents/test/README.md'],
            }}
        }))
        self.assertEqual(guard.validate_retired_evidence(
            self.root, guard.load_retired_evidence(self.root)), [])
        self.assertEqual(self.errors(), [])
        views = guard.generated_views(self.root, self.register, self.events,
                                      guard.load_retired_evidence(self.root))
        self.assertIn('(retired)', views['post-mortem/ROLLING_LOG.md'])

    def test_retired_evidence_cannot_hide_a_restored_source_file(self):
        retired = 'src/lib/images/retired-example.ts'
        (self.root / retired).write_text('export const retired = true;\n')
        (self.root / 'post-mortem/retired-evidence.json').write_text(json.dumps({
            'version': 1,
            'paths': {retired: {
                'retired_at': '2026-09-22',
                'reason': 'Fixture source was intentionally retired',
                'replacement': 'src/lib/images/example.ts',
                'historical_evidence': ['post-mortem/incidents/test/README.md'],
            }}
        }))
        self.assertTrue(any('still exists' in error for error in guard.validate_retired_evidence(
            self.root, guard.load_retired_evidence(self.root))))

    def test_outside_workspace_evidence_rejected(self):
        self.events[0]['evidence'] = ['../../etc/passwd']
        self.assertTrue(any('outside-workspace' in error for error in self.errors()))

    def test_missing_deployment_exclusion_rejected(self):
        (self.root / '.vercelignore').write_text('/docs/\n/internal/\n')
        self.assertTrue(any('/post-mortem/' in error for error in guard.validate_boundary(self.root)))

    def test_missing_docker_exclusion_rejected(self):
        (self.root / '.dockerignore').write_text('/docs/\n/internal/\n')
        self.assertTrue(any('.dockerignore' in error for error in guard.validate_boundary(self.root)))

    def test_private_runtime_import_and_marker_rejected(self):
        (self.root / 'src/lib/images/example.ts').write_text('import data from "../../../post-mortem/register.json";\n')
        self.assertTrue(guard.validate_boundary(self.root))
        (self.root / 'src/lib/images/example.ts').write_text(guard.PRIVATE_MARKER)
        self.assertTrue(guard.validate_boundary(self.root))

    def test_changed_and_new_source_requires_review(self):
        review = {'reviewer': 'fixture', 'note': 'source review', 'reviewed_at': '2026-09-13',
                  'files': {name: guard.digest(self.root / name) for name in guard.watched_files(self.root)}}
        self.assertEqual(guard.validate_review(self.root, review), [])
        (self.root / 'src/lib/images/example.ts').write_text('changed\n')
        self.assertTrue(any('review stale' in error for error in guard.validate_review(self.root, review)))
        (self.root / 'src/lib/images/new.ts').write_text('added\n')
        self.assertTrue(any('coverage stale' in error for error in guard.validate_review(self.root, review)))

    def test_private_knowledge_imports_rejected_but_product_docs_allowed(self):
        source = self.root / 'src/lib/images/example.ts'
        for value in ('import "../../../docs/README.md";',
                      'const x = import("../../../internal/design.md");',
                      guard.KNOWLEDGE_MARKER):
            source.write_text(value)
            self.assertTrue(guard.validate_boundary(self.root))
        source.write_text('import { content } from "@/lib/docs/content";')
        self.assertEqual(guard.validate_boundary(self.root), [])

    def test_navigation_generation_does_not_change_review_attestation(self):
        (self.root / 'docs').mkdir()
        (self.root / 'docs/README.md').write_text('# Docs\n<!-- docs-scope: current-guide -->\n')
        review_path = self.root / 'post-mortem/review.json'
        review_path.write_text(json.dumps({'reviewer': 'original', 'note': 'not refreshed', 'files': {}}))
        before = review_path.read_bytes()
        (self.root / 'post-mortem/register.json').write_text(json.dumps(self.register))
        (self.root / 'post-mortem/events.jsonl').write_text(json.dumps(self.events[0]) + '\n')
        with patch.object(guard, 'ROOT', self.root), patch.object(guard, 'validate_append_only', return_value=[]):
            self.assertEqual(guard.main(['--sync']), 0)
        self.assertEqual(review_path.read_bytes(), before)
        self.assertIn('EVT-1', (self.root / 'post-mortem/ROLLING_LOG.md').read_text())

    def test_committed_journal_can_only_be_extended(self):
        journal = self.root / 'post-mortem/events.jsonl'
        prior = b'{"id":"original"}\n'
        journal.write_bytes(prior + b'{"id":"new"}\n')
        with patch.object(guard.subprocess, 'run', return_value=CompletedProcess([], 0, prior, b'')):
            self.assertEqual(guard.validate_append_only(self.root), [])
            journal.write_bytes(b'{"id":"replacement"}\n')
            self.assertTrue(guard.validate_append_only(self.root))

    def test_ci_checks_event_baseline_and_rejects_invalid_ref(self):
        journal = self.root / 'post-mortem/events.jsonl'
        journal.write_bytes(b'{"id":"rewritten-after-commit"}\n')
        base = 'a' * 40
        with patch.dict(guard.os.environ, {'DOCS_BASE_REF': base}), patch.object(
                guard.subprocess, 'run', return_value=CompletedProcess([], 0, b'{"id":"original"}\n', b'')) as run:
            self.assertTrue(guard.validate_append_only(self.root))
            self.assertEqual(run.call_args.args[0], ['git', 'show', f'{base}:post-mortem/events.jsonl'])
        with patch.dict(guard.os.environ, {'DOCS_BASE_REF': '--help'}):
            self.assertTrue(any('full commit SHA' in e for e in guard.validate_append_only(self.root)))

    def test_compiled_asset_check_requires_a_build(self):
        self.assertTrue(guard.validate_build(self.root))

    def test_compiled_private_content_and_runtime_trace_rejected(self):
        build = self.root / '.next'
        (build / 'static').mkdir(parents=True)
        (build / 'BUILD_ID').write_text('fixture')
        asset = build / 'static/app.js'
        asset.write_text('safe public content')
        self.assertEqual(guard.validate_build(self.root), [])
        asset.write_text(guard.PRIVATE_MARKER)
        self.assertTrue(guard.validate_build(self.root))
        asset.write_text('safe public content')
        (build / 'route.nft.json').write_text(json.dumps({'files': ['../../post-mortem/register.json']}))
        self.assertTrue(guard.validate_build(self.root))

    def test_compiled_knowledge_trace_and_marker_rejected(self):
        build = self.root / '.next'
        (build / 'static').mkdir(parents=True)
        (build / 'BUILD_ID').write_text('fixture')
        asset = build / 'static/app.js'
        asset.write_text(guard.KNOWLEDGE_MARKER)
        self.assertTrue(guard.validate_build(self.root))
        asset.write_text('safe')
        trace = build / 'route.nft.json'
        trace.write_text(json.dumps({'files': ['../../docs/knowledge/catalog.json']}))
        self.assertTrue(guard.validate_build(self.root))
        trace.write_text(json.dumps({'files': ['../../node_modules/package/docs/file.js']}))
        self.assertEqual(guard.validate_build(self.root), [])


if __name__ == '__main__':
    unittest.main(verbosity=2)
