#!/bin/bash
set -euo pipefail
umask 077
mkdir -p "$XDG_RUNTIME_DIR" "$HOME/.config/xfce4/terminal" "$HOME/.config/xfce4/xfconf/xfce-perchannel-xml" "$HOME/workspace" "$HOME/.local/bin"
chmod 700 "$XDG_RUNTIME_DIR"
cp /opt/galx-desktop/terminalrc "$HOME/.config/xfce4/terminal/terminalrc"
cp /opt/galx-desktop/xfwm4.xml "$HOME/.config/xfce4/xfconf/xfce-perchannel-xml/xfwm4.xml"
if [ ! -f "$HOME/.bashrc" ]; then
  cp /opt/galx-desktop/bashrc "$HOME/.bashrc"
fi
# A stopped desktop has no running Chrome owner; clear only its stale process locks.
rm -f "$HOME/.config/google-chrome/SingletonLock" "$HOME/.config/google-chrome/SingletonSocket" "$HOME/.config/google-chrome/SingletonCookie"
# Seed a new Chrome profile; never overwrite a saved profile or its preferences.
if [ ! -f "$HOME/.config/google-chrome/Default/Preferences" ]; then
  mkdir -p "$HOME/.config/google-chrome/Default"
  printf '%s' '{"browser":{"custom_chrome_frame":false},"download":{"default_directory":"/home/operator/workspace/Downloads"}}' > "$HOME/.config/google-chrome/Default/Preferences"
fi
Xvfb :0 -screen 0 1440x900x24 -nolisten tcp -ac +extension RANDR &
xpid=$!
trap 'kill "$xpid" 2>/dev/null || true' EXIT
for i in {1..50}; do if xdpyinfo >/dev/null 2>&1; then break; fi; sleep .1; done
exec dbus-run-session -- /bin/bash /opt/galx-desktop/session.sh
