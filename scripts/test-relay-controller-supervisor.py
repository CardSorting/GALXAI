"""Disposable real-process drills: python3 scripts/test-relay-controller-supervisor.py.
Never contacts Docker, registry, providers, or production state.
"""
import json
import os
import pathlib
import shutil
import signal
import subprocess
import tempfile
import time
import unittest

SCRIPT = pathlib.Path(__file__).with_name('relay-controller-supervisor.py').resolve()
NODE = shutil.which('node')
FIXTURE = r'''
const fs = require('node:fs');
const fd = Number(process.env.GALX_CONTROLLER_PROGRESS_FD);
const stageStartedAt = Date.now();
const life = process.env.FIXTURE_LIFE_FILE;
const beat = () => { try { fs.writeSync(fd, JSON.stringify({event:'heartbeat',stage:process.env.FIXTURE_STAGE || 'idle',stageStartedAt})+'\n'); if(life) fs.writeFileSync(life,String(Date.now())); } catch { process.exit(1); } };
beat();
if(process.env.FIXTURE_OPERATION === '1') fs.writeSync(fd, JSON.stringify({event:'operation_start',id:'outstanding-op',stage:'docker_ps',timeoutMs:5000})+'\n');
if(process.env.FIXTURE_CLEANUP_UNPROVEN === '1') fs.writeSync(fd, JSON.stringify({event:'command_cleanup_unproven'})+'\n');
if(process.env.FIXTURE_OPERATION_STALL === '1') { fs.writeSync(fd, JSON.stringify({event:'operation_start',id:'docker-run-fixture',stage:'docker_run',timeoutMs:1000})+'\n'); while(true) {} }
if(process.env.FIXTURE_HANG === '1') while(true) {}
setInterval(beat, 50);
'''

