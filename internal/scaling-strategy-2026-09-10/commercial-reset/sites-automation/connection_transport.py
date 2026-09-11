"""Bounded, read-only app-server transport for the Sites connection probe."""
import json
import queue
import threading
import time

MAX_FRAME = 1048576
MAX_TOTAL = 8388608
METHODS = {'initialize', 'skills/list', 'thread/start', 'mcpServerStatus/list', 'mcpServer/tool/call'}

def isolated_environment(source):
    allowed = ('PATH', 'HOME', 'CODEX_HOME', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'LC_ALL',
               'LC_CTYPE', 'SSL_CERT_FILE', 'SSL_CERT_DIR')
    result = {key: source[key] for key in allowed if key in source}
    result['GALX_UNUSED_FIXTURE_KEY'] = 'no-inference-fixture'
    return result

def decode_frame(line):
    if len(line) > MAX_FRAME:
        raise RuntimeError('rpc_frame_too_large')
    value = json.loads(line)
    if not isinstance(value, dict):
        raise RuntimeError('rpc_frame_invalid')
    if 'id' in value and type(value['id']) not in (int, str):
        raise RuntimeError('rpc_id_invalid')
    if 'result' in value and 'error' in value:
        raise RuntimeError('rpc_response_invalid')
    return value

class ReadOnlyRpc:
    def __init__(self, process, request_seconds=30, total_seconds=75):
        self.process = process
        self.queue = queue.Queue(maxsize=128)
        self.failure = None
        self.closed = False
        self.sequence = 0
        self.methods = []
        self.denied_requests = []
        self.request_seconds = request_seconds
        self.deadline = time.monotonic() + total_seconds
        self.total_bytes = 0
        self.largest_frame = 0
        threading.Thread(target=self._reader, daemon=True).start()

    def _reader(self):
        total = 0
        try:
            while True:
                line = self.process.stdout.readline(MAX_FRAME + 1)
                if not line:
                    break
                total += len(line)
                self.total_bytes = total
                self.largest_frame = max(self.largest_frame, len(line))
                if total > MAX_TOTAL:
                    raise RuntimeError('rpc_output_budget_exhausted')
                self.queue.put_nowait(decode_frame(line))
        except Exception as error:
            allowed = {'rpc_frame_too_large', 'rpc_frame_invalid', 'rpc_id_invalid',
                       'rpc_response_invalid', 'rpc_output_budget_exhausted'}
            self.failure = str(error) if str(error) in allowed else 'rpc_stream_invalid'
            self.process.terminate()
        finally:
            self.closed = True

    def send(self, value):
        self.process.stdin.write((json.dumps(value) + '\n').encode('utf-8'))
        self.process.stdin.flush()

    def request(self, method, params):
        if method not in METHODS:
            raise RuntimeError('rpc_method_not_allowed')
        if method == 'mcpServer/tool/call':
            self.authorize_tool(params)
        if time.monotonic() >= self.deadline:
            raise TimeoutError('rpc_timeout')
        self.sequence += 1
        self.methods.append(method)
        self.send({'id': self.sequence, 'method': method, 'params': params})
        deadline = min(self.deadline, time.monotonic() + self.request_seconds)
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError('rpc_timeout')
            if self.failure:
                raise RuntimeError(self.failure)
            if self.closed and self.queue.empty():
                raise RuntimeError('rpc_closed')
            try:
                item = self.queue.get(timeout=min(remaining, 0.1))
            except queue.Empty:
                continue
            if item.get('id') == self.sequence and 'method' not in item:
                if 'error' in item or 'result' not in item:
                    raise RuntimeError('rpc_failed')
                if not isinstance(item['result'], dict):
                    raise RuntimeError('rpc_result_invalid')
                return item['result']
            if 'id' in item and 'method' in item:
                known = {'tool/requestUserInput', 'mcpServer/elicitation/request', 'item/commandExecution/requestApproval',
                         'item/fileChange/requestApproval', 'item/tool/call'}
                if len(self.denied_requests) < 16:
                    self.denied_requests.append(item['method'] if item['method'] in known else 'other')
                self.send({'id': item['id'], 'error': {'code': -32601, 'message': 'Read-only diagnostic grants no approvals'}})

    def authorize_tool(self, params):
        if params.get('server') != 'codex_apps' or params.get('tool') != 'sites.list_sites' or params.get('arguments') != {'limit': 1, 'role': 'owner'}:
            raise RuntimeError('rpc_tool_not_allowed')
