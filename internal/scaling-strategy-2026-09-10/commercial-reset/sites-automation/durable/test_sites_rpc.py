import importlib.util
from pathlib import Path
import unittest
import hashlib
import json
import tempfile

spec = importlib.util.spec_from_file_location('sites_rpc', Path(__file__).with_name('sites-rpc.py'))
rpc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rpc)

class SitesRpcTests(unittest.TestCase):
    def test_custom_domains_are_scoped_and_projected_without_worker_diagnostics(self):
        command = {'tool': 'sites.add_custom_domain', 'arguments': {'project_id': 'p', 'hostname': 'my-app.alice.galx.ai'}}
        self.assertEqual(rpc.validate_command(command), command)
        for hostname in ('galx.ai', '*.galx.ai', 'app.alice.galx.ai.evil.test', 'https://app.alice.galx.ai'):
            with self.assertRaises(RuntimeError):
                rpc.validate_command({**command, 'arguments': {'project_id': 'p', 'hostname': hostname}})
        result = rpc.project('sites.list_custom_domains', {'items': [{'id': 'd', 'hostname': 'app.alice.galx.ai',
            'worker_name': 'private-worker', 'last_error': 'private-token', 'validation_records': []}]})
        self.assertEqual(result['items'][0]['id'], 'd')
        self.assertNotIn('private', str(result))

    def test_only_exact_scoped_operations(self):
        for tool in ('sites.create_site', 'sites.update_site_access', 'sites.deploy_site_version', 'shell', 'turn/start'):
            with self.assertRaises(RuntimeError):
                rpc.validate_command({'tool': tool, 'arguments': {'project_id': 'p'}})
        for args in ({'project_id': 'p', 'version_id': 'v', 'public': True}, {'project_id': 'p'}, {'project_id': '', 'version_id': 'v'}):
            with self.assertRaises(RuntimeError):
                rpc.validate_command({'tool': 'sites.deploy_private_site_version', 'arguments': args})

    def test_transport_cannot_expand_scope_or_repeat_mutation(self):
        instance = object.__new__(rpc.ScopedRpc)
        instance.command = {'tool': 'sites.deploy_private_site_version', 'arguments': {'project_id': 'p', 'version_id': 'v'}}
        instance.called = False
        params = {'server': 'codex_apps', **instance.command}
        with self.assertRaises(RuntimeError):
            instance.authorize_tool({**params, 'arguments': {'project_id': 'other', 'version_id': 'v'}})
        instance.authorize_tool(params)
        with self.assertRaises(RuntimeError):
            instance.authorize_tool(params)

    def test_structured_response_and_text_envelopes(self):
        self.assertEqual(rpc.unwrap({'result': {'structuredContent': {'id': 'p'}, 'isError': False}}), {'id': 'p'})
        self.assertEqual(rpc.unwrap({'content': [{'type': 'text', 'text': '{"id":"p"}'}]}), {'id': 'p'})
        with self.assertRaises(RuntimeError):
            rpc.unwrap({'isError': True, 'structuredContent': {'id': 'p'}})

    def test_tokens_and_personal_details_are_not_forwarded(self):
        result = rpc.project('sites.get_site', {'id': 'p', 'source_repository_credential': {'token': 'secret'},
            'siwc_bypass_bearer_token': 'secret', 'description': 'private',
            'access_policy': {'allowed_users': [{'account_user_id': 'a', 'email': 'private@example.com'}]}})
        self.assertNotIn('secret', str(result))
        self.assertNotIn('private', str(result))

    def test_inventory_probe_discards_site_records(self):
        self.assertEqual(rpc.project('sites.list_sites', {'items': [{'id': 'private-site'}], 'cursor': None}),
                         {'owned_site_count_on_page': 1, 'has_more': False})

    def test_credential_reply_never_emits_token(self):
        self.assertEqual(rpc.project('sites.create_source_repository_write_credential', {'token': 'secret'}), {'credential_available': True})
        with self.assertRaises(RuntimeError):
            rpc.validate_command({'tool': 'sites.create_source_repository_write_credential',
                                  'arguments': {'project_id': 'p', 'publish_on_push': 'private'}})

    def test_compound_version_ids_are_preserved(self):
        command = {'tool': 'sites.get_site_version', 'arguments': {'project_id': 'p', 'version_id': 'p~v'}}
        self.assertEqual(rpc.validate_command(command), command)

    def test_reviewed_local_helpers_do_not_depend_on_skill_listing(self):
        with tempfile.TemporaryDirectory() as home:
            root = Path(home)/'.codex/plugins/cache/openai-bundled/sites/1'
            (root/'.codex-plugin').mkdir(parents=True)
            body = json.dumps({'name': 'sites', 'version': '1'}).encode()
            (root/'.codex-plugin/plugin.json').write_bytes(body)
            contract = {'plugin_version': '1', 'file_sha256': {'.codex-plugin/plugin.json': hashlib.sha256(body).hexdigest()}}
            self.assertEqual(rpc.reviewed_plugin({'data': []}, home, contract), root)
            self.assertEqual(rpc.reviewed_plugin({'data': []}, '/wrong-home', contract, codex_home=Path(home)/'.codex'), root)
            (root/'.codex-plugin/plugin.json').write_text('{}')
            with self.assertRaises((RuntimeError, KeyError)):
                rpc.reviewed_plugin({'data': []}, home, contract)

    def test_runtime_tools_are_checked_separately_and_scoped_to_the_server(self):
        class Runtime:
            def __init__(self, pages): self.pages = pages; self.calls = 0
            def request(self, method, args):
                assert method == 'mcpServerStatus/list'
                self.calls += 1
                return self.pages[min(self.calls-1, len(self.pages)-1)]
        present = Runtime([{'data': [], 'nextCursor': 'next'}, {'data': [{'name': 'codex_apps', 'tools': {'sites.list_sites': {}}}]}])
        rpc.require_runtime_tool(present, 'thread', 'sites.list_sites')
        self.assertEqual(present.calls, 2)
        for page in [{'data': [{'name': 'untrusted', 'tools': {'sites.list_sites': {}}}]}, {'data': [], 'nextCursor': 'loop'}]:
            missing = Runtime([page])
            with self.assertRaisesRegex(RuntimeError, 'sites_unavailable'):
                rpc.require_runtime_tool(missing, 'thread', 'sites.list_sites')
            self.assertLessEqual(missing.calls, 2)

    def test_archive_and_source_receipts_discard_extra_fields(self):
        value = rpc.project('sites.save_site_version', {'id': 'v', 'source': {'commit_sha': 'sha', 'token': 'secret'},
            'archive_storage': {'content_hash': 'hash', 'archive_format': 'tar', 'size_bytes': 100, 'sediment_file_id': 'private', 'token': 'secret'}})
        self.assertNotIn('secret', str(value)); self.assertNotIn('private', str(value))

    def test_error_diagnostics_cannot_copy_provider_text(self):
        with self.assertRaises(rpc.SitesCallError) as caught:
            rpc.unwrap({'isError': True, 'content': [{'type': 'text', 'text':
                'Invalid archive file URI, status 400, Bearer private-secret https://secret.example/secret'}]})
        diagnostic = caught.exception.diagnostic
        self.assertEqual(diagnostic['statuses'], ['400'])
        self.assertIn('archive', diagnostic['keywords'])
        self.assertNotIn('secret', json.dumps(diagnostic))
        self.assertEqual(str(caught.exception), 'sites_call_failed')

    def test_only_validated_local_files_are_allowed_and_paths_are_not_reinterpreted(self):
        with tempfile.TemporaryDirectory() as root:
            archive = Path(root)/'archive with % and é.tar.gz'; archive.write_bytes(b'fixture')
            command = rpc.validate_command({'tool': 'sites.save_site_version', 'arguments': {
                'project_id': 'p', 'commit_sha': 'a'*40, 'archive': str(archive)}})
            args = rpc.wire_arguments(command)
            self.assertEqual(args['archive'], str(archive))
            self.assertEqual(command['arguments']['archive'], str(archive))
            scoped = object.__new__(rpc.ScopedRpc); scoped.command = command; scoped.called = False
            with self.assertRaises(RuntimeError):
                scoped.authorize_tool({'server': 'codex_apps', 'tool': command['tool'], 'arguments': {**args, 'archive': archive.as_uri()}})
            scoped.authorize_tool({'server': 'codex_apps', 'tool': command['tool'], 'arguments': args})
            with self.assertRaises(RuntimeError):
                scoped.authorize_tool({'server': 'codex_apps', 'tool': command['tool'], 'arguments': args})
            for value in [archive.as_uri(), 'https://example.com/package.tar.gz', 'relative.tar.gz']:
                with self.assertRaises(RuntimeError):
                    rpc.validate_command({'tool': command['tool'], 'arguments': {**command['arguments'], 'archive': value}})

    def test_schema_path_is_not_misclassified_as_a_filesystem_failure(self):
        error = rpc.SitesCallError({'isError': True, 'error': {
            'path': ['archive'], 'message': "Expected type ['object'], got string /private/customer-secret"}})
        self.assertEqual(error.diagnostic['category'], 'archive_argument_type_mismatch')
        self.assertEqual(error.diagnostic['expectedTypes'], ['object'])
        self.assertNotIn('customer-secret', json.dumps(error.diagnostic))

if __name__ == '__main__':
    unittest.main()