class GuardianDrills(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='galx-guardian-')
        self.directory = pathlib.Path(self.tmp.name)
        self.children = []
        self.logs = []

    def tearDown(self):
        for p, log in self.children:
            if p.poll() is None:
                p.terminate()
                try: p.wait(timeout=3)
                except subprocess.TimeoutExpired: p.kill(); p.wait()
            log.close()
        result = self._outcome.result
        if any(test is self for test, _ in result.failures + result.errors):
            retained = pathlib.Path(tempfile.gettempdir()) / f'galx-guardian-failure-{time.time_ns()}'
            shutil.copytree(self.directory, retained)
            print(f'Failure trace retained: {retained}', flush=True)
        self.tmp.cleanup()

    def start(self, **extra):
        env = dict(os.environ, RELAY_HEARTBEAT_SECONDS='0.5', RELAY_PROGRESS_SECONDS='0.7',
                   RELAY_OWNERSHIP_WAIT_SECONDS='0.2', RELAY_SHUTDOWN_SECONDS='0.2', RELAY_TERMINATION_SECONDS='0.5')
        env.update(extra)
        logpath = self.directory / f'log-{len(self.children)}'
        log = logpath.open('w')
        p = subprocess.Popen([os.sys.executable, str(SCRIPT), str(self.directory / 'state'), '--', NODE, '-e', FIXTURE],
                             env=env, stdout=log, stderr=subprocess.STDOUT)
        self.children.append((p, log)); self.logs.append(logpath)
        return p, logpath

    def events(self, log):
        return [json.loads(line) for line in log.read_text().splitlines() if line.startswith('{')]

    def event(self, log, code, timeout=3):
        end=time.monotonic()+timeout
        while time.monotonic()<end:
            found=[v for v in self.events(log) if v['code']==code]
            if found: return found[-1]
            time.sleep(0.01)
        self.fail(f'Missing {code}: {log.read_text()}')

    def test_killed_child_recovers_without_lock_deletion_repeated(self):
        samples=[]
        for _ in range(3):
            p, log=self.start(); owner=self.event(log,'authority_established')
            t=time.monotonic(); os.kill(owner['pid'],signal.SIGKILL); p.wait(timeout=3)
            self.event(log,'authority_ended')
            q,qlog=self.start(); self.event(qlog,'authority_established'); samples.append(round(time.monotonic()-t,3))
            q.terminate(); q.wait(timeout=3)
            # Fixture repetitions are explicit operator starts, not a production restart storm.
            (self.directory/'state'/'supervisor-attempts.json').write_text('[]')
        print(json.dumps({'drill':'child_SIGKILL_to_replacement_authority','repetitions':3,'seconds':samples,'serviceReadyMeasured':False}),flush=True)

    def test_simultaneous_starters_only_one_authority(self):
        p,a=self.start(); q,b=self.start()
        end=time.monotonic()+2
        while time.monotonic()<end and p.poll() is None and q.poll() is None:time.sleep(0.01)
        events=self.events(a)+self.events(b)
        self.assertEqual(sum(e['code']=='authority_established' for e in events),1)
        self.assertEqual(sum(e['code']=='ownership_wait_exceeded' for e in events),1)

    def test_event_loop_stall_is_terminated_before_replacement(self):
        p,log=self.start(FIXTURE_HANG='1'); self.event(log,'event_loop_stalled');p.wait(timeout=3)
        self.event(log,'authority_ended');q,ql=self.start();self.event(ql,'authority_established')

    def test_guardian_death_keeps_authority_fenced_until_controller_exits(self):
        life=self.directory/'controller-life';p,log=self.start(FIXTURE_LIFE_FILE=str(life));owner=self.event(log,'authority_established')['pid']
        time.sleep(0.15);before=life.read_text()
        os.kill(p.pid, signal.SIGKILL);p.wait(timeout=2)
        # The controller inherited the guard descriptor. A replacement may not
        # take authority merely because the guardian disappeared. It remains
        # alive briefly, then the closed progress pipe makes it retire itself.
        os.kill(owner, 0)
        end=time.monotonic()+3;last=life.read_text();stable_since=None
        while time.monotonic()<end:
            current=life.read_text() if life.exists() else last
            if current != last: last=current;stable_since=None
            elif stable_since is None: stable_since=time.monotonic()
            elif time.monotonic()-stable_since >= 0.2: break
            time.sleep(0.05)
        else: self.fail('controller kept writing after guardian death')
        q,ql=self.start();self.event(ql,'authority_established');q.terminate();q.wait(timeout=3)

    def test_outstanding_docker_operation_is_reported_before_controller_fencing(self):
        p,log=self.start(FIXTURE_OPERATION_STALL='1');event=self.event(log,'event_loop_stalled');p.wait(timeout=3)
        self.assertEqual(event['operations'], [{'stage':'docker_run','deadlineMs':1000}])
        self.event(log,'authority_ended')

    def test_duplicate_guardian_cannot_take_over_outstanding_operation(self):
        # Keep the operation outstanding while the original guardian is alive.
        # A contender must fail closed; handover is only possible after the
        # original guardian has ended the controller and its process group.
        p,log=self.start(FIXTURE_OPERATION='1');self.event(log,'authority_established')
        q,ql=self.start();self.event(ql,'ownership_wait_exceeded');q.wait(timeout=2)
        self.assertFalse(any(e['code']=='authority_established' for e in self.events(ql)))
        p.terminate();p.wait(timeout=3);self.event(log,'authority_ended')
        r,rl=self.start();self.event(rl,'authority_established');r.terminate();r.wait(timeout=3)

    def test_live_but_stalled_reconciliation_is_distinct(self):
        p,log=self.start(FIXTURE_STAGE='reconcile');self.event(log,'controller_progress_stalled');p.wait(timeout=3)
        self.assertFalse(any(e['code']=='event_loop_stalled' for e in self.events(log)))

    def test_quiet_workload_does_not_trigger_restart(self):
        p,log=self.start();self.event(log,'authority_established');time.sleep(1.1)
        self.assertIsNone(p.poll());self.assertFalse(any('stalled' in e['code'] for e in self.events(log)))

    def test_paused_owner_refuses_contender_then_ends_before_handover(self):
        p,log=self.start(RELAY_HEARTBEAT_SECONDS='2', RELAY_PROGRESS_SECONDS='10');owner=self.event(log,'authority_established');os.kill(owner['pid'],signal.SIGSTOP)
        q,ql=self.start();self.event(ql,'ownership_wait_exceeded');q.wait(timeout=2)
        self.event(log,'event_loop_stalled');p.wait(timeout=3);self.event(log,'authority_ended')
        with self.assertRaises(ProcessLookupError):os.kill(owner['pid'],signal.SIGCONT)
        r,rl=self.start();self.event(rl,'authority_established')

    def test_supervisor_crash_child_descriptor_preserves_exclusivity(self):
        p,log=self.start();owner=self.event(log,'authority_established');os.kill(owner['pid'],signal.SIGSTOP)
        p.kill();p.wait(timeout=2)
        q,ql=self.start();self.event(ql,'ownership_wait_exceeded');q.wait(timeout=2)
        os.kill(owner['pid'],signal.SIGCONT)
        time.sleep(0.2)
        r,rl=self.start();self.event(rl,'authority_established')

    def test_legacy_and_malformed_markers_fail_closed(self):
        state=self.directory/'state';state.mkdir(mode=0o700)
        for content in ('1234', '{', ''):
            (state/'controller.lock').write_text(content);(state/'controller.lock').chmod(0o600)
            p,log=self.start();p.wait(timeout=2);self.event(log,'legacy_ownership_requires_review')
            self.assertEqual((state/'controller.lock').read_text(),content)
            self.assertFalse(any(e['code']=='authority_established' for e in self.events(log)))

    def test_unproven_command_cleanup_contains_controller_group(self):
        p,log=self.start(FIXTURE_CLEANUP_UNPROVEN='1');self.event(log,'command_cleanup_unproven');p.wait(timeout=3)
        self.event(log,'authority_ended');q,ql=self.start();self.event(ql,'authority_established')

    def test_unavailable_attempt_storage_preserves_ownership_evidence(self):
        state=self.directory/'state';state.mkdir(mode=0o700);(state/'supervisor-attempts.json').mkdir()
        p,log=self.start();self.assertEqual(p.wait(timeout=2),0);self.event(log,'guardian_failed_closed')
        self.assertTrue((state/'controller.lock').exists());self.assertFalse(any(e['code']=='authority_established' for e in self.events(log)))

    def test_symlink_guard_is_refused_without_touching_target(self):
        state=self.directory/'state';state.mkdir(mode=0o700);target=self.directory/'unrelated';target.write_text('preserve')
        (state/'controller.guard').symlink_to(target)
        p,log=self.start();p.wait(timeout=2);self.event(log,'guardian_failed_closed');self.assertEqual(target.read_text(),'preserve')

    def test_restart_budget_stops_failure_storm(self):
        state=self.directory/'state';state.mkdir(mode=0o700);(state/'supervisor-attempts.json').write_text(json.dumps([time.time()]*5));(state/'supervisor-attempts.json').chmod(0o600)
        p,log=self.start();self.assertEqual(p.wait(timeout=2),0);self.event(log,'restart_budget_exhausted')

if __name__ == '__main__': unittest.main(verbosity=2)
