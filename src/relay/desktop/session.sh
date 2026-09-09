#!/bin/bash
set -euo pipefail
xfwm4 --compositor=off >/tmp/window-manager.log 2>&1 &
python3 /opt/galx-desktop/shell.py >/tmp/desktop-shell.log 2>&1 &
printf '%s' "$DBUS_SESSION_BUS_ADDRESS" > /tmp/desktop-bus
touch /tmp/desktop-ready
# Only the owning host gateway exposes this port, through an authenticated WebSocket.
exec x11vnc -display :0 -rfbport 5900 -localhost -forever -shared -nopw -noxdamage -repeat -xkb -quiet -o /tmp/display.log
