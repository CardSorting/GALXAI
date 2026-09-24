#!/usr/bin/env python3
"""Install the persistent ingress boundary for the single DO Premium host.

Run as root on the Linux Droplet after confirming the SSH session works. The
operator CIDRs are required and /0 is rejected so a copied command cannot
silently reopen SSH to the entire internet. Existing policy is never replaced.
"""
import argparse
import ipaddress
import os
import pathlib
import shutil
import subprocess
import sys


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ssh-cidr', action='append', required=True, help='Operator SSH source CIDR; repeat for IPv4/IPv6 ranges.')
    return parser.parse_args()


def main():
    if os.geteuid() != 0 or sys.platform != 'linux':
        raise SystemExit('Run as root on the DigitalOcean Linux host.')
    args = parse_args()
    networks = []
    for raw in args.ssh_cidr:
        try:
            network = ipaddress.ip_network(raw, strict=False)
        except ValueError as error:
            raise SystemExit(f'Invalid SSH CIDR: {raw}') from error
        if network.network_address.is_unspecified or network.prefixlen == 0:
            raise SystemExit('SSH CIDRs must not be 0.0.0.0/0 or ::/0.')
        networks.append(network)
    networks = sorted(set(networks), key=lambda value: (value.version, int(value.network_address), value.prefixlen))
    nft = shutil.which('nft')
    if not nft:
        raise SystemExit('nft is required.')

    rules = [
        'table inet galx_pool_isolation {',
        ' chain input { type filter hook input priority -200; policy drop;',
        '  ct state established,related accept',
        '  iifname "lo" accept',
        '  ip protocol icmp accept',
        '  ip6 nexthdr icmpv6 accept',
        '  tcp dport { 80, 443 } accept',
        '  udp dport 443 accept',
    ]
    for network in networks:
        family = 'ip' if network.version == 4 else 'ip6'
        rules.append(f'  {family} saddr {network} tcp dport 22 accept comment "galx-operator-ssh"')
    rules += [
        ' }',
        ' chain output { type filter hook output priority -200; policy accept;',
        '  ct state established,related accept',
        ' }',
        ' chain forward { type filter hook forward priority -200; policy accept;',
        '  ct state established,related accept',
        ' }',
        '}',
    ]
    rendered = '\n'.join(rules) + '\n'
    destination = pathlib.Path('/etc/nftables.d/galx-pool-isolation.nft')
    existing_table = subprocess.run([nft, 'list', 'table', 'inet', 'galx_pool_isolation'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
    if destination.exists() or existing_table:
        if destination.exists() and destination.read_text() == rendered:
            subprocess.run(['systemctl', 'is-active', '--quiet', 'galx-pool-isolation.service'], check=True)
            print('Existing DigitalOcean host firewall retained.')
            return
        raise SystemExit('Existing GALX host firewall differs; inspect it before making a deliberate change.')

    subprocess.run([nft, '--check', '--file', '-'], input=rendered, text=True, check=True)
    destination.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
    destination.write_text(rendered)
    destination.chmod(0o600)
    unit = pathlib.Path('/etc/systemd/system/galx-pool-isolation.service')
    dropin = pathlib.Path('/etc/systemd/system/docker.service.d/galx-pool-isolation.conf')
    if unit.exists() or dropin.exists():
        raise SystemExit('A partial GALX isolation installation exists; inspect it before continuing.')
    unit.write_text(f'''[Unit]
Description=GALX DigitalOcean host ingress boundary
Before=docker.service
After=network-pre.target
[Service]
Type=oneshot
ExecStart={nft} --file {destination}
RemainAfterExit=yes
[Install]
WantedBy=multi-user.target
''')
    unit.chmod(0o644)
    dropin.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
    dropin.write_text('[Unit]\nRequires=galx-pool-isolation.service\nAfter=galx-pool-isolation.service\n')
    dropin.chmod(0o644)
    subprocess.run(['systemctl', 'daemon-reload'], check=True)
    subprocess.run(['systemctl', 'enable', '--now', 'galx-pool-isolation.service'], check=True)
    print('DigitalOcean host firewall installed and enabled before Docker.')


if __name__ == '__main__':
    main()
