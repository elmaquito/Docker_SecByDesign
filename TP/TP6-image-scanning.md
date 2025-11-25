# TP6 - Analyse de Vulnérabilités des Images

## 🎯 Objectif

Apprendre à scanner les images Docker pour détecter les vulnérabilités (CVE) et intégrer cette pratique dans votre workflow de développement.

## ⏱️ Durée estimée : 45 minutes

## 📋 Prérequis

- TP1 à TP5 complétés
- Trivy installé (ou utilisation via Docker)

---

## 📖 Contexte Théorique

### Qu'est-ce qu'une CVE ?

**CVE** (Common Vulnerabilities and Exposures) est un système d'identification des vulnérabilités de sécurité connues.

Exemple : `CVE-2021-44228` (Log4Shell)

### Niveaux de sévérité

| Niveau | Score CVSS | Description |
|--------|------------|-------------|
| CRITICAL | 9.0 - 10.0 | Exploitation triviale, impact majeur |
| HIGH | 7.0 - 8.9 | Exploitation facile, impact significatif |
| MEDIUM | 4.0 - 6.9 | Exploitation possible, impact modéré |
| LOW | 0.1 - 3.9 | Exploitation difficile, impact limité |

### Outils de scanning

- **Trivy** (Aqua Security) - Gratuit, rapide
- **Grype** (Anchore) - Gratuit, extensible
- **Snyk** - Freemium, intégrations CI/CD
- **Docker Scout** - Intégré à Docker Desktop

---

## 🔬 Partie Pratique

### Étape 1 : Installer Trivy

```bash
# Option 1: Installer via script
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin v0.48.0

# Option 2: Utiliser via Docker (pas d'installation)
alias trivy="docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest"

# Vérifier l'installation
trivy --version
```

---

### Étape 2 : Scanner une image vulnérable

```bash
# Scanner une ancienne image Python connue pour avoir des vulnérabilités
trivy image python:3.8-slim
```

**Observation** : Notez le nombre de vulnérabilités par sévérité.

---

### Étape 3 : Comparer avec une image récente

```bash
# Scanner une image plus récente
trivy image python:3.11-slim

# Comparer les résultats
```

**Question** : Quelle est la différence en nombre de vulnérabilités ?

<details>
<summary>📝 Explication</summary>

Les images plus récentes contiennent généralement moins de vulnérabilités car :
1. Les packages sont à jour
2. Les correctifs de sécurité sont appliqués
3. Les dépendances obsolètes sont supprimées

</details>

---

### Étape 4 : Construire et scanner l'exemple

```bash
cd examples/image-scanning

# Construire l'image de démo (basée sur Python 3.8)
docker build -t image-scanning-demo .

# Scanner l'image
trivy image image-scanning-demo
```

---

### Étape 5 : Filtrer par sévérité

```bash
# Afficher uniquement les vulnérabilités CRITICAL et HIGH
trivy image --severity CRITICAL,HIGH image-scanning-demo
```

---

### Étape 6 : Générer un rapport

```bash
# Rapport JSON
trivy image --format json --output report.json image-scanning-demo

# Voir le rapport
cat report.json | jq '.Results[].Vulnerabilities | length'

# Rapport table (par défaut)
trivy image --format table image-scanning-demo
```

---

### Étape 7 : Ignorer les vulnérabilités non corrigées

```bash
# Ne montrer que les vulnérabilités avec correctif disponible
trivy image --ignore-unfixed image-scanning-demo
```

---

### Étape 8 : Scanner une image "scratch"

```bash
cd ../multi-stage-build

# Construire l'image Go multi-stage
docker build -t multi-stage-demo .

# Scanner (devrait avoir 0 vulnérabilité)
trivy image multi-stage-demo
```

**Résultat attendu** : Aucune vulnérabilité car l'image scratch est vide.

---

### Étape 9 : Intégration CI/CD

Exemple de configuration pour GitHub Actions :

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on: [push, pull_request]

jobs:
  trivy-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'myapp:${{ github.sha }}'
          format: 'table'
          exit-code: '1'  # Échec si vulnérabilités critiques
          severity: 'CRITICAL,HIGH'
```

---

### Étape 10 : Scanner le système de fichiers

```bash
# Trivy peut aussi scanner des répertoires
cd ../..
trivy fs --security-checks vuln,secret,config .
```

Ceci détecte :
- Vulnérabilités dans les dépendances (requirements.txt, package.json)
- Secrets hardcodés dans le code
- Mauvaises configurations

---

### Étape 11 : Créer un fichier .trivyignore

Pour ignorer des faux positifs :

```bash
cat > .trivyignore << 'EOF'
# Ignorer une CVE spécifique (faux positif ou risque accepté)
# CVE-2023-XXXXX

# Ignorer par package
# libexpat
EOF
```

---

### Étape 12 : Nettoyage

```bash
docker rmi image-scanning-demo multi-stage-demo
rm -f report.json
```

---

## ✅ Points de Vérification

Avant de passer au TP suivant, assurez-vous que :

- [ ] Vous savez utiliser Trivy pour scanner une image
- [ ] Vous comprenez les niveaux de sévérité des CVE
- [ ] Vous savez filtrer les résultats par sévérité
- [ ] Vous savez générer des rapports
- [ ] Vous comprenez l'intérêt d'intégrer le scanning dans CI/CD

---

## 🎓 Pour Aller Plus Loin

### Exercice bonus 1 : Comparer différents outils

```bash
# Installer Grype
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin

# Scanner la même image avec Grype
grype python:3.8-slim

# Comparer les résultats avec Trivy
```

### Exercice bonus 2 : Scanner en mode strict

```bash
# Échouer si des vulnérabilités sont trouvées
trivy image --exit-code 1 --severity CRITICAL python:3.8-slim
echo "Exit code: $?"
```

### Exercice bonus 3 : Politique de sécurité

Créez un fichier de politique pour définir les règles :

```yaml
# policy.yaml
package:
  ignore:
    - name: "openssl"
      version: "1.1.1"
      reason: "Faux positif, notre code n'utilise pas cette fonctionnalité"
```

---

## 📚 Ressources

- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [CVE Database](https://cve.mitre.org/)
- [NIST NVD](https://nvd.nist.gov/)
- [Docker Scout](https://docs.docker.com/scout/)

---

⬅️ **Précédent** : [TP5 - Limites de Ressources](./TP5-resource-limits.md)

➡️ **Suivant** : [TP7 - Filesystem Read-Only](./TP7-readonly-filesystem.md)
