import io
import json
import unittest
from connection_transport import decode_frame, isolated_environment, MAX_FRAME, ReadOnlyRpc

class FakeProcess:
    def __init__(self, output=b''):
        self.stdout = io.BytesIO(output)
        self.stdin = io.BytesIO()
        self.terminated = False
    def terminate(self): self.terminated = True

class ConnectionTests(unittest.TestCase):
    def test_environment_does_not_forward_model_or_application_credentials(self):
        source = {'PATH': '/safe/bin', 'HOME': '/safe/home', 'VM_RELAY_API_KEY': 'secret',
                  'OPENAI_API_KEY': 'secret', 'SUPABASE_SERVICE_ROLE_KEY': 'secret',
                  'NODE_OPTIONS': '--import evil', 'PYTHONPATH': '/evil'}
        actual = isolated_environment(source)
        self.assertEqual(set(actual), {'PATH', 'HOME', 'GALX_UNUSED_FIXTURE_KEY'})
        self.assertNotIn('secret', json.dumps(actual))

    def test_frames_are_bounded_and_ids_and_responses_are_unambiguous(self):
        for invalid in (b'x' * (MAX_FRAME + 1), b'[]', b'broken',
                        b'{"id":true,"result":{}}', b'{"id":1,"error":{},"result":{}}'):
            with self.assertRaises(Exception): decode_frame(invalid)

    def test_exact_read_method_and_arguments_are_required(self):
        rpc = ReadOnlyRpc(FakeProcess())
        for method, params in [('turn/start', {}), ('mcpServer/tool/call', {'server': 'codex_apps', 'tool': 'sites.create_site'}),
                               ('mcpServer/tool/call', {'server': 'codex_apps', 'tool': 'sites.list_sites', 'arguments': {'limit': 100}})]:
            with self.assertRaises(RuntimeError): rpc.request(method, params)
        self.assertEqual(rpc.methods, [])

    def test_a_valid_response_survives_eof(self):
        rpc = ReadOnlyRpc(FakeProcess(b'{"id":1,"result":{"ok":true}}\n'))
        self.assertEqual(rpc.request('initialize', {}), {'ok': True})

    def test_approvals_are_explicitly_denied_before_read_response(self):
        process = FakeProcess(b'{"id":"approval","method":"tool/requestUserInput","params":{}}\n{"id":1,"result":{}}\n')
        rpc = ReadOnlyRpc(process)
        self.assertEqual(rpc.request('initialize', {}), {})
        outgoing = [json.loads(line) for line in process.stdin.getvalue().splitlines()]
        self.assertEqual(outgoing[1]['error']['code'], -32601)
        self.assertNotIn('accept', json.dumps(outgoing))
        self.assertEqual(rpc.denied_requests, ['tool/requestUserInput'])

    def test_global_deadline_prevents_an_unbounded_session(self):
        process = FakeProcess()
        rpc = ReadOnlyRpc(process, total_seconds=0)
        with self.assertRaises(TimeoutError): rpc.request('initialize', {})
        self.assertEqual(process.stdin.getvalue(), b'')

if __name__ == '__main__': unittest.main()
