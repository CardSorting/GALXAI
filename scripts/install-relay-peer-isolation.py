#!/usr/bin/env python3
"""Install a dedicated, persistent nftables peer-denial ruleset on a pool host.
Usage (root, Linux): install-relay-peer-isolation.py PEER_IP [PEER_IP ...]
Supply every public/private IPv4/IPv6 address of the other execution host.
No existing firewall tables are flushed. The first installation is atomic;
an existing table must be inspected instead of silently replaced.
"""
import ipaddress
import os
import pathlib
import subprocess
import sys
import shutil

if os.geteuid() != 0 or sys.platform != 'linux' or len(sys.argv) < 2:
    raise SystemExit('Run as root on the dedicated Linux host with the peer host addresses.')
peers = sorted(set(ipaddress.ip_address(value) for value in sys.argv[1:]), key=str)
if any(p.is_loopback or p.is_unspecified or p.is_multicast for p in peers):
    raise SystemExit('Invalid peer address.')
rules = ['table inet galx_pool_isolation {']
for chain, hook in [('input', 'input'), ('output', 'output'), ('forward', 'forward')]:
    rules.append(f' chain {chain} {{ type filter hook {hook} priority -200; policy accept;')
    for peer in peers:
        family = 'ip' if peer.version == 4 else 'ip6'
        for direction in (['saddr'] if chain == 'input' else ['daddr'] if chain == 'output' else ['saddr', 'daddr']):
            rules.append(f'  {family} {direction} {peer} counter drop comment "galx-peer-deny"')
    rules.append(' }')
rules.append('}')
text = '\n'.join(rules) + '\n'
destination = pathlib.Path('/etc/nftables.d/galx-pool-isolation.nft')
if destination.exists() or subprocess.run(['nft', 'list', 'table', 'inet', 'galx_pool_isolation'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0:
    raise SystemExit('Isolation rules already exist. Verify their addresses before making a deliberate update.')
subprocess.run(['nft', '--check', '--file', '-'], input=text, text=True, check=True)
destination.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
destination.write_text(text)
os.chmod(destination, 0o600)
nft = shutil.which('nft')
unit = pathlib.Path('/etc/systemd/system/galx-pool-isolation.service')
dropin = pathlib.Path('/etc/systemd/system/docker.service.d/galx-isolation.conf')
if unit.exists() or dropin.exists():
    raise SystemExit('Existing isolation service must be inspected before updating.')
unit.write_text(f'''[Unit]
Description=GALX execution host peer isolation
Before=docker.service
After=network-pre.target
[Service]
Type=oneshot
ExecStart={nft} --file {destination}
RemainAfterExit=yes
[Install]
WantedBy=multi-user.target
''')
dropin.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
dropin.write_text('[Unit]\nRequires=galx-pool-isolation.service\nAfter=galx-pool-isolation.service\n')
subprocess.run(['systemctl', 'daemon-reload'], check=True)
subprocess.run(['systemctl', 'enable', '--now', 'galx-pool-isolation.service'], check=True)
print('Peer denial installed and enabled before Docker at boot. Verify addresses and reboot persistence on both dedicated hosts.')
