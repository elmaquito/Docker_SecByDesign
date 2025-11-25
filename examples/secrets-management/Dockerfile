# Exemple: Gestion des Secrets
# Utilisation de Docker secrets pour sécuriser les données sensibles

FROM python:3.11-slim

RUN groupadd --gid 1000 appgroup && \
    useradd --uid 1000 --gid appgroup --shell /bin/bash --create-home appuser

WORKDIR /app

COPY --chown=appuser:appgroup app.py .

USER appuser

EXPOSE 8080

CMD ["python", "app.py"]
