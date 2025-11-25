#!/usr/bin/env python3
"""
Application avec endpoint de santé et protection contre les abus.
Démontre l'importance des health checks et limites de ressources.
"""
import http.server
import socketserver
import json
import time
import os

PORT = 8080
start_time = time.time()
request_count = 0

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        global request_count
        request_count += 1
        
        if self.path == "/health":
            # Endpoint de santé pour les health checks
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            health_data = {
                "status": "healthy",
                "uptime_seconds": int(time.time() - start_time),
                "requests_served": request_count
            }
            self.wfile.write(json.dumps(health_data).encode())
            
        elif self.path == "/":
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            
            # Lire les limites de ressources (si disponibles)
            try:
                with open('/sys/fs/cgroup/memory.max', 'r') as f:
                    memory_limit = f.read().strip()
            except (FileNotFoundError, PermissionError, OSError):
                memory_limit = "Non défini"
            
            try:
                with open('/sys/fs/cgroup/cpu.max', 'r') as f:
                    cpu_limit = f.read().strip()
            except (FileNotFoundError, PermissionError, OSError):
                cpu_limit = "Non défini"
            
            html = f"""
            <html>
            <head><title>Resource Limits Demo</title></head>
            <body>
                <h1>Sécurité par Design - Limites de Ressources</h1>
                
                <h2>Statut du Service</h2>
                <ul>
                    <li>Uptime: {int(time.time() - start_time)} secondes</li>
                    <li>Requêtes traitées: {request_count}</li>
                </ul>
                
                <h2>Limites Configurées</h2>
                <ul>
                    <li>Limite mémoire: {memory_limit}</li>
                    <li>Limite CPU: {cpu_limit}</li>
                </ul>
                
                <h2>Health Check</h2>
                <p>Endpoint: <a href="/health">/health</a></p>
                
                <h2>Pourquoi c'est important:</h2>
                <ul>
                    <li>✓ <strong>Limites CPU/Mémoire:</strong> Prévient les attaques DoS</li>
                    <li>✓ <strong>Health Checks:</strong> Détection rapide des problèmes</li>
                    <li>✓ <strong>Restart Policies:</strong> Récupération automatique</li>
                    <li>✓ <strong>Limites PID:</strong> Prévient les fork bombs</li>
                </ul>
            </body>
            </html>
            """
            self.wfile.write(html.encode())
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Service démarré sur le port {PORT}")
        print("Health check disponible sur /health")
        httpd.serve_forever()
