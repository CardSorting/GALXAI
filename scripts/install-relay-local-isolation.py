#!/usr/bin/env python3
"""Premium VM boundary: central TLS and, explicitly, its own verified-TLS DB.

Run inside the owning fresh Colima VM before delivering credentials. The Mac and
its administrator remain trusted; this is not physical-machine separation.
"""
import pathlib
import subprocess
import sys

pool = sys.argv[1] if len(sys.argv) in (2, 3) else ''
mode = sys.argv[2] if len(sys.argv) == 3 else None
if pool != 'premium' or sys.platform != 'linux' or mode not in (None, '--native-database', '--hosted-database'):
    raise SystemExit('Use inside Linux: install-relay-local-isolation.py premium [--native-database|--hosted-database]')
gateway = '192.168.105.2'
lines = ['table inet galx_local_isolation {']
for chain in ('output', 'forward'):
    lines += [f' chain {chain} {{ type filter hook {chain} priority -150; policy accept;',
              '  ct state established,related accept',
              '  oifname "lo" accept',
              f'  ip daddr {gateway} tcp dport 13443 accept',
              f'  ip daddr {gateway} udp dport 53 accept',
              f'  ip daddr {gateway} tcp dport 53 accept',
              # Keep DHCP for the owning isolated VM network only.
              f'  ip daddr {{ {gateway}, 255.255.255.255 }} udp sport 68 udp dport 67 accept',
              # Colima translates this gateway to Mac loopback. No arbitrary
              # Mac service, central DB, SSH or daemon access is allowed.
              f'  ip daddr {gateway} counter drop',
              # Restrict off-VM private networks while retaining own Docker bridge paths.
              '  oifname "eth0" ip daddr { 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 100.64.0.0/10, 169.254.0.0/16 } counter drop',
              # No alternate IPv6 egress bypass. SSH remains IPv4 on the VM gateway.
              '  oifname "eth0" meta nfproto ipv6 counter drop', ' }']
lines += [' chain input { type filter hook input priority -150; policy accept;',
          '  ct state established,related accept', '  iifname "lo" accept',
          f'  iifname "eth0" ip saddr {gateway} tcp dport 22 accept',
          '  iifname "eth0" udp sport 67 udp dport 68 accept',
          '  iifname "eth0" counter drop', ' }', '}']
rules = '\n'.join(lines) + '\n'
native_rules = rules.replace(f'  ip daddr {gateway} tcp dport 13443 accept',
    f'  ip daddr {gateway} tcp dport 13443 accept\n  ip daddr {gateway} tcp dport 55433 accept')
target = pathlib.Path('/etc/nftables.d/galx-local-isolation.nft')
unit = pathlib.Path('/etc/systemd/system/galx-local-isolation.service')
dropin = pathlib.Path('/etc/systemd/system/docker.service.d/galx-local-isolation.conf')
if target.exists():
    current = target.read_text()
    desired = native_rules if mode == '--native-database' else rules if mode == '--hosted-database' else current
    if current not in (rules, native_rules):
        raise SystemExit('Existing local policy differs; inspect before changing it.')
    subprocess.run(['systemctl', 'is-active', '--quiet', 'galx-local-isolation.service'], check=True)
    subprocess.run(['nft', 'list', 'table', 'inet', 'galx_local_isolation'], check=True, stdout=subprocess.DEVNULL)
    if desired != current:
        # Replace the known table in one nft transaction: no open interval and
        # no flush of unrelated policy. Both directions are explicit operations.
        transaction = 'delete table inet galx_local_isolation\n' + desired
        subprocess.run(['nft', '--check', '--file', '-'], input=transaction, text=True, check=True)
        temporary = target.with_suffix('.next')
        temporary.write_text(desired)
        temporary.chmod(0o600)
        temporary.replace(target)
        try:
            subprocess.run(['nft', '--file', '-'], input=transaction, text=True, check=True)
        except BaseException:
            target.write_text(current)
            target.chmod(0o600)
            raise
        print('Known local policy atomically updated; only Premium DB port differs.')
    else:
        print('Existing local VM policy retained.')
    raise SystemExit(0)
if unit.exists() or dropin.exists():
    raise SystemExit('Partial policy installation needs inspection.')
if mode == '--native-database':
    rules = native_rules
subprocess.run(['nft', '--check', '--file', '-'], input=rules, text=True, check=True)
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(rules)
target.chmod(0o600)
unit.write_text(f'''[Unit]
Description=GALX local VM network boundary
Before=docker.service
After=network-pre.target
[Service]
Type=oneshot
ExecStart=/usr/sbin/nft --file {target}
RemainAfterExit=yes
[Install]
WantedBy=multi-user.target
''')
dropin.parent.mkdir(parents=True, exist_ok=True)
dropin.write_text('[Unit]\nRequires=galx-local-isolation.service\nAfter=galx-local-isolation.service\n')
subprocess.run(['systemctl', 'daemon-reload'], check=True)
subprocess.run(['systemctl', 'enable', '--now', 'galx-local-isolation.service'], check=True)
print(f'{pool}: persistent local network boundary installed.')
