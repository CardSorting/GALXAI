#!/usr/bin/env python3
"""Exercise knowledge guard failure modes using local disposable repositories."""
import copy
from datetime import date
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('knowledge', Path(__file__).with_name('docs-kb.py'))
kb = importlib.util.module_from_spec(spec)
spec.loader.exec_module(kb)
docs_spec = importlib.util.spec_from_file_location('docs_navigation', Path(__file__).with_name('verify-docs.py'))
docs = importlib.util.module_from_spec(docs_spec)
docs_spec.loader.exec_module(docs)


class KnowledgeGuardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.guide = 'docs/how-to/image.md'
        self.adr = 'docs/adr/0145-images.md'
        self.write(self.guide, '# Image recovery\n\n<!-- docs-scope: current-guide -->\n\nRecover favorites safely.\n')
        self.write(self.adr, '# Image decision\n\n<!-- docs-scope: decision-record -->\n')
        self.write('src/images.ts', 'original source')
        self.write('package.json', '{"scripts":{"test:images":"fixture"}}')
        self.write('evidence/result.json', '{"scope":"fixture"}')
        self.domain = {'title': 'Images', 'owner': 'Image maintainer', 'sources': ['src/**/*.ts'],
                       'guides': [self.guide], 'checks': ['npm run test:images']}
        self.record = {'status': 'accepted', 'delivery': 'local', 'domain': 'images',
                       'owner': 'Image maintainer', 'date': '2026-09-13',
                       'evidence': ['evidence/result.json'], 'supersedes': []}
        self.config = {'version': 1, 'managed_adr_from': 145, 'domains': {'images': self.domain},
                       'documents': {}, 'runbooks': [], 'decisions': {self.adr: self.record}}

    def write(self, name, content):
        p = self.root / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content)

    def review(self):
        return {'reviewer': 'fixture', 'note': 'Fixture review only', 'reviewed_at': '2026-09-13',
                'review_by': '2026-09-20', 'files': kb.fingerprints(self.root, self.domain)}

    def test_valid_local_evidence_is_not_deployment(self):
        self.assertEqual(kb.validate(self.root, self.config, {}), [])
        self.record['delivery'] = 'verified'
        self.assertTrue(any('target, revision' in e for e in kb.validate(self.root, self.config, {})))

    def test_missing_evidence_cannot_assert_implementation(self):
        self.record['evidence'] = []
        self.assertTrue(any('requires evidence' in e for e in kb.validate(self.root, self.config, {})))

    def test_delivery_evidence_does_not_accept_a_decision(self):
        for status in ('proposed', 'rejected'):
            for delivery in ('deployed', 'verified'):
                with self.subTest(status=status, delivery=delivery):
                    self.record.update(status=status, delivery=delivery, target='fixture',
                                       revision='fixture', observed_at='2026-09-13T00:00:00Z')
                    before = copy.deepcopy(self.config)
                    self.assertEqual(kb.validate(self.root, self.config, {}), [])
                    kb.generated(self.root, self.config)
                    self.assertEqual(self.config, before)

    def test_unaccepted_delivery_still_requires_evidence_and_target(self):
        self.record.update(status='proposed', delivery='deployed', evidence=[])
        errors = kb.validate(self.root, self.config, {})
        self.assertTrue(any('requires evidence' in e for e in errors))
        self.assertTrue(any('target, revision' in e for e in errors))

    def test_new_decision_cannot_skip_metadata(self):
        self.write('docs/adr/0146-next.md', '# Next decision\n')
        self.assertTrue(any('requires lifecycle' in e for e in kb.validate(self.root, self.config, {})))

    def test_supersession_requires_reciprocity_and_no_cycles(self):
        second = 'docs/adr/0146-next.md'
        self.write(second, '# Successor\n')
        self.config['decisions'][second] = copy.deepcopy(self.record)
        self.record.update(status='superseded', superseded_by=second)
        self.assertTrue(any('reciprocate' in e for e in kb.validate(self.root, self.config, {})))
        self.config['decisions'][second].update(status='superseded', supersedes=[self.adr], superseded_by=self.adr)
        self.record['supersedes'] = [second]
        self.assertTrue(any('cycle' in e for e in kb.validate(self.root, self.config, {})))

    def test_evidence_rejects_traversal_raw_and_symlinks(self):
        for name in ['../outside', '/tmp/outside', 'post-mortem/evidence/raw/token.json']:
            with self.subTest(name=name), self.assertRaises(ValueError):
                kb.safe_file(self.root, name)
        with tempfile.NamedTemporaryFile() as outside:
            (self.root / 'escape').symlink_to(outside.name)
            with self.assertRaises(ValueError):
                kb.safe_file(self.root, 'escape')

    def test_changed_added_and_deleted_sources_invalidate_review(self):
        review = self.review()
        self.assertEqual(kb.review_state(self.root, self.domain, review, date(2026, 9, 13)), 'reviewed')
        self.write('src/nested/new.ts', 'new owner boundary')
        self.assertEqual(kb.review_state(self.root, self.domain, review), 'stale')
        review = self.review()
        (self.root / 'src/nested/new.ts').unlink()
        self.assertEqual(kb.review_state(self.root, self.domain, review), 'stale')
        review = self.review()
        self.write(self.guide, 'changed guidance')
        self.assertEqual(kb.review_state(self.root, self.domain, review), 'stale')

    def test_unreviewed_due_and_stale_remain_distinct(self):
        self.assertEqual(kb.review_state(self.root, self.domain, None), 'unreviewed')
        self.assertEqual(kb.review_state(self.root, self.domain, self.review(), date(2026, 9, 21)), 'due')

    def test_required_review_and_evidence_cannot_be_omitted_or_changed(self):
        self.config.update(require_domain_reviews=True, require_review_evidence=True)
        self.assertTrue(any('missing domain review' in e for e in kb.validate(self.root, self.config, {})))
        review = self.review()
        self.assertTrue(any('retained evidence' in e for e in kb.validate(self.root, self.config, {'images': review})))
        import hashlib
        review['evidence'] = {'evidence/result.json': hashlib.sha256((self.root / 'evidence/result.json').read_bytes()).hexdigest()}
        self.assertEqual(kb.validate(self.root, self.config, {'images': review}), [])
        self.write('evidence/result.json', '{"rewritten":true}')
        self.assertTrue(any('evidence changed' in e for e in kb.validate(self.root, self.config, {'images': review})))

    def test_scheduled_audit_fails_missing_and_due_reviews(self):
        self.write(kb.CONFIG, kb.dump(self.config))
        self.write(kb.REVIEWS, '{}')
        old_root = kb.ROOT
        try:
            kb.ROOT = self.root
            self.assertEqual(kb.main(['status', '--fail-on-due', '--fail-on-unreviewed']), 1)
            review = self.review()
            review['review_by'] = '2000-01-01'
            self.write(kb.REVIEWS, kb.dump({'images': review}))
            self.assertEqual(kb.main(['status', '--fail-on-due', '--fail-on-unreviewed']), 1)
        finally:
            kb.ROOT = old_root

    def test_sync_does_not_attest_a_review(self):
        self.write(kb.CONFIG, kb.dump(self.config))
        self.write(kb.REVIEWS, kb.dump({'images': self.review()}))
        before = (self.root / kb.REVIEWS).read_bytes()
        self.write('src/new.ts', 'must remain stale')
        old_root = kb.ROOT
        try:
            kb.ROOT = self.root
            self.assertEqual(kb.main(['sync']), 0)
        finally:
            kb.ROOT = old_root
        self.assertEqual(before, (self.root / kb.REVIEWS).read_bytes())
        self.assertTrue(any('stale' in e for e in kb.validate(self.root, self.config, kb.read(self.root, kb.REVIEWS))))

    def test_active_search_excludes_legacy_and_finds_canonical_incident_runbook(self):
        self.write('docs/old.md', '# Favorites history\n<!-- docs-scope: research-reference -->\n')
        self.write('post-mortem/runbooks/images.md', '# Favorites recovery\n<!-- docs-scope: current-guide -->\n')
        active = kb.search(self.root, self.config, 'favorites')
        self.assertNotIn('docs/old.md', [r['path'] for r in active])
        self.assertIn('post-mortem/runbooks/images.md', [r['path'] for r in active])
        self.assertIn('docs/old.md', [r['path'] for r in kb.search(self.root, self.config, 'favorites', history=True)])

    def test_impact_includes_nested_and_direct_sources_and_unmapped_paths(self):
        report = kb.impact(self.config, ['src/images.ts', 'src/nested/images.ts', 'new-service/main.go'])
        self.assertEqual(report['domains']['images']['changed'], ['src/images.ts', 'src/nested/images.ts'])
        self.assertEqual(report['unmapped'], ['new-service/main.go'])

    def test_new_runbook_requires_registration_and_all_sections(self):
        name = 'docs/runbooks/new.md'
        self.write(name, '# Recover\n')
        self.assertTrue(any('requires registration' in e for e in kb.validate(self.root, self.config, {})))
        self.config['runbooks'].append(name)
        self.assertEqual(len([e for e in kb.validate(self.root, self.config, {}) if 'missing runbook section' in e]), 6)

    def test_changed_files_handles_spaces_staged_and_untracked(self):
        def git(*args):
            return subprocess.run(['git', *args], cwd=self.root, capture_output=True, check=True)
        git('init', '-q')
        git('add', '.')
        git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture')
        self.write('src/space name.ts', 'added')
        git('add', 'src/space name.ts')
        self.write('src/untracked.ts', 'untracked')
        self.assertEqual(kb.changed_files(self.root), ['src/space name.ts', 'src/untracked.ts'])
        with self.assertRaises(subprocess.CalledProcessError):
            kb.changed_files(self.root, '--help')

    def test_navigation_rejects_ignored_evidence_but_allows_tracked_and_new_files(self):
        subprocess.run(['git', 'init', '-q'], cwd=self.root, check=True)
        self.write('.gitignore', '.local-evidence/\n')
        self.write('.local-evidence/result with spaces.json', '{}')
        self.write('evidence/new.json', '{}')
        names = {'.local-evidence/result with spaces.json', 'evidence/new.json'}
        self.assertEqual(docs.ignored_targets(self.root, names), {'.local-evidence/result with spaces.json'})
        subprocess.run(['git', 'add', '-f', '.local-evidence/result with spaces.json'], cwd=self.root, check=True)
        self.assertEqual(docs.ignored_targets(self.root, names), set())


if __name__ == '__main__':
    unittest.main()
