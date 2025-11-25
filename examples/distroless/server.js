const http = require('http');

const PORT = 8080;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    
    const html = `
    <html>
    <head><title>Distroless Demo</title></head>
    <body>
        <h1>Sécurité par Design - Image Distroless</h1>
        
        <h2>Qu'est-ce qu'une image Distroless ?</h2>
        <p>Une image qui contient uniquement l'application et ses dépendances runtime,
        sans gestionnaire de packages, shell, ou autres programmes.</p>
        
        <h2>Cette image contient:</h2>
        <ul>
            <li>✅ Runtime Node.js</li>
            <li>✅ Notre application</li>
            <li>✅ Certificats CA pour HTTPS</li>
        </ul>
        
        <h2>Cette image NE contient PAS:</h2>
        <ul>
            <li>❌ Shell (bash, sh)</li>
            <li>❌ Gestionnaire de packages (apt, apk)</li>
            <li>❌ Outils système (curl, wget, etc.)</li>
        </ul>
        
        <h2>Avantages pour la sécurité:</h2>
        <ul>
            <li>Surface d'attaque drastiquement réduite</li>
            <li>Impossible d'exécuter des commandes shell</li>
            <li>Moins de CVE potentielles</li>
            <li>Image plus petite et plus rapide</li>
        </ul>
    </body>
    </html>
    `;
    
    res.end(html);
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
