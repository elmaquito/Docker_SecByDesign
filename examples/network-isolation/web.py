#!/usr/bin/env python3
"""
Service Web Frontend - Accès uniquement au réseau frontend.
Communique avec le service API via le réseau frontend.
"""
import http.server
import socketserver
import urllib.request
import urllib.error

PORT = 8080
API_URL = "http://api:8081/api"

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        
        # Tenter de contacter l'API
        try:
            with urllib.request.urlopen(API_URL, timeout=2) as response:
                api_status = "Connecté"
                api_data = response.read().decode()
        except urllib.error.URLError:
            api_status = "Non accessible"
            api_data = "N/A"
        except Exception as e:
            api_status = f"Erreur: {e}"
            api_data = "N/A"
        
        html = f"""
        <html>
        <head><title>Network Isolation Demo - Web</title></head>
        <body>
            <h1>Sécurité par Design - Isolation Réseau</h1>
            <h2>Service Web (Frontend)</h2>
            <p>Ce service est sur le réseau: <strong>frontend</strong></p>
            <p>Statut API: {api_status}</p>
            <p><strong>Principe:</strong> Chaque service n'a accès qu'aux 
            réseaux nécessaires (principe du moindre privilège).</p>
        </body>
        </html>
        """
        self.wfile.write(html.encode())

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Service Web démarré sur le port {PORT}")
        httpd.serve_forever()
