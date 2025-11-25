# Exemple: Limites de ressources et Health Checks
# Prévient les attaques DoS et assure la disponibilité

FROM python:3.11-slim

RUN groupadd --gid 1000 appgroup && \
    useradd --uid 1000 --gid appgroup --shell /bin/bash --create-home appuser

WORKDIR /app

COPY --chown=appuser:appgroup app.py .

USER appuser

EXPOSE 8080

# Health check intégré
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

CMD ["python", "app.py"]
