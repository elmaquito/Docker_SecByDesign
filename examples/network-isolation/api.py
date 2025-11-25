#!/usr/bin/env python3
"""
Service API Backend - Pont entre frontend et backend.
Accès aux réseaux frontend et backend.
"""
import http.server
import socketserver
import urllib.request
import urllib.error
import json

PORT = 8081
DB_URL = "http://db:8082/data"

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api":
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            # Tenter de contacter la base de données
            try:
                with urllib.request.urlopen(DB_URL, timeout=2) as response:
                    db_status = "connected"
            except Exception:
                db_status = "unavailable"
            
            data = {
                "service": "API",
                "networks": ["frontend", "backend"],
                "db_status": db_status,
                "message": "API Backend opérationnel"
            }
            self.wfile.write(json.dumps(data).encode())
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Service API démarré sur le port {PORT}")
        httpd.serve_forever()
