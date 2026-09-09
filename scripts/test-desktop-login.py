"""Exercise the terminal login wrapper with an isolated HOME and synthetic CLI."""
import json, os, pathlib, pty, select, signal, subprocess, tempfile, time, unittest

HELPER = pathlib.Path(__file__).resolve().parents[1] / 'src/relay/desktop/galx-relay'

class LoginTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix='galx-login-test-')
        self.home = pathlib.Path(self.directory.name)
        binary = self.home / 'codex'
        binary.write_text('''#!/usr/bin/python3
import json, os, pathlib, sys
p = pathlib.Path(os.environ['CODEX_HOME'])
if not p.is_dir(): sys.exit('The configured login home must exist before invoking the CLI')
(p / 'invocation.json').write_text(json.dumps(sys.argv[1:]))
input('FIXTURE_WAIT\\n')
(p / 'auth.json').write_text('{"fixture":true}')
''')
        binary.chmod(0o700)
        self.env = dict(os.environ, HOME=str(self.home), PATH=str(self.home) + ':' + os.environ['PATH'], CODEX_HOME='/unused-custom-home')
        self.children = []

    def tearDown(self):
        for process, fd in self.children:
            if process.poll() is None: os.killpg(process.pid, signal.SIGTERM)
            process.wait(timeout=5)
            os.close(fd)
        self.directory.cleanup()

    def login(self):
        master, slave = pty.openpty()
        process = subprocess.Popen(['python3', str(HELPER), 'login'], env=self.env, stdin=slave, stdout=slave, stderr=slave, start_new_session=True)
        os.close(slave); self.children.append((process, master))
        return process, master

    def until(self, fd, expected):
        output = b''; deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            if select.select([fd], [], [], .1)[0]:
                try: output += os.read(fd, 8192)
                except OSError: break
                if expected.encode() in output: return output
        self.fail('Expected terminal state was not observed: ' + expected)

    def test_success_uses_fixed_file_store_and_closes_on_enter(self):
        process, fd = self.login(); self.until(fd, 'FIXTURE_WAIT')
        self.assertEqual(json.loads((self.home / '.codex/invocation.json').read_text()), ['-c', 'cli_auth_credentials_store="file"', 'login'])
        self.assertEqual((self.home / '.codex').stat().st_mode & 0o777, 0o700)
        os.write(fd, b'\n'); self.until(fd, 'Press Enter to close')
        self.assertTrue((self.home / '.codex/auth.json').exists())
        os.write(fd, b'\n'); self.assertEqual(process.wait(timeout=5), 0)

    def test_cancel_and_duplicate_login_do_not_block_status_or_leave_saved_login(self):
        process, fd = self.login(); self.until(fd, 'FIXTURE_WAIT')
        duplicate, duplicate_fd = self.login(); self.until(duplicate_fd, 'already running')
        self.assertEqual(duplicate.wait(timeout=5), 1)
        status = subprocess.run(['python3', str(HELPER), 'status'], env=self.env, capture_output=True, timeout=5)
        self.assertEqual(status.returncode, 0)
        os.killpg(process.pid, signal.SIGINT); self.until(fd, 'Press Enter to close')
        self.assertFalse((self.home / '.codex/auth.json').exists())
        os.write(fd, b'\n'); self.assertEqual(process.wait(timeout=5), 0)
        retry, retry_fd = self.login(); self.until(retry_fd, 'FIXTURE_WAIT')
        os.killpg(retry.pid, signal.SIGINT); self.until(retry_fd, 'Press Enter to close')
        os.write(retry_fd, b'\x04'); self.assertEqual(retry.wait(timeout=5), 0)

    def test_login_requires_terminal(self):
        result = subprocess.run(['python3', str(HELPER), 'login'], env=self.env, capture_output=True, timeout=5)
        self.assertEqual(result.returncode, 1)
        self.assertFalse((self.home / '.codex/auth.json').exists())

if __name__ == '__main__': unittest.main()
