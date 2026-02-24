#!/bin/bash
echo "=== PM2 PROCESSES ==="
pm2 list --no-color 2>/dev/null

echo ""
echo "=== IQ ENGINE LOCATION ==="
find /root -maxdepth 4 -name "central_iq*" -o -name "*iq_engine*" -o -name "*copy_trad*" 2>/dev/null

echo ""
echo "=== FIND IQ ENGINE DIR ==="
pm2 show iq-central-engine --no-color 2>/dev/null | grep -E "script path|cwd|exec mode|restarts|status"

echo ""
echo "=== LAST 100 LINES OF IQ ENGINE LOGS ==="
pm2 logs iq-central-engine --lines 100 --nostream --no-color 2>&1

echo ""
echo "=== IQ ENGINE SOURCE CODE ==="
IQ_SCRIPT=$(pm2 show iq-central-engine --no-color 2>/dev/null | grep "script path" | awk '{print $NF}')
if [ -n "$IQ_SCRIPT" ]; then
    echo "Script: $IQ_SCRIPT"
    cat "$IQ_SCRIPT"
else
    echo "Could not find iq-central-engine script path"
    # Try common locations
    for f in /root/iq-engine/central_iq_engine.py /root/bot-strategy-hub/central_iq_engine.py /root/central_iq_engine.py; do
        if [ -f "$f" ]; then
            echo "Found: $f"
            cat "$f"
            break
        fi
    done
fi
