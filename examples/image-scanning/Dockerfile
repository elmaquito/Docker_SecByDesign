# Exemple: Analyse d'Images (Image Scanning)
# Utilisation de Trivy pour détecter les vulnérabilités

# ⚠️ INTENTIONNELLEMENT: Image Python 3.8 (ancienne version)
# Cette version est utilisée pour démontrer la détection de vulnérabilités
# En production, utilisez toujours la dernière version stable (ex: python:3.11-slim)
FROM python:3.8-slim

RUN groupadd --gid 1000 appgroup && \
    useradd --uid 1000 --gid appgroup --shell /bin/bash --create-home appuser

WORKDIR /app

COPY --chown=appuser:appgroup app.py .

USER appuser

EXPOSE 8080

# Note: Cette image sera analysée par Trivy pour détecter les vulnérabilités
# Comparez avec une image plus récente (python:3.11-slim)

CMD ["python", "app.py"]
