"""Bounded reads relative to the guest home, with no symlinks at any component."""
import json, os, pathlib, stat, uuid

def read_private(root, relative, owner=None):
    owner = os.getuid() if owner is None else owner
    parts = relative.split('/')
    if not relative or len(relative) > 1024 or len(parts) > 16 or any(p in ('', '.', '..') for p in parts):
        raise ValueError('Invalid source')
    directory = os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        for part in parts[:-1]:
            child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=directory)
            os.close(directory); directory = child
            if os.fstat(directory).st_uid != owner: raise ValueError('Invalid owner')
        fd = os.open(parts[-1], os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory)
        try:
            before = os.fstat(fd)
            if not stat.S_ISREG(before.st_mode) or before.st_uid != owner or before.st_size > 131072:
                raise ValueError('Invalid source')
            raw = os.read(fd, 131073)
            after = os.fstat(fd)
            if len(raw) > 131072 or (before.st_size, before.st_mtime_ns, before.st_ctime_ns) != (after.st_size, after.st_mtime_ns, after.st_ctime_ns):
                raise ValueError('Source changed')
            return raw, after.st_mtime_ns // 1000000
        finally: os.close(fd)
    finally: os.close(directory)

def selected_home(root):
    try:
        raw, _ = read_private(root, '.config/galx-relay/credential-source.json')
        value = json.loads(raw)
        if not isinstance(value, dict) or set(value) != {'codexHome'} or not isinstance(value['codexHome'], str):
            raise ValueError('Invalid selection')
        home = value['codexHome']
        if len(home) > 1000 or any(part in ('', '.', '..') for part in home.split('/')): raise ValueError('Invalid selection')
        return home
    except FileNotFoundError: return '.codex'

def save_private(file, value):
    file = pathlib.Path(file)
    temporary = file.with_name(file.name + '.' + uuid.uuid4().hex + '.tmp')
    try:
        fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        with os.fdopen(fd, 'w') as stream:
            json.dump(value, stream); stream.flush(); os.fsync(stream.fileno())
        os.replace(temporary, file)
        directory = os.open(file.parent, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        try: os.fsync(directory)
        finally: os.close(directory)
    finally:
        try: temporary.unlink()
        except FileNotFoundError: pass
