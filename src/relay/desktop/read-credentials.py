"""Fixed, bounded credential sources read only through the host's private Docker pipe."""
import json, os, pathlib, stat
root = pathlib.Path('/home/operator')
files = []
for source, relative in [('codex', '.codex/auth.json'), ('manual', '.config/galx-relay/config.json')]:
    path = root / relative
    modified_at = 9007199254740991
    try:
        modified_at = path.lstat().st_mtime_ns // 1000000
        if not path.resolve().is_relative_to(root): raise ValueError('Invalid source')
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
        try:
            before = os.fstat(fd)
            if not stat.S_ISREG(before.st_mode) or before.st_uid != 1000 or before.st_size > 131072: raise ValueError('Invalid source')
            with os.fdopen(fd, 'rb', closefd=False) as stream: raw = stream.read(131073)
            after = os.fstat(fd)
            if len(raw) > 131072 or (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns): raise ValueError('Source changed')
            files.append({'source': source, 'modifiedAt': after.st_mtime_ns // 1000000, 'data': json.loads(raw)})
        finally:
            os.close(fd)
    except FileNotFoundError:
        pass
    except (OSError, ValueError, UnicodeError):
        # A malformed newer file must never fall back to an older saved credential.
        files.append({'source': source, 'modifiedAt': modified_at, 'data': None})
print(json.dumps(files))
