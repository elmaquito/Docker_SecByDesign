# Exemple: Multi-stage build pour réduire la surface d'attaque
# Cette technique produit des images plus petites et plus sécurisées

# Étape 1: Construction
FROM golang:1.21-alpine AS builder

WORKDIR /build

# Copier les fichiers sources
COPY main.go .

# Compiler l'application en statique
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o app .

# Étape 2: Image finale minimale
FROM scratch

# Copier uniquement le binaire compilé
COPY --from=builder /build/app /app

# Utilisateur non-root (UID/GID 1000)
USER 1000:1000

# Exposer le port
EXPOSE 8080

# Commande de démarrage
ENTRYPOINT ["/app"]
