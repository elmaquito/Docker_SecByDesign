#!/usr/bin/env python3
"""
Service Base de données - Uniquement sur le réseau backend.
Isolé du réseau frontend pour une sécurité maximale.
"""
import http.server
import socketserver
import json

PORT = 8082

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/data":
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            data = {
                "service": "Database",
                "network": "backend",
                "status": "operational",
                "security": "Isolé - accessible uniquement depuis le réseau backend"
            }
            self.wfile.write(json.dumps(data).encode())
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Service DB démarré sur le port {PORT}")
        print("Ce service est isolé sur le réseau backend uniquement")
        httpd.serve_forever()
