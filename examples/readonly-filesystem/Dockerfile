# Exemple: Read-only Root Filesystem
# Démonstration d'un conteneur avec système de fichiers en lecture seule

FROM python:3.11-slim

RUN groupadd --gid 1000 appgroup && \
    useradd --uid 1000 --gid appgroup --shell /bin/bash --create-home appuser

# Créer les répertoires temporaires nécessaires
RUN mkdir -p /tmp/app && chown appuser:appgroup /tmp/app

WORKDIR /app

COPY --chown=appuser:appgroup app.py .

USER appuser

EXPOSE 8080

# L'application doit utiliser /tmp pour les écritures temporaires
ENV TEMP_DIR=/tmp/app

CMD ["python", "app.py"]
