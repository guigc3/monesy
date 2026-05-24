"""Smoke test: Flask serves Vue dist, not legacy static."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import app as gastos_app

client = gastos_app.app.test_client()
r = client.get("/")
html = r.get_data(as_text=True)
assert r.status_code == 200, r.status_code
assert 'id="app"' in html, "expected Vue mount point"
assert "app.js" not in html or "/assets/" in html, "legacy script tags?"
assert client.get("/gastos").status_code == 200
assert client.get("/assinaturas").status_code == 200
assert client.get("/features").status_code == 200
assert client.get("/api/config").status_code == 200
css = client.get("/design-system/ui_kits/web-app/app.css")
assert css.status_code == 200 and len(css.data) > 1000
print("OK static_folder:", gastos_app.app.static_folder)
print("OK Vue SPA routes and design-system CSS")
