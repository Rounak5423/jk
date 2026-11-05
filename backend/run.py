import os
from app import create_app
from app.extensions import db

app = create_app()

with app.app_context():
    db.create_all()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"[*] Starting JK Tyre Fleet Intelligence Platform API on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
