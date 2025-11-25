#!/usr/bin/env python3
"""
Application pour démontrer l'importance de l'analyse d'images.
"""
import http.server
import socketserver

PORT = 8080

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        
        html = """
        <html>
        <head><title>Image Scanning Demo</title></head>
        <body>
            <h1>Sécurité par Design - Analyse d'Images</h1>
            <p>Cette image peut contenir des vulnérabilités.</p>
            <p>Utilisez Trivy pour analyser cette image:</p>
            <pre>trivy image image-scanning-demo</pre>
            <h2>Pourquoi scanner les images ?</h2>
            <ul>
                <li>Détecter les CVE (Common Vulnerabilities and Exposures)</li>
                <li>Identifier les packages obsolètes</li>
                <li>Vérifier les configurations incorrectes</li>
                <li>Automatiser dans le pipeline CI/CD</li>
            </ul>
        </body>
        </html>
        """
        self.wfile.write(html.encode())

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serveur démarré sur le port {PORT}")
        httpd.serve_forever()
