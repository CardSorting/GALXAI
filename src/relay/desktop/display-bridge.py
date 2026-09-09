"""Fixed local display transport. No caller-selected address or command."""
import os, select, socket, sys
try:
    with socket.create_connection(('127.0.0.1', 5900), timeout=5) as display:
        display.settimeout(None)
        while True:
            readable, _, _ = select.select([display, sys.stdin.buffer], [], [])
            if display in readable:
                data = display.recv(65536)
                if not data: break
                sys.stdout.buffer.write(data)
                sys.stdout.buffer.flush()
            if sys.stdin.buffer in readable:
                data = os.read(sys.stdin.fileno(), 65536)
                if not data: break
                display.sendall(data)
except (OSError, BrokenPipeError):
    sys.exit(1)
