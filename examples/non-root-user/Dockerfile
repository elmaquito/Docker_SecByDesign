# Exemple: Exécution de conteneur avec utilisateur non-root
# Cette pratique réduit les risques en cas de compromission du conteneur

FROM python:3.11-slim

# Créer un groupe et utilisateur non-root
RUN groupadd --gid 1000 appgroup && \
    useradd --uid 1000 --gid appgroup --shell /bin/bash --create-home appuser

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers d'application
COPY --chown=appuser:appgroup app.py .

# Passer à l'utilisateur non-root
USER appuser

# Exposer le port (non privilégié > 1024)
EXPOSE 8080

# Commande de démarrage
CMD ["python", "app.py"]
