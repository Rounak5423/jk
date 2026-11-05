#!/usr/bin/env bash
# Exit on error
set -e

echo "=== [1/2] Installing frontend dependencies & compiling Vite React bundle ==="
cd frontend
npm install --include=dev
npm run build
cd ..

echo "=== [2/2] Installing backend Python packages with Gunicorn ==="
cd backend
pip install --upgrade pip
pip install -r requirements.txt
cd ..

echo "=== Deployment build complete! Ready for Gunicorn. ==="
