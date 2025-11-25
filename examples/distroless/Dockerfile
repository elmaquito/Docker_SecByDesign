# Exemple: Image Distroless
# Image minimale sans distribution Linux complète

# Étape 1: Construction avec Node.js
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json .
RUN npm install --production --ignore-scripts

COPY server.js .

# Étape 2: Image distroless pour l'exécution
FROM gcr.io/distroless/nodejs18-debian11

WORKDIR /app

# Copier l'application et les dépendances
COPY --from=builder /app .

# Utilisateur non-root (distroless inclut un user non-root)
USER nonroot

EXPOSE 8080

CMD ["server.js"]
