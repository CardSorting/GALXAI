"""Offline integrity/allowlist check for the recorded local draft. Never extracts."""
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import tarfile

root = Path(__file__).resolve().parent
observed = json.loads((root / 'live-observations.json').read_text())
brief = json.loads((root / 'artifacts/brief.json').read_text())
html = (root / 'artifacts/index.html').read_bytes()
archive = root / 'artifacts/static-draft.tar.gz'
assert observed['status'] == 'local_draft_packaged'
assert observed['model_source'] == 'configured_relay_only'
assert observed['direct_model_fallback'] is False
assert observed['sites_connection']['connected'] is True
assert observed['sites_connection']['model_turns_started'] == 0
assert observed['sites_connection']['unexpected_model_requests'] == 0
assert 'turn/start' not in observed['sites_connection']['rpc_methods']
assert not any(observed[k] for k in ('site_created', 'source_pushed', 'version_saved', 'deployed'))
assert 1 <= observed['live_model_calls'] <= observed['model_call_limit'] == 2
assert len(html) == observed['local_html_bytes'] < 12000
assert hashlib.sha256(html).hexdigest() == observed['local_html_sha256']
assert hashlib.sha256(archive.read_bytes()).hexdigest() == observed['packaging']['sha256']

expected = {'dist', 'dist/index.html', 'dist/.openai', 'dist/.openai/hosting.json'}
with tarfile.open(archive, 'r:gz') as bundle:
    members = bundle.getmembers()
    names = [m.name.rstrip('/') for m in members]
    assert len(names) == len(set(names)) == len(expected)
    assert set(names) == expected == set(observed['packaging']['entries'])
    assert all(m.isfile() or m.isdir() for m in members)
    assert all(0 <= m.size < 12000 for m in members)
    assert bundle.extractfile('dist/index.html').read() == html
    hosting = json.load(bundle.extractfile('dist/.openai/hosting.json'))
    assert hosting == {'static': {'directory': 'dist'}}
assert observed['packaging']['registered_project'] is False

class StaticPage(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.captured = []
        self.current = None
        self.sections = 0
        self.csp = False

    def handle_starttag(self, tag, attrs):
        assert tag in {'html', 'head', 'meta', 'title', 'style', 'body', 'main', 'h1', 'p', 'section', 'h2'}
        attrs = dict(attrs)
        assert not any(k.startswith('on') or k in {'src', 'href'} for k in attrs)
        if tag == 'meta' and attrs.get('http-equiv') == 'Content-Security-Policy':
            assert attrs['content'] == "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"
            self.csp = True
        if tag == 'section': self.sections += 1
        if tag in {'title', 'h1', 'h2', 'p'}:
            assert self.current is None
            self.current = [tag, '']
        if tag != 'meta': self.stack.append(tag)

    def handle_endtag(self, tag):
        assert self.stack and self.stack.pop() == tag
        if self.current and self.current[0] == tag:
            self.captured.append(tuple(self.current))
            self.current = None

    def handle_data(self, data):
        if self.current: self.current[1] += data

page = StaticPage()
page.feed(html.decode('utf-8'))
page.close()
assert page.csp and not page.stack and page.current is None
assert page.sections == len(brief['sections'])
content = [('title', brief['title']), ('h1', brief['title']), ('p', brief['summary'])]
for section in brief['sections']:
    content.extend([('h2', section['heading']), ('p', section['body'])])
assert page.captured == content
print(json.dumps({'status': 'passed', 'archive_allowlist': 'exact', 'archive_extracted': False,
                  'artifact_digests': 'matched', 'rendered_content': 'matches brief',
                  'publication': 'not tested', 'model_requests': 0}, indent=2))
