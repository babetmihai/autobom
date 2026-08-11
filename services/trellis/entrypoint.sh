#!/bin/sh
set -e
mkdir -p /content/TRELLIS.2/output /content/TRELLIS.2/input
chown -R camenduru:camenduru /content/TRELLIS.2/output /content/TRELLIS.2/input
exec su -s /bin/sh camenduru -c "exec python3 service.py"
