"""Actual launcher/controller/server with empty fixture registry and a no-op Docker CLI.
Only loopback disposable state; proves lifecycle recovery and truthful 503 readiness,
NOT required-capability recovery or provider execution. No production env file loaded.
"""
import json
import os
import pathlib
import shutil
import signal
import socket
import subprocess
import tempfile
import time
import urllib.request
import urllib.error
import unittest

ROOT=pathlib.Path(__file__).resolve().parent.parent
class LauncherDrill(unittest.TestCase):
    def test_actual_launcher_kill_and_event_loop_hang(self):
        with tempfile.TemporaryDirectory(prefix='galx-launcher-') as directory:
            tmp=pathlib.Path(directory); (tmp/'node_modules').symlink_to(ROOT/'node_modules', target_is_directory=True)
            registry=tmp/'registry.mjs'
            registry.write_text('export async function readShardRegistry(){return []}; export function decryptRegistryShard(){throw Error("no fixture shards")}; export function configureRegistryEgressGuard(){}; export function getRegistryEgressSnapshot(){return {}}; export function encryptRegistryShard(){throw Error("fixture mutation forbidden")}; export function replaceRegistryCredential(){throw Error("fixture mutation forbidden")}; export function registryConfig(){return null};')
            (tmp/'loader.mjs').write_text('export async function resolve(s,c,n){if(s.endsWith("/shard-registry.js"))return {url:'+json.dumps(registry.as_uri())+',shortCircuit:true};return n(s,c)}')
            (tmp/'register.mjs').write_text('import{registerHooks}from"node:module";registerHooks({resolve(s,c,n){if(s.endsWith("/shard-registry.js")||s.endsWith("/shard-registry.ts"))return {url:'+json.dumps(registry.as_uri())+',shortCircuit:true};return n(s,c)}});if(process.argv[1]?.endsWith("relay-federation-controller.ts"))process.on("SIGUSR1",()=>{while(true){}});')
            binary=tmp/'bin';binary.mkdir();docker=binary/'docker';docker.write_text('#!/bin/sh\ncase "$1" in ps) exit 0;; *) exit 90;; esac\n');docker.chmod(0o700)
            with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
            # Allowlist environment: never inherit production registry keys or provider credentials.
            env={'PATH':str(binary)+':'+os.environ['PATH'],'HOME':str(tmp),'NODE_OPTIONS':'--import='+str(tmp/'register.mjs'),
                 'RELAY_FEDERATION_NAMESPACE':'process-fixture','RELAY_FEDERATION_PORT':str(port),
                 'RELAY_API_KEYS':'fixture-only-key','RELAY_ADMIN_API_KEYS':'fixture-only-admin',
                 'RELAY_HEARTBEAT_SECONDS':'2','RELAY_PROGRESS_SECONDS':'10','RELAY_SHUTDOWN_SECONDS':'1'}
            children=[]
            def start():
                logpath=tmp/f'launcher-{len(children)}.log';log=logpath.open('w')
                p=subprocess.Popen([shutil.which('node'),'--import','tsx',str(ROOT/'scripts/run-relay-federation.ts')],cwd=tmp,env=env,stdout=log,stderr=subprocess.STDOUT)
                children.append((p,log,logpath));return p,logpath
            def waitfor(log, predicate, timeout=10):
                end=time.monotonic()+timeout
                while time.monotonic()<end:
                    lines=log.read_text().splitlines()
                    for line in lines:
                        if predicate(line):return line
                    time.sleep(.02)
                self.fail(log.read_text())
            def health():
                with urllib.request.urlopen(f'http://127.0.0.1:{port}/health',timeout=1) as r:self.assertEqual(r.status,200)
                req=urllib.request.Request(f'http://127.0.0.1:{port}/health/ready',headers={'Authorization':'Bearer fixture-only-admin'})
                with self.assertRaises(urllib.error.HTTPError) as e:urllib.request.urlopen(req,timeout=1)
                self.assertEqual(e.exception.code,503);e.exception.close()
            try:
                p,log=start();line=waitfor(log,lambda l:'"authority_established"' in l);owner=json.loads(line)['pid']
                waitfor(log,lambda l:'listening on loopback' in l);health()
                began=time.monotonic();os.kill(owner,signal.SIGKILL);p.wait(timeout=5)
                q,ql=start();waitfor(ql,lambda l:'listening on loopback' in l);health();crash=time.monotonic()-began
                owner=json.loads(waitfor(ql,lambda l:'"authority_established"' in l))['pid']
                began=time.monotonic();os.kill(owner,signal.SIGUSR1);waitfor(ql,lambda l:'"event_loop_stalled"' in l);q.wait(timeout=8)
                r,rl=start();waitfor(rl,lambda l:'listening on loopback' in l);health();hang=time.monotonic()-began
                print(json.dumps({'drill':'actual_launcher_empty_registry','crashToHealthSeconds':round(crash,3),'hangToHealthSeconds':round(hang,3),'requiredCapabilityReady':False,'readyStatus':503,'realWorkerExecution':False}),flush=True)
            finally:
                for p,log,_ in children:
                    if p.poll() is None:
                        p.terminate()
                        try:p.wait(timeout=5)
                        except subprocess.TimeoutExpired:p.kill();p.wait()
                    log.close()

if __name__=='__main__':unittest.main(verbosity=2)
