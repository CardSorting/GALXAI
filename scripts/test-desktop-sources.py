"""Credential selection uses private fixture homes; no host account is read."""
import importlib.util, json, os, pathlib, subprocess, sys, tempfile, unittest
GUEST = pathlib.Path(__file__).resolve().parents[1] / 'src/relay/desktop'
sys.path.insert(0, str(GUEST))
from credential_files import read_private, save_private
spec = importlib.util.spec_from_file_location('reader', GUEST / 'read-credentials.py')
reader = importlib.util.module_from_spec(spec); spec.loader.exec_module(reader)

class SourcesTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix='desktop-sources-'); self.root = pathlib.Path(self.directory.name)
        (self.root / '.config/galx-relay').mkdir(parents=True); (self.root / '.codex').mkdir(); (self.root / 'custom codex').mkdir()
        self.auth = {'tokens': {'access_token': 'PRIVATE_FIXTURE', 'account_id': 'fixture'}}
        save_private(self.root / '.codex/auth.json', {'tokens': {'access_token': 'PRIVATE_OLD'}})
        save_private(self.root / 'custom codex/auth.json', self.auth)
    def tearDown(self): self.directory.cleanup()
    def select(self, home=None):
        return subprocess.run(['python3', str(GUEST / 'galx-relay'), 'use-login'], env=dict(os.environ, HOME=str(self.root), CODEX_HOME=str(home or self.root / 'custom codex')), capture_output=True, timeout=5)
    def test_custom_home_selected_without_copy_and_changes_are_observed(self):
        result = self.select(); self.assertEqual(result.returncode, 0, result.stderr); self.assertNotIn(b'PRIVATE_', result.stdout + result.stderr)
        self.assertEqual(reader.credentials(self.root)[0]['data'], self.auth)
        save_private(self.root / 'custom codex/auth.json', {'tokens': {'access_token': 'PRIVATE_ROTATED'}})
        self.assertEqual(reader.credentials(self.root)[0]['data']['tokens']['access_token'], 'PRIVATE_ROTATED')
        self.assertEqual(json.loads((self.root / '.codex/auth.json').read_text())['tokens']['access_token'], 'PRIVATE_OLD')
    def test_keyring_selection_has_actionable_file_login_recovery(self):
        (self.root / 'custom codex/config.toml').write_text('cli_auth_credentials_store="keyring"')
        result = self.select(); self.assertEqual(result.returncode, 1); self.assertIn(b'galx-relay login', result.stderr)
        self.assertFalse((self.root / '.config/galx-relay/credential-source.json').exists())
    def test_symlinks_at_each_component_fifo_oversize_and_traversal_are_rejected(self):
        (self.root / 'linked').symlink_to(self.root / 'custom codex', target_is_directory=True)
        self.assertEqual(self.select(self.root / 'linked').returncode, 1)
        self.assertEqual(self.select('/tmp/outside-home').returncode, 1)
        for relative in ['../secret', '/tmp/secret', 'custom codex/../.codex/auth.json', 'linked/auth.json']:
            with self.assertRaises((ValueError, OSError)): read_private(self.root, relative)
        file = self.root / 'custom codex/auth.json'; file.unlink(); file.symlink_to(self.root / '.codex/auth.json')
        self.assertEqual(self.select().returncode, 1)
        file.unlink(); os.mkfifo(file); self.assertEqual(self.select().returncode, 1)
        file.unlink(); file.write_text('x' * 131073); self.assertEqual(self.select().returncode, 1)
    def test_invalid_selection_does_not_fall_back_to_old_login(self):
        save_private(self.root / '.config/galx-relay/credential-source.json', {'codexHome': '../private'})
        self.assertIsNone(reader.credentials(self.root)[0]['data'])
        self.assertEqual(len(reader.credentials(self.root)), 1)
        save_private(self.root / '.config/galx-relay/credential-source.json', {'codexHome': 'missing'})
        self.assertIsNone(reader.credentials(self.root)[0]['data'])

if __name__ == '__main__': unittest.main()
