package main

import (
	"fmt"
	"net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {
	html := `
	<html>
	<head><title>Multi-Stage Build Demo</title></head>
	<body>
		<h1>Sécurité par Design - Multi-Stage Build</h1>
		<p>Cette application utilise un multi-stage build:</p>
		<ul>
			<li>Image de base: scratch (vide)</li>
			<li>Pas de shell, pas d'outils</li>
			<li>Surface d'attaque minimale</li>
		</ul>
		<p><strong>Avantage:</strong> Moins de binaires = moins de vulnérabilités potentielles.</p>
	</body>
	</html>
	`
	fmt.Fprint(w, html)
}

func main() {
	http.HandleFunc("/", handler)
	fmt.Println("Serveur démarré sur le port 8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Printf("Erreur serveur: %v\n", err)
	}
}
