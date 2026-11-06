#!/usr/bin/env bash
# Exit on error
set -e

echo "=== [1/2] Checking frontend build ==="
if command -v npm &> /dev/null; then
    echo "Node.js & npm detected. Building latest frontend bundle..."
    cd frontend
    npm install --include=dev
    npm run build
    cd ..
else
    echo "npm not found in current environment. Using pre-compiled frontend distribution bundle."
fi

echo "=== [2/2] Installing backend Python packages with Gunicorn ==="
cd backend
pip install --upgrade pip
pip install -r requirements.txt
cd ..

echo "=== Deployment build complete! Ready for Gunicorn. ==="

