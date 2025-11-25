#!/usr/bin/env python3
"""
Application démontrant la gestion sécurisée des secrets.
Les secrets sont montés comme fichiers, pas comme variables d'environnement.
"""
import http.server
import socketserver
import os

PORT = 8080
SECRET_PATH = "/run/secrets/db_password"

def read_secret(path):
    """Lit un secret depuis le système de fichiers."""
    try:
        with open(path, 'r') as f:
            return f.read().strip()
    except FileNotFoundError:
        return None
    except PermissionError:
        return "Permission refusée"

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        
        # Vérifier si le secret existe (sans le révéler)
        secret = read_secret(SECRET_PATH)
        if secret and secret != "Permission refusée":
            secret_status = "✓ Secret chargé (non affiché pour des raisons de sécurité)"
            secret_length = len(secret)
        elif secret == "Permission refusée":
            secret_status = "✗ Permission refusée"
            secret_length = 0
        else:
            secret_status = "✗ Secret non trouvé"
            secret_length = 0
        
        # Vérifier les variables d'environnement (mauvaise pratique)
        env_password = os.environ.get('DB_PASSWORD', None)
        env_warning = ""
        if env_password:
            env_warning = """
            <div style="background-color: #ffcccc; padding: 10px; border-radius: 5px;">
                <strong>⚠️ ATTENTION:</strong> Mot de passe trouvé dans les variables d'environnement!
                Ceci est une MAUVAISE pratique car les variables d'environnement 
                peuvent être exposées dans les logs et les dumps de processus.
            </div>
            """
        
        html = f"""
        <html>
        <head><title>Secrets Management Demo</title></head>
        <body>
            <h1>Sécurité par Design - Gestion des Secrets</h1>
            
            <h2>Méthode recommandée: Docker Secrets</h2>
            <p>Statut du secret ({SECRET_PATH}): {secret_status}</p>
            <p>Longueur du secret: {secret_length} caractères</p>
            
            {env_warning}
            
            <h2>Bonnes pratiques:</h2>
            <ul>
                <li>✓ Utiliser Docker Secrets (montés comme fichiers)</li>
                <li>✓ Les secrets ne sont jamais dans l'image</li>
                <li>✓ Les secrets sont chiffrés au repos dans Swarm</li>
                <li>✗ Éviter les variables d'environnement pour les secrets</li>
                <li>✗ Ne jamais hardcoder les secrets dans le code</li>
            </ul>
        </body>
        </html>
        """
        self.wfile.write(html.encode())

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Service démarré sur le port {PORT}")
        print(f"Vérification du secret: {SECRET_PATH}")
        httpd.serve_forever()
