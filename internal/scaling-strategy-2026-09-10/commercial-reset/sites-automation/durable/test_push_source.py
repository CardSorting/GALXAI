import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('push', Path(__file__).with_name('push-source.py'))
push = importlib.util.module_from_spec(spec)
spec.loader.exec_module(push)

class PushSourceTests(unittest.TestCase):
    def fixture(self, root):
        (root/'.openai').mkdir(); (root/'dist').mkdir()
        (root/'.openai/hosting.json').write_text(json.dumps({'project_id': 'project', 'static': {'directory': 'dist'}}))
        (root/'dist/index.html').write_text('<!doctype html><title>Private fixture</title>')

    def test_only_dedicated_static_source(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); self.fixture(root)
            self.assertEqual(push.validate(root)['arguments'], {'project_id': 'project'})
            (root/'.env').write_text('synthetic-secret')
            with self.assertRaises(RuntimeError): push.validate(root)

    def test_links_cannot_smuggle_files(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); self.fixture(root)
            (root/'dist/extra').symlink_to(root/'.openai/hosting.json')
            with self.assertRaises(RuntimeError): push.validate(root)

    def test_runtime_bindings_are_out_of_scope(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); self.fixture(root)
            p = root/'.openai/hosting.json'; m = json.loads(p.read_text()); m['capabilities'] = ['private-network']; p.write_text(json.dumps(m))
            with self.assertRaises(RuntimeError): push.validate(root)

if __name__ == '__main__': unittest.main()
