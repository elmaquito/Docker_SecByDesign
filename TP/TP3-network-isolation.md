# TP3 - Isolation Réseau des Conteneurs

## 🎯 Objectif

Apprendre à isoler les conteneurs Docker en utilisant des réseaux séparés, appliquant ainsi le principe du moindre privilège au niveau réseau.

## ⏱️ Durée estimée : 45 minutes

## 📋 Prérequis

- TP1 et TP2 complétés
- Compréhension de base des réseaux TCP/IP

---

## 📖 Contexte Théorique

### Pourquoi isoler les réseaux ?

Par défaut, tous les conteneurs sur le même réseau Docker peuvent communiquer entre eux. C'est pratique mais dangereux :

1. **Mouvement latéral** : Un conteneur compromis peut attaquer les autres
2. **Fuite de données** : Accès non autorisé aux services internes
3. **Découverte de services** : Un attaquant peut scanner le réseau interne

### Architecture sécurisée typique

```
┌─────────────────────────────────────────────────────────────┐
│                        INTERNET                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND NETWORK (externe autorisé)                        │
│  ┌───────────────┐                                          │
│  │   Web/Nginx   │                                          │
│  └───────┬───────┘                                          │
└──────────┼──────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND + BACKEND NETWORK (pont)                          │
│  ┌───────────────┐                                          │
│  │      API      │                                          │
│  └───────┬───────┘                                          │
└──────────┼──────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND NETWORK (internal: true - pas d'accès externe)     │
│  ┌───────────────┐                                          │
│  │   Database    │                                          │
│  └───────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔬 Partie Pratique

### Étape 1 : Observer le réseau par défaut

```bash
# Créer deux conteneurs sur le réseau par défaut
docker run -d --name container1 alpine sleep 3600
docker run -d --name container2 alpine sleep 3600

# Vérifier qu'ils peuvent communiquer
docker exec container1 ping -c 2 container2
```

**Observation** : Les conteneurs peuvent se pinger par nom.

```bash
# Nettoyage
docker stop container1 container2
docker rm container1 container2
```

---

### Étape 2 : Examiner l'architecture de l'exemple

```bash
cd examples/network-isolation
ls -la
```

**Structure** :
- `Dockerfile.web` - Frontend (accès frontend uniquement)
- `Dockerfile.api` - API (accès frontend + backend)
- `Dockerfile.db` - Base de données (accès backend uniquement)

---

### Étape 3 : Analyser la configuration réseau

Examinez le fichier `docker-compose.yml` à la racine :

```bash
cd ..
cat docker-compose.yml | grep -A 20 "networks:"
```

**Points clés** :

```yaml
networks:
  frontend-network:
    driver: bridge
    # Réseau pour les services exposés

  backend-network:
    driver: bridge
    internal: true  # ⚠️ Pas d'accès à Internet !
```

L'option `internal: true` est cruciale : elle empêche tout accès à l'extérieur.

---

### Étape 4 : Démarrer l'environnement

```bash
# Créer le fichier de secret si nécessaire
cp secrets/db_password.txt.example secrets/db_password.txt

# Démarrer uniquement les services d'isolation réseau
docker compose up -d network-db network-api network-web

# Vérifier le statut
docker compose ps
```

---

### Étape 5 : Vérifier les réseaux créés

```bash
# Lister les réseaux
docker network ls | grep -E "(frontend|backend)"

# Inspecter le réseau frontend
docker network inspect docker_secbydesign_frontend-network

# Inspecter le réseau backend
docker network inspect docker_secbydesign_backend-network
```

**Observation** : Notez quels conteneurs sont attachés à chaque réseau.

---

### Étape 6 : Tester l'isolation - Web vers DB

```bash
# Depuis le conteneur Web, essayer de contacter la DB
docker exec security-network-web python -c "
import socket
try:
    socket.create_connection(('security-network-db', 8082), timeout=2)
    print('❌ ERREUR: Connection réussie (isolation défaillante)')
except Exception as e:
    print('✅ Connection bloquée:', type(e).__name__)
"
```

**Résultat attendu** : La connexion devrait être bloquée car le Web n'est pas sur le réseau backend.

---

### Étape 7 : Tester l'isolation - API vers DB

```bash
# Depuis le conteneur API, contacter la DB (devrait fonctionner)
docker exec security-network-api python -c "
import urllib.request
try:
    response = urllib.request.urlopen('http://security-network-db:8082/data', timeout=2)
    print('✅ API peut contacter DB:', response.read().decode()[:50])
except Exception as e:
    print('❌ ERREUR:', e)
"
```

**Résultat attendu** : L'API peut contacter la DB car elle est sur les deux réseaux.

---

### Étape 8 : Tester l'accès Internet depuis le réseau interne

```bash
# La DB ne devrait pas pouvoir accéder à Internet
docker exec security-network-db python -c "
import urllib.request
try:
    urllib.request.urlopen('http://google.com', timeout=5)
    print('❌ ERREUR: Accès Internet possible (isolation défaillante)')
except Exception as e:
    print('✅ Internet bloqué:', type(e).__name__)
"
```

**Résultat attendu** : Timeout ou erreur de connexion.

---

### Étape 9 : Visualiser les connexions

```bash
# Accéder à l'interface web
curl http://localhost:8082
```

Ou ouvrez `http://localhost:8082` dans un navigateur.

---

### Étape 10 : Nettoyage

```bash
# Arrêter les services
docker compose down

# Vérifier que les réseaux sont supprimés
docker network ls | grep -E "(frontend|backend)"
```

---

## ✅ Points de Vérification

Avant de passer au TP suivant, assurez-vous que :

- [ ] Vous comprenez la différence entre réseaux bridge et internal
- [ ] Vous savez créer des réseaux Docker
- [ ] Vous savez assigner des conteneurs à des réseaux spécifiques
- [ ] Vous comprenez le principe d'isolation par couches (frontend/backend)
- [ ] Vous savez tester l'isolation réseau

---

## 🎓 Pour Aller Plus Loin

### Exercice bonus 1 : Créer un réseau personnalisé

```bash
# Créer un réseau avec un sous-réseau spécifique
docker network create --subnet=172.28.0.0/16 custom-network

# Lancer un conteneur avec IP fixe
docker run -d --net custom-network --ip 172.28.1.1 --name fixed-ip alpine sleep 3600

# Vérifier
docker inspect fixed-ip | grep IPAddress
```

### Exercice bonus 2 : Ajouter des règles de pare-feu

```bash
# Voir les règles iptables créées par Docker
sudo iptables -L DOCKER-USER -v -n
```

### Exercice bonus 3 : Tester avec nmap

```bash
# Depuis un conteneur, scanner le réseau
docker run --rm --net docker_secbydesign_frontend-network networkstatic/nmap -sn 172.18.0.0/16
```

---

## 📚 Ressources

- [Docker Networking](https://docs.docker.com/network/)
- [Network Isolation](https://docs.docker.com/network/bridge/)
- [Docker Compose Networking](https://docs.docker.com/compose/networking/)

---

⬅️ **Précédent** : [TP2 - Multi-Stage Build](./TP2-multi-stage-build.md)

➡️ **Suivant** : [TP4 - Gestion des Secrets](./TP4-secrets-management.md)
