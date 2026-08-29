#!/bin/bash
cd "$(dirname "$0")"

if ! command -v node &> /dev/null; then
    echo ""
    echo "============================================================"
    echo "  Node.js was not found on this computer."
    echo "  Download and install it from https://nodejs.org"
    echo "  (choose the LTS version), then run this script again."
    echo "============================================================"
    echo ""
    exit 1
fi

echo ""
echo "Starting Ledger... this terminal must stay open while you use the app."
echo "Once you see \"Running at: http://localhost:3000\", open that address"
echo "in your browser."
echo ""

node server.js
