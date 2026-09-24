#!/usr/bin/env python3
"""Build local Mac launchers. --install installs into the current user's Applications."""
import argparse
import os
from pathlib import Path
import plistlib
import shutil
import struct
import subprocess

root = Path(__file__).resolve().parent.parent
build = root / '.relay' / 'monitor-apps'
parser = argparse.ArgumentParser()
parser.add_argument('--install', action='store_true')
args = parser.parse_args()
node_executable = shutil.which('node')
if not node_executable:
    raise SystemExit('Node.js is required to build local relay launchers.')
build.mkdir(parents=True, exist_ok=True)
binary = build / 'GALXMonitors'
subprocess.run(['/usr/bin/swiftc', '-O', '-framework', 'AppKit', '-module-cache-path', str(build / 'module-cache'), str(root / 'scripts/macos/RelayMonitors.swift'), '-o', str(binary)], check=True)
for name, pool in [('GALX Monitors', None), ('GALX Premium', 'premium')]:
    app = build / (name + '.app')
    contents = app / 'Contents'
    (contents / 'MacOS').mkdir(parents=True, exist_ok=True)
    (contents / 'Resources').mkdir(parents=True, exist_ok=True)
    shutil.copy2(binary, contents / 'MacOS/GALXMonitors')
    iconset = build / ((pool or 'monitors') + '.iconset')
    iconset.mkdir(exist_ok=True)
    source_icon = build / ((pool or 'monitors') + '.png')
    subprocess.run([str(binary), '--icon', str(source_icon), pool or 'monitors'], check=True)
    for size in [16, 32, 128, 256, 512]:
        for scale in [1, 2]:
            filename = f'icon_{size}x{size}' + ('@2x' if scale == 2 else '') + '.png'
            subprocess.run(['/usr/bin/sips', '-z', str(size * scale), str(size * scale), str(source_icon), '--out', str(iconset / filename)], check=True, capture_output=True)
    # Write the documented ICNS container directly. iconutil on some current
    # macOS builds rejects otherwise complete 10-file iconsets as "Invalid".
    icon_sizes = [('icp4', 'icon_16x16.png'), ('icp5', 'icon_16x16@2x.png'),
                  ('icp6', 'icon_32x32@2x.png'), ('ic07', 'icon_128x128.png'),
                  ('ic08', 'icon_256x256.png'), ('ic09', 'icon_512x512.png'),
                  ('ic10', 'icon_512x512@2x.png')]
    chunks = b''
    for kind, filename in icon_sizes:
        image = (iconset / filename).read_bytes()
        chunks += kind.encode('ascii') + struct.pack('>I', len(image) + 8) + image
    icon = b'icns' + struct.pack('>I', len(chunks) + 8) + chunks
    (contents / 'Resources/Monitor.icns').write_bytes(icon)
    identifier = 'ai.galx.monitors' + ('.' + pool if pool else '')
    info = {'CFBundleIdentifier': identifier, 'CFBundleName': name, 'CFBundleDisplayName': name,
            'CFBundleExecutable': 'GALXMonitors', 'CFBundlePackageType': 'APPL', 'CFBundleVersion': '1',
            'CFBundleShortVersionString': '1.0', 'LSMinimumSystemVersion': '13.0', 'LSUIElement': True,
            'NSHighResolutionCapable': True, 'GALXWorkspace': str(root), 'GALXNodeExecutable': node_executable}
    info['CFBundleIconFile'] = 'Monitor'
    if pool:
        info['GALXPool'] = pool
    else:
        info['CFBundleURLTypes'] = [{'CFBundleURLName': identifier, 'CFBundleURLSchemes': ['galx-monitor'], 'CFBundleTypeRole': 'Viewer'}]
    with (contents / 'Info.plist').open('wb') as f:
        plistlib.dump(info, f)
    subprocess.run(['/usr/bin/codesign', '--force', '--sign', '-', str(app)], check=True, capture_output=True)
    if args.install:
        target = Path.home() / 'Applications' / app.name
        if target.exists():
            existing = plistlib.loads((target / 'Contents/Info.plist').read_bytes())
            if existing.get('CFBundleIdentifier') != identifier:
                raise SystemExit('Refusing to replace an unrelated application.')
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(app, target, dirs_exist_ok=True)
        subprocess.run(['/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister', '-f', str(target)], check=True)
        print(f'Installed {name} in your Applications folder.')
if args.install:
    desktop = Path.home() / 'Desktop/GALX Monitors.app'
    destination = Path.home() / 'Applications/GALX Monitors.app'
    if not desktop.exists() and not desktop.is_symlink():
        desktop.symlink_to(destination)
    subprocess.run(['/usr/bin/open', str(destination)], check=True)
else:
    print('Two signed local application bundles built. Use --install to install them.')
