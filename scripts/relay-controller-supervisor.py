#!/usr/bin/env python3
"""Local flock guardian. Never deletes ownership evidence or restarts a child."""
import ctypes
import fcntl
import json
import os
import selectors
import signal
import stat
import subprocess
import sys
import time


def emit(code, **fields):
    print(json.dumps(dict(component='federation_guardian', code=code, at=time.time(), **fields)), flush=True)


def budget(name, default):
    value = float(os.environ.get(name, default))
    if not 0.1 <= value <= 3600:
        raise ValueError('Invalid guardian deadline')
    return value


def group_exists(pid):
    try:
        os.killpg(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True  # uncertainty is not proof of death


def child_exited_without_reaping(pid):
    result = os.waitid(os.P_PID, pid, os.WEXITED | os.WNOHANG | os.WNOWAIT)
    # Darwin can report CLD_STOPPED despite WEXITED. A paused owner is still alive.
    return result is not None and result.si_code in (os.CLD_EXITED, os.CLD_KILLED, os.CLD_DUMPED)


def verify_local_filesystem(directory):
    libc = ctypes.CDLL(None, use_errno=True)
    if sys.platform == 'darwin':
        class StatFS(ctypes.Structure):
            _fields_ = [('bsize', ctypes.c_uint32), ('iosize', ctypes.c_int32),
                        ('blocks', ctypes.c_uint64), ('bfree', ctypes.c_uint64), ('bavail', ctypes.c_uint64),
                        ('files', ctypes.c_uint64), ('ffree', ctypes.c_uint64), ('fsid', ctypes.c_int32 * 2),
                        ('owner', ctypes.c_uint32), ('type', ctypes.c_uint32), ('flags', ctypes.c_uint32),
                        ('subtype', ctypes.c_uint32), ('fstype', ctypes.c_char * 16), ('rest', ctypes.c_byte * 4096)]
        info = StatFS()
        if libc.statfs(os.fsencode(directory), ctypes.byref(info)) != 0:
            raise OSError(ctypes.get_errno(), 'statfs unavailable')
        if bytes(info.fstype) not in (b'apfs', b'hfs'):
            raise ValueError('Unsupported ownership filesystem')
    elif sys.platform == 'linux':
        info = ctypes.create_string_buffer(4096)
        if libc.statfs(os.fsencode(directory), info) != 0:
            raise OSError(ctypes.get_errno(), 'statfs unavailable')
        magic = ctypes.cast(info, ctypes.POINTER(ctypes.c_long)).contents.value
        if magic not in (0xEF53, 0x58465342, 0x9123683E, 0x01021994):
            raise ValueError('Unsupported ownership filesystem')
    else:
        raise ValueError('Unsupported ownership platform')


def private_inode(info, directory=False):
    if info.st_uid != os.geteuid() or stat.S_IMODE(info.st_mode) & 0o077:
        raise ValueError('Ownership storage must belong exclusively to the current user')
    if directory:
        if not stat.S_ISDIR(info.st_mode):
            raise ValueError('Ownership directory required')
    elif not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
        raise ValueError('Ownership file must be regular with one link')


def main():
    directory, separator, *command = sys.argv[1:]
    if separator != '--' or not command:
        raise ValueError('Expected state directory -- controller command')
    os.makedirs(directory, mode=0o700, exist_ok=True)
    private_inode(os.lstat(directory), directory=True)
    verify_local_filesystem(directory)
    if os.path.islink(directory):
        raise ValueError('Ownership directory must not be a symlink')
    nofollow = getattr(os, 'O_NOFOLLOW', 0)
    guard = os.open(os.path.join(directory, 'controller.guard'), os.O_RDWR | os.O_CREAT | nofollow, 0o600)
    private_inode(os.fstat(guard))
    waiting = time.monotonic()
    while True:
        try:
            fcntl.flock(guard, fcntl.LOCK_EX | fcntl.LOCK_NB)
            break
        except BlockingIOError:
            if time.monotonic() - waiting >= budget('RELAY_OWNERSHIP_WAIT_SECONDS', 5):
                emit('ownership_wait_exceeded', stage='ownership', action='Inspect existing guardian and inherited holders; do not delete guard')
                return 0  # fail closed; launchd SuccessfulExit=false prevents a lock-contention restart storm
            time.sleep(0.05)
    # Permanent compatibility barrier: old launchers use wx and must refuse us.
    # First creation uses O_EXCL so a simultaneous legacy launcher wins or loses atomically.
    marker = os.path.join(directory, 'controller.lock')
    expected = b'{"format":"galx-local-flock-v1"}\n'
    try:
        fd = os.open(marker, os.O_WRONLY | os.O_CREAT | os.O_EXCL | nofollow, 0o600)
    except FileExistsError:
        fd = os.open(marker, os.O_RDONLY | nofollow)
        try:
            private_inode(os.fstat(fd))
            if os.read(fd, 4096) != expected:
                emit('legacy_ownership_requires_review', stage='ownership', action='Stop and verify all legacy owners, archive legacy marker once; never remove controller.guard')
                return 0
        finally:
            os.close(fd)
    else:
        try:
            if os.write(fd, expected) != len(expected):
                raise OSError('Short ownership marker write')
            os.fsync(fd)
        finally:
            os.close(fd)
        dfd = os.open(directory, os.O_RDONLY)
        try:
            os.fsync(dfd)
        finally:
            os.close(dfd)
    # This local attempt record is not ownership authority. Failure reading/writing it fails closed.
    attempts_path = os.path.join(directory, 'supervisor-attempts.json')
    attempts = []
    try:
        afd = os.open(attempts_path, os.O_RDONLY | nofollow)
    except FileNotFoundError:
        pass
    else:
        private_inode(os.fstat(afd))
        with os.fdopen(afd) as file:
            attempts = json.load(file)
        if not isinstance(attempts, list) or any(type(t) not in (int, float) for t in attempts):
            raise ValueError('Malformed restart history')
    now = time.time()
    attempts = [t for t in attempts if now - t < 600]
    if len(attempts) >= 5:
        emit('restart_budget_exhausted', stage='startup', action='Inspect blocked stage and dependencies; after correction wait 10 minutes and explicitly kickstart service')
        return 0
    attempts.append(now)
    afd = os.open(attempts_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | nofollow, 0o600)
    with os.fdopen(afd, 'w') as file:
        json.dump(attempts, file)
        file.flush()
        os.fsync(file.fileno())
    read_fd, write_fd = os.pipe()
    env = dict(os.environ, GALX_CONTROLLER_GUARD_FD=str(guard), GALX_CONTROLLER_PROGRESS_FD=str(write_fd))
    child = subprocess.Popen(command, env=env, pass_fds=(guard, write_fd), start_new_session=True)
    os.close(write_fd)
    os.set_blocking(read_fd, False)
    selector = selectors.DefaultSelector()
    selector.register(read_fd, selectors.EVENT_READ)
    emit('authority_established', pid=child.pid)
    stopping = [False]
    def stop(_sig, _frame):
        stopping[0] = True
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    last_heartbeat = stage_since = time.monotonic()
    stage = 'startup'
    stage_token = None
    operations = {}
    buffer = b''
    reason = None
    stop_since = None
    try:
        # WNOWAIT reserves the controller PID until group termination is complete.
        while not child_exited_without_reaping(child.pid):
            for _key, _events in selector.select(0.1):
                chunk = os.read(read_fd, 65536)
                if not chunk:
                    reason = 'progress_channel_closed'
                    break
                buffer += chunk
                if len(buffer) > 262144:
                    reason = 'invalid_progress_channel'
                    break
                while b'\n' in buffer:
                    line, buffer = buffer.split(b'\n', 1)
                    event = json.loads(line)
                    if event.get('event') == 'heartbeat' and event.get('stage') in ('startup', 'reconcile', 'idle', 'shutdown', 'stopped'):
                        last_heartbeat = time.monotonic()
                        token = (event['stage'], event.get('stageStartedAt'))
                        if token != stage_token:
                            stage_token = token
                            stage = event['stage']
                            stage_since = last_heartbeat
                    elif event.get('event') in ('operation_start', 'operation_end'):
                        ident = event.get('id')
                        if isinstance(ident, str) and len(ident) <= 64 and event.get('stage') in ('docker_ps', 'docker_inspect', 'docker_run', 'docker_stop', 'docker_rm'):
                            if event['event'] == 'operation_end':
                                operations.pop(ident, None)
                            elif len(operations) < 32:
                                operations[ident] = dict(stage=event['stage'], deadlineMs=event.get('timeoutMs'))
                    elif event.get('event') == 'command_cleanup_unproven':
                        reason = 'command_cleanup_unproven'
            now = time.monotonic()
            if stopping[0] and stop_since is None:
                stop_since = now
                os.killpg(child.pid, signal.SIGTERM)
            if stop_since is not None and now - stop_since > budget('RELAY_SHUTDOWN_SECONDS', 180):
                reason = 'shutdown_deadline_exceeded'
            elif now - last_heartbeat > budget('RELAY_HEARTBEAT_SECONDS', 15):
                reason = 'event_loop_stalled'
            elif stage in ('startup', 'reconcile') and now - stage_since > budget('RELAY_PROGRESS_SECONDS', 300):
                reason = 'controller_progress_stalled'
            if reason:
                emit(reason, stage=stage, operations=list(operations.values()), elapsedSeconds=round(now - stage_since, 3), action='Old authority will be terminated; inspect stage diagnostics before repeated restart')
                break
    finally:
        # All CLI children remain in this group; the unreaped controller reserves its ID.
        # Inherited guard descriptions also block takeover if a descendant escapes.
        try:
            os.killpg(child.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        except PermissionError:
            pass  # Verify after wait: Darwin can deny killpg on an already exited zombie.
        child.wait()
        deadline = time.monotonic() + budget('RELAY_TERMINATION_SECONDS', 5)
        while group_exists(child.pid):
            if time.monotonic() >= deadline:
                emit('termination_unproven', stage=stage, action='Guard retained; inspect process groups; do not force unlock')
                # Bound escalation, retain authority and alert once; supervisor must not restart.
                while True:
                    time.sleep(1)
            time.sleep(0.05)
        os.close(read_fd)
        os.close(guard)
        emit('authority_ended', pid=child.pid)
    return 0 if stopping[0] else (child.returncode if child.returncode and child.returncode > 0 else 1)


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as error:
        emit('guardian_failed_closed', stage='guardian', errorType=type(error).__name__, action='Inspect guardian configuration and private storage; do not remove ownership evidence')
        sys.exit(0)
