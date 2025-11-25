#!/usr/bin/env python3
"""
Application démontrant le fonctionnement avec un filesystem read-only.
Les écritures sont redirigées vers /tmp (tmpfs).
"""
import http.server
import socketserver
import os
import tempfile
from datetime import datetime

PORT = 8080
TEMP_DIR = os.environ.get('TEMP_DIR', '/tmp/app')

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        
        # Test d'écriture dans /tmp (devrait fonctionner)
        tmp_write_status = "❌ Échec"
        try:
            test_file = os.path.join(TEMP_DIR, 'test.txt')
            with open(test_file, 'w') as f:
                f.write(f"Test à {datetime.now()}")
            tmp_write_status = "✅ Succès"
            os.remove(test_file)
        except (OSError, IOError) as e:
            tmp_write_status = f"❌ Erreur: {e}"
        
        # Test d'écriture dans /app (devrait échouer en read-only)
        app_write_status = "❌ Échec (attendu)"
        try:
            with open('/app/test.txt', 'w') as f:
                f.write("test")
            app_write_status = "⚠️ Succès (filesystem non read-only!)"
            os.remove('/app/test.txt')
        except (OSError, IOError):
            app_write_status = "✅ Bloqué (read-only filesystem actif)"
        
        html = f"""
        <html>
        <head><title>Read-only Filesystem Demo</title></head>
        <body>
            <h1>Sécurité par Design - Filesystem Read-Only</h1>
            
            <h2>Tests d'écriture</h2>
            <table border="1" cellpadding="10">
                <tr><th>Chemin</th><th>Statut</th></tr>
                <tr><td>/tmp (tmpfs)</td><td>{tmp_write_status}</td></tr>
                <tr><td>/app (read-only)</td><td>{app_write_status}</td></tr>
            </table>
            
            <h2>Configuration docker-compose.yml</h2>
            <pre>
services:
  app:
    read_only: true      # Filesystem en lecture seule
    tmpfs:
      - /tmp             # Répertoire temporaire en mémoire
            </pre>
            
            <h2>Avantages</h2>
            <ul>
                <li>✅ Empêche la modification des binaires</li>
                <li>✅ Bloque l'injection de malware persistant</li>
                <li>✅ Détection plus facile des tentatives de compromission</li>
            </ul>
        </body>
        </html>
        """
        self.wfile.write(html.encode())

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serveur démarré sur le port {PORT}")
        print(f"TEMP_DIR: {TEMP_DIR}")
        httpd.serve_forever()
