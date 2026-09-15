#!/usr/bin/env python3
"""Build local Mac launchers. --install installs into the current user's Applications."""
import argparse
import os
from pathlib import Path
import plistlib
import shutil
import subprocess

root = Path(__file__).resolve().parent.parent
build = root / '.relay' / 'monitor-apps'
parser = argparse.ArgumentParser()
parser.add_argument('--install', action='store_true')
args = parser.parse_args()
build.mkdir(parents=True, exist_ok=True)
binary = build / 'GALXMonitors'
subprocess.run(['/usr/bin/swiftc', '-O', '-framework', 'AppKit', '-module-cache-path', str(build / 'module-cache'), str(root / 'scripts/macos/RelayMonitors.swift'), '-o', str(binary)], check=True)
for name, pool in [('GALX Monitors', None), ('GALX Premium', 'premium'), ('GALX Standard', 'standard')]:
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
    subprocess.run(['/usr/bin/iconutil', '-c', 'icns', str(iconset), '-o', str(contents / 'Resources/Monitor.icns')], check=True)
    identifier = 'ai.galx.monitors' + ('.' + pool if pool else '')
    info = {'CFBundleIdentifier': identifier, 'CFBundleName': name, 'CFBundleDisplayName': name,
            'CFBundleExecutable': 'GALXMonitors', 'CFBundlePackageType': 'APPL', 'CFBundleVersion': '1',
            'CFBundleShortVersionString': '1.0', 'LSMinimumSystemVersion': '13.0', 'LSUIElement': True,
            'NSHighResolutionCapable': True, 'GALXWorkspace': str(root)}
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
    print('Three signed local application bundles built. Use --install to install them.')
