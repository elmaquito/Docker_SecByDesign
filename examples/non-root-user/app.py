#!/usr/bin/env python3
"""
Application simple pour démontrer l'exécution avec utilisateur non-root.
"""
import http.server
import socketserver
import os

PORT = 8080

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        
        user_info = f"""
        <html>
        <head><title>Non-Root User Demo</title></head>
        <body>
            <h1>Sécurité par Design - Utilisateur Non-Root</h1>
            <p>Cette application s'exécute avec:</p>
            <ul>
                <li>UID: {os.getuid()}</li>
                <li>GID: {os.getgid()}</li>
                <li>User: {os.environ.get('USER', 'N/A')}</li>
            </ul>
            <p><strong>Avantage:</strong> Même si le conteneur est compromis, 
            l'attaquant n'a pas les privilèges root.</p>
        </body>
        </html>
        """
        self.wfile.write(user_info.encode())

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serveur démarré sur le port {PORT}")
        print(f"UID: {os.getuid()}, GID: {os.getgid()}")
        httpd.serve_forever()
