# TP2 - Multi-Stage Build pour Images Minimales

## 🎯 Objectif

Apprendre à utiliser les multi-stage builds pour créer des images Docker minimales, réduisant ainsi la surface d'attaque.

## ⏱️ Durée estimée : 45 minutes

## 📋 Prérequis

- TP1 complété
- Connaissances de base en Go (optionnel)

---

## 📖 Contexte Théorique

### Qu'est-ce qu'un Multi-Stage Build ?

Un multi-stage build permet d'utiliser plusieurs instructions `FROM` dans un Dockerfile. Chaque `FROM` commence une nouvelle étape de construction.

**Avantages** :
- L'image finale ne contient que le strict nécessaire
- Les outils de build (compilateurs, etc.) ne sont pas inclus
- Réduction drastique de la taille de l'image
- Moins de composants = moins de vulnérabilités

### Exemple de réduction de taille

| Image | Taille typique |
|-------|---------------|
| golang:1.21 | ~800 MB |
| golang:1.21-alpine | ~250 MB |
| Image finale (scratch) | ~5-10 MB |

---

## 🔬 Partie Pratique

### Étape 1 : Analyser une image standard

```bash
# Construire une image Go standard (sans multi-stage)
cat > /tmp/Dockerfile.standard << 'EOF'
FROM golang:1.21

WORKDIR /app
COPY main.go .
RUN go build -o app main.go

CMD ["./app"]
EOF

# Créer un fichier Go simple
cat > /tmp/main.go << 'EOF'
package main

import (
    "fmt"
    "net/http"
)

func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprint(w, "Hello from Go!")
    })
    fmt.Println("Server started on :8080")
    http.ListenAndServe(":8080", nil)
}
EOF

# Construire
docker build -t go-standard -f /tmp/Dockerfile.standard /tmp

# Vérifier la taille
docker images go-standard
```

**Observation** : Notez la taille de l'image (environ 800+ MB).

---

### Étape 2 : Examiner l'exemple multi-stage

```bash
cd examples/multi-stage-build
cat Dockerfile
```

**Analysez le Dockerfile** :

```dockerfile
# Étape 1: Construction
FROM golang:1.21-alpine AS builder

WORKDIR /build

COPY main.go .

# Compiler en binaire statique
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o app .

# Étape 2: Image finale minimale
FROM scratch

COPY --from=builder /build/app /app

USER 1000:1000

EXPOSE 8080

ENTRYPOINT ["/app"]
```

**Points clés** :
- `AS builder` nomme la première étape
- `CGO_ENABLED=0` crée un binaire statique (pas de dépendances)
- `FROM scratch` utilise une image vide
- `COPY --from=builder` copie depuis l'étape précédente

---

### Étape 3 : Construire l'image optimisée

```bash
# Construire l'image multi-stage
docker build -t multi-stage-demo .

# Comparer les tailles
docker images | grep -E "(go-standard|multi-stage-demo)"
```

**Résultat attendu** :
```
go-standard      latest   ...   850MB
multi-stage-demo latest   ...   7MB
```

**Question** : Quelle est la différence de taille ? Pourquoi est-ce important pour la sécurité ?

<details>
<summary>📝 Réponse</summary>

La différence est d'environ 99% ! L'image multi-stage ne contient que le binaire compilé.

Pour la sécurité :
- Moins de binaires = moins de vulnérabilités potentielles
- Pas de shell = impossible d'exécuter des commandes arbitraires
- Pas d'outils = difficile pour un attaquant de pivoter

</details>

---

### Étape 4 : Lancer le conteneur

```bash
# Démarrer le conteneur
docker run -d -p 8085:8080 --name multi-stage-test multi-stage-demo

# Tester l'application
curl http://localhost:8085
```

---

### Étape 5 : Tenter d'accéder au shell

```bash
# Essayer d'ouvrir un shell (devrait échouer)
docker exec -it multi-stage-test /bin/sh
```

**Résultat attendu** : Erreur car il n'y a pas de shell dans l'image.

```bash
# Essayer avec bash
docker exec -it multi-stage-test /bin/bash
```

**Résultat attendu** : Même erreur.

---

### Étape 6 : Analyser le contenu de l'image

```bash
# Voir les couches de l'image
docker history multi-stage-demo

# Comparer avec l'image standard
docker history go-standard
```

**Observation** : L'image multi-stage n'a que quelques couches minimales.

---

### Étape 7 : Scanner les vulnérabilités (bonus)

Si vous avez Trivy installé :

```bash
# Scanner l'image standard
trivy image go-standard

# Scanner l'image multi-stage
trivy image multi-stage-demo
```

**Observation** : L'image scratch devrait avoir 0 vulnérabilité.

---

### Étape 8 : Nettoyage

```bash
# Arrêter et supprimer le conteneur
docker stop multi-stage-test
docker rm multi-stage-test

# Supprimer les images
docker rmi go-standard multi-stage-demo
```

---

## ✅ Points de Vérification

Avant de passer au TP suivant, assurez-vous que :

- [ ] Vous comprenez le concept de multi-stage build
- [ ] Vous savez utiliser `AS` pour nommer une étape
- [ ] Vous savez utiliser `COPY --from=` pour copier entre étapes
- [ ] Vous comprenez pourquoi `scratch` est l'image la plus sécurisée
- [ ] Vous savez compiler un binaire statique en Go

---

## 🎓 Pour Aller Plus Loin

### Exercice bonus 1 : Multi-stage avec Python

Créez un multi-stage build pour une application Python :

```dockerfile
# Étape 1: Installation des dépendances
FROM python:3.11 AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user -r requirements.txt

# Étape 2: Image finale
FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY app.py .
ENV PATH=/root/.local/bin:$PATH
CMD ["python", "app.py"]
```

### Exercice bonus 2 : Utiliser Alpine comme base finale

Modifiez le Dockerfile pour utiliser Alpine au lieu de scratch (utile si vous avez besoin de debugging) :

```dockerfile
FROM golang:1.21-alpine AS builder
# ... même chose ...

FROM alpine:3.18
RUN apk --no-cache add ca-certificates
COPY --from=builder /build/app /app
USER 1000:1000
ENTRYPOINT ["/app"]
```

---

## 📚 Ressources

- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Distroless Images](https://github.com/GoogleContainerTools/distroless)
- [Scratch Image](https://hub.docker.com/_/scratch)

---

⬅️ **Précédent** : [TP1 - Utilisateur Non-Root](./TP1-non-root-user.md)

➡️ **Suivant** : [TP3 - Isolation Réseau](./TP3-network-isolation.md)
