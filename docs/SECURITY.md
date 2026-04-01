# NOTIMATIC — Documentation Sécurité

> **Document** : Architecture de sécurité, modèle de menaces et procédures opérationnelles  
> **Projet** : NOTIMATIC — Application de prise de notes sécurisée  
> **Version du document** : 1.0  
> **Date** : 1er avril 2026  
> **Auteur** : GitHub Copilot Agent

---

## Sommaire

1. [Mesures de Sécurité Implémentées](#1-mesures-de-sécurité-implémentées)
2. [Architecture d'Authentification Zero-Trust](#2-architecture-dauthentification-zero-trust)
   - 2.1 [Composants](#21-composants)
   - 2.2 [Flux d'authentification](#22-flux-dauthentification)
   - 2.3 [Endpoints Auth](#23-endpoints-auth)
   - 2.4 [Configuration des Cookies](#24-configuration-des-cookies)
3. [Modèle de Menaces (STRIDE)](#3-modèle-de-menaces-stride)
4. [Checklist de Déploiement Sécurisé](#4-checklist-de-déploiement-sécurisé)
5. [Procédures de Réponse aux Incidents](#5-procédures-de-réponse-aux-incidents)
6. [Roadmap Sécurité Avancée](#6-roadmap-sécurité-avancée)

### Annexes
- [Annexe A — Variables d'Environnement](#annexe-a--variables-denvironnement)
- [Annexe B — Génération des Secrets](#annexe-b--génération-des-secrets)
- [Annexe C — Tests de Sécurité Manuels](#annexe-c--tests-de-sécurité-manuels)

---

## 1. Mesures de Sécurité Implémentées

État au **v1.2.0** (1er avril 2026) — basé sur l'inspection du code source.

### 1.1 Mesures Actives

| Couche | Mesure | Technologie | Détail |
|--------|--------|-------------|--------|
| **Auth** | JWT HTTP-only cookies | `jsonwebtoken` 9.x | Access token 15 min + Refresh token 30 j |
| **Auth** | Hashing mots de passe | `argon2` (Argon2id) | Salt aléatoire, résistant GPU |
| **Auth** | Refresh tokens opaques | `crypto.randomBytes` | Hash SHA-256 en BDD — usage unique via `/refresh` |
| **Transport** | Headers sécurité | `helmet` 7.x | CSP, X-Frame-Options, HSTS, X-Content-Type |
| **Transport** | CORS strict | `cors` 2.8.5 | Origins explicitement listées dans `CORS_ORIGINS` |
| **API** | Rate limiting global | `express-rate-limit` 8.x | 100 req / 15 min / IP |
| **API** | Rate limiting auth | `express-rate-limit` | 15 req / 1 h / IP (brute-force) |
| **API** | Rate limiting commentaires | `express-rate-limit` | 10 req / 1 min / IP |
| **Input** | Sanitization backend | `validator` 13.x | Validation et nettoyage de toutes les entrées |
| **Input** | Sanitization frontend | `DOMPurify` 3.x | Wrapper `utils/sanitize.ts` sur tout le contenu affiché |
| **DB** | Anti-injection SQL | `pg` (node-postgres) | Requêtes paramétrées `$1, $2, …` systématiques |
| **Validation** | Schémas stricts | `zod` 3.x | Validation entrée/sortie sur tous les endpoints |
| **Audit** | Journal d'actions | `AuditLogger` (BDD) | Table `audit_logs` — actions sensibles tracées |
| **RGPD** | Export de données | `GET /api/v1/users/:id/export` | JSON de toutes les données utilisateur |
| **RGPD** | Suppression / anonymisation | `DELETE /api/v1/users/:id` | Soft-delete + anonymisation (admin) |
| **CI/CD** | Scan dépendances | `npm audit` | Niveau `critical` bloquant en CI |
| **CI/CD** | Scan images Docker | `Trivy` | Niveau `CRITICAL` sur images Docker |
| **RBAC** | Contrôle d'accès | Middleware `authorize()` | 4 rôles : admin, technician, teacher, student |

### 1.2 Mesures Non Encore Implémentées

| Mesure | Priorité | Notes |
|--------|----------|-------|
| 2FA TOTP | 🔴 Haute | Google Authenticator / Authy — obligatoire admin |
| Endpoint `GET /api/v1/audit` | 🔴 Haute | Consultation des logs d'audit (admin) |
| Rotation automatique des secrets | 🟡 Moyenne | Vault ou AWS SSM (actuellement `.env`) |
| Interface "Activités récentes" | 🟡 Moyenne | Vue utilisateur de ses propres audit logs |
| DAST / OWASP ZAP | 🟢 Basse | Scan dynamique en CI |
| SIEM / SOAR | 🟢 Basse | Stack Elasticsearch + Wazuh (voir [section 6](#6-roadmap-sécurité-avancée)) |

---

## 2. Architecture d'Authentification Zero-Trust

NOTIMATIC implémente un système d'authentification Zero-Trust avec des access tokens JWT de courte durée et des refresh tokens opaques rotatifs à usage unique.

### 2.1 Composants

#### Access Tokens (JWT)

| Propriété | Valeur |
|-----------|--------|
| Durée | 15 minutes |
| Type | JSON Web Token (HS256) |
| Stockage client | Cookie `auth_token` (HttpOnly) |
| Claims | `id`, `username`, `role` |
| Auto-refresh | Oui — le middleware `authenticate()` rafraîchit silencieusement l'access token si le refresh token est valide |

#### Refresh Tokens (Opaques)

| Propriété | Valeur |
|-----------|--------|
| Durée | 30 jours |
| Génération | `crypto.randomBytes(32)` → 64 caractères hex |
| Stockage client | Cookie `refresh_token` (HttpOnly) |
| Stockage serveur | Hash SHA-256 dans la table `sessions` |
| Rotation | Usage unique via `POST /auth/refresh` (nouveau access + nouveau refresh, ancien révoqué) |
| Auto-refresh | Renouvelle **uniquement** l'access token (sans rotation du refresh) |

#### Table `sessions` (migration 008)

```sql
CREATE TABLE sessions (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash  VARCHAR(64) NOT NULL UNIQUE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    user_agent          TEXT,
    ip_address          VARCHAR(45),
    revoked             BOOLEAN DEFAULT FALSE,
    revoked_at          TIMESTAMP WITH TIME ZONE
);
```

### 2.2 Flux d'Authentification

#### Connexion (`POST /auth/login`)

```
Client                          Backend                        BDD
  │                                │                             │
  │── username + password ────────►│                             │
  │                                │── Vérifie Argon2 ──────────►│
  │                                │◄── users.row ──────────────│
  │                                │                             │
  │                                │── INSERT INTO sessions ────►│
  │                                │                             │
  │◄── Cookies HttpOnly ──────────│  (auth_token + refresh_token)
  │    + corps JSON (user info)    │
```

#### Auto-refresh Transparent (Middleware `authenticate`)

```
Client                          Middleware                     BDD
  │                                │                             │
  │── Requête avec access token ──►│                             │
  │   expiré                       │── Vérifie access token      │
  │                                │   → EXPIRÉ                  │
  │                                │── Vérifie refresh_token ───►│
  │                                │◄── session valide ─────────│
  │                                │── Génère nouveau JWT        │
  │                                │── Définit nouveau cookie    │
  │◄── Réponse normale ───────────│   (transparent pour client) │
```

#### Rotation via `/auth/refresh`

```
POST /auth/refresh
1. Valide refresh token → BDD
2. Génère NOUVEAU access token (JWT)
3. Génère NOUVEAU refresh token (opaque)
4. Révoque l'ANCIEN refresh token (sessions.revoked = true)
5. Insère le hash du nouveau refresh token
6. Définit les deux nouveaux cookies
```

#### Déconnexion (`POST /auth/logout`)

```
1. Révoque le refresh token courant en BDD
2. Efface auth_token + refresh_token cookies
3. Client redirigé vers /login
```

### 2.3 Endpoints Auth

| Méthode | Endpoint | Auth requise | Description |
|---------|----------|-------------|-------------|
| `POST` | `/api/v1/auth/login` | Non | Connexion — émet les deux cookies |
| `POST` | `/api/v1/auth/logout` | Oui | Déconnexion — révoque la session |
| `POST` | `/api/v1/auth/refresh` | Non | Rotation complète (nouveau access + refresh) |
| `POST` | `/api/v1/auth/request-password-reset` | Non | Demande de réinitialisation (token SHA-256) |
| `POST` | `/api/v1/auth/reset-password` | Non | Finalisation avec le token |

### 2.4 Configuration des Cookies

| Environnement | `httpOnly` | `secure` | `sameSite` |
|---------------|-----------|---------|-----------|
| `development` | `true` | `false` | `lax` |
| `production` | `true` | `true` | `none` (requiert HTTPS) |

> **Note** : En production, `sameSite: 'none'` combiné avec `secure: true` permet les requêtes cross-origin (frontend séparé du backend) tout en restant sécurisé via HTTPS.

---

## 3. Modèle de Menaces (STRIDE)

Analyse des flux critiques : authentification et stockage des notes.

| Menace STRIDE | Description | Probabilité | Impact | Mitigations (implémentées ✅ / planifiées 🔄) |
|---------------|-------------|-------------|--------|----------------------------------------------|
| **S**poofing | Vol de token JWT ou usurpation d'IP | Moyenne | Critique | ✅ Tokens 15 min · ✅ HttpOnly cookies · 🔄 2FA TOTP |
| **T**ampering | Modification de données en transit ou d'images Docker | Faible | Critique | ✅ TLS (Traefik) · ✅ Requêtes paramétrées · 🔄 Images signées (Cosign) |
| **R**epudiation | Déni d'actions (suppression de note) | Moyenne | Moyen | ✅ `audit_logs` en BDD · 🔄 WORM storage |
| **I**nformation Disclosure | Fuite via logs ou injection SQL | Moyenne | Critique | ✅ Requêtes paramétrées · ✅ Erreurs génériques · 🔄 Chiffrement at-rest |
| **D**enial of Service | Saturation API par botnet | Élevée | Moyen | ✅ Rate limiting (API/auth/comments) · ✅ Helmet · 🔄 WAF |
| **E**levation of Privilege | Exploitation container → root hôte | Faible | Critique | ✅ Non-root user Docker · ✅ RBAC middleware · 🔄 Seccomp profile |

---

## 4. Checklist de Déploiement Sécurisé

### 4.1 Pré-Déploiement

- [ ] Générer `JWT_SECRET` ≥ 32 bytes : `openssl rand -hex 32`
- [ ] Générer `REFRESH_TOKEN_SECRET` ≥ 32 bytes : `openssl rand -hex 32`
- [ ] Générer `DB_PASSWORD` fort et unique
- [ ] Définir `NODE_ENV=production`
- [ ] Configurer `CORS_ORIGINS` avec les domaines de production **seulement**
- [ ] S'assurer que HTTPS est configuré (certificat valide)
- [ ] Vérifier que les ports BDD (5432) ne sont **pas** exposés sur Internet
- [ ] Appliquer toutes les migrations (`bash backend/migrate.sh`)

### 4.2 Configuration Docker Swarm

```bash
# Générer les secrets
openssl rand -hex 32 | docker secret create jwt_secret -
openssl rand -hex 32 | docker secret create refresh_secret -
printf "your_db_password" | docker secret create db_password -

# Déployer
docker stack deploy -c infrastructure/docker-compose.prod.yml notimatic
```

### 4.3 Post-Déploiement

- [ ] Tester le flux de connexion complet (login → note → logout)
- [ ] Vérifier les headers de sécurité : `curl -I https://votre-domaine/api/v1/health`
  - `strict-transport-security` présent
  - `x-frame-options: SAMEORIGIN`
  - `x-content-type-options: nosniff`
  - `content-security-policy` présent
- [ ] Tester que `DEBUG` ou infos sensibles ne fuient pas dans les erreurs d'API
- [ ] Vérifier que le rate limiting fonctionne (15 essais de connexion → 429)
- [ ] Confirmer que `npm audit --audit-level=critical` retourne 0 vulnérabilités

### 4.4 Maintenance Continue

| Fréquence | Action |
|-----------|--------|
| À chaque déploiement | `npm audit --audit-level=critical` + Trivy scan |
| Hebdomadaire | Revue des `audit_logs` pour anomalies |
| Mensuel | Rotation des secrets JWT (si possible) |
| Trimestriel | Audit dépendances complet + tests de pénétration internes |

---

## 5. Procédures de Réponse aux Incidents

### 5.1 Fuite de Secret (JWT_SECRET, DB_PASSWORD, etc.)

#### Détection
- Activité anormale en BDD (connexions depuis IPs inconnues)
- Commit git contenant un secret (scan automatique)

#### Endiguement
```bash
# 1. Bloquer les IPs suspectes (niveau Traefik/Firewall)
# 2. Mettre en pause le conteneur suspect (ne pas le tuer — analyse forensique)
docker pause <container_id>
```

#### Éradication
```bash
# 3. Révoquer et régénérer le secret compromis
openssl rand -hex 32  # nouveau JWT_SECRET

# 4. Mettre à jour Docker Swarm secrets (rolling update sans downtime)
echo "new_jwt_secret" | docker secret create jwt_secret_v2 -
docker service update --secret-rm jwt_secret --secret-add jwt_secret_v2 notimatic_backend
```

#### Récupération
```bash
# 5. Forcer la déconnexion de toutes les sessions actives
# (via l'endpoint POST /api/v1/auth/revoke — admin)
curl -X POST https://votre-domaine/api/v1/auth/revoke -b cookies.txt
```

#### Post-Mortem
- Analyser comment le secret a fuité (commit git ? variable d'environnement loguée ?)
- Ajouter un hook `pre-commit` pour prévenir les futurs commits de secrets

### 5.2 Tentative de Brute-Force

**Indicateurs** : taux de 429 élevé sur `/auth/login`, pics dans `audit_logs`

**Actions** :
1. Le rate limiter (15 req / h / IP) bloque automatiquement
2. Identifier l'IP source dans les logs Traefik
3. Ajouter une règle de blocage IP (Traefik middleware)
4. Vérifier dans `audit_logs` si des connexions ont réussi avant le blocage
5. Notifier les utilisateurs concernés (réinitialisation de mot de passe)

### 5.3 Injection SQL Suspectée

**Indicateurs** : erreurs BDD inhabituelles, données manquantes ou corrompues

**Actions** :
1. Toutes les requêtes utilisent des paramètres `$1, $2, …` — le risque est faible
2. Inspecter les logs d'accès pour les payloads suspects
3. Vérifier la table `audit_logs` pour les opérations inhabituelles
4. Déclencher un dump BDD immédiat pour analyse forensique

---

## 6. Roadmap Sécurité Avancée

Items post-v1.0.0 — non encore implémentés, priorisés pour les prochaines versions.

### 6.1 Court Terme (v1.x)

| Feature | Description | Priorité |
|---------|-------------|----------|
| **2FA TOTP** | Google Authenticator / Authy pour admins | 🔴 Haute |
| **Endpoint audit admin** | `GET /api/v1/audit` avec pagination et filtres | 🔴 Haute |
| **ESLint plugin security** | `eslint-plugin-security` sur le backend + frontend | 🟡 Moyenne |
| **Rotation secrets** | Vault (HashiCorp) ou AWS SSM Parameter Store | 🟡 Moyenne |
| **Vue activités** | Interface utilisateur pour consulter ses propres logs | 🟡 Moyenne |

### 6.2 Moyen Terme (v1.x+)

| Feature | Description |
|---------|-------------|
| **DAST** | OWASP ZAP en CI sur staging |
| **Images signées** | Cosign (Sigstore) — intégrité des images Docker |
| **Secrets management** | HashiCorp Vault ou AWS Secrets Manager |
| **Chiffrement at-rest** | PostgreSQL Transparent Data Encryption (TDE) |

### 6.3 Long Terme (v2.0+)

Implémentation d'une stack SIEM/SOAR complète :
- **Elasticsearch + Kibana** — centralisation et visualisation des logs
- **Wazuh** — SIEM et détection d'intrusion
- **Falco** — surveillance runtime des containers (eBPF)
- **Suricata** — IDS/IPS réseau
- **Shuffle SOAR** — réponse automatisée aux incidents

> Cette stack nécessite ≥ 16 GB RAM et une infrastructure dédiée. Elle est documentée dans les archives du projet.

---

## Annexe A — Variables d'Environnement

| Variable | Obligatoire | Description | Exemple |
|----------|------------|-------------|---------|
| `JWT_SECRET` | **Oui** | Secret HMAC pour signer les JWT | `openssl rand -hex 32` |
| `REFRESH_TOKEN_SECRET` | **Oui** | Secret pour le contexte refresh tokens | `openssl rand -hex 32` |
| `DB_PASSWORD` | **Oui** | Mot de passe PostgreSQL | Minimum 20 caractères |
| `NODE_ENV` | **Oui** | Environnement | `production` |
| `CORS_ORIGINS` | **Oui** | Origines CORS autorisées | `https://app.example.com` |
| `PORT` | Non | Port interne | `3000` |
| `DB_HOST` | Non | Hôte PostgreSQL | `database` |
| `DB_USER` | Non | Utilisateur PostgreSQL | `notimatic_prod` |
| `DB_NAME` | Non | Nom de la BDD | `notimatic_prod` |

---

## Annexe B — Génération des Secrets

```bash
# JWT_SECRET (minimum 32 bytes = 64 hex chars)
openssl rand -hex 32
# → ex: a3f8c2e1d4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1

# REFRESH_TOKEN_SECRET
openssl rand -hex 32

# Mot de passe BDD fort
openssl rand -base64 32
```

> ⚠️ Ne jamais commiter ces valeurs dans le code source. Utiliser `.env` (exclu de git) ou Docker Secrets en production.

---

## Annexe C — Tests de Sécurité Manuels

### Connexion et vérification des cookies

```bash
# 1. Connexion
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"AdminPass123!"}' \
  -c cookies.txt -v

# 2. Accès protégé
curl http://localhost:3001/api/v1/notes -b cookies.txt

# 3. Vérifier les headers de sécurité
curl -I http://localhost:3001/api/v1/health

# 4. Rotation de token
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -b cookies.txt -c cookies.txt -v

# 5. Déconnexion
curl -X POST http://localhost:3001/api/v1/auth/logout \
  -b cookies.txt -v
```

### Vérifier que le rate limiting fonctionne

```bash
# Envoyer 16 tentatives de connexion avec mauvais mot de passe → doit obtenir 429
for i in $(seq 1 16); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3001/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrongpassword"}'
done
# Les dernières requêtes doivent retourner 429
```

---

**Auteur** : GitHub Copilot Agent  
**Date** : 1er avril 2026  
**Version** : 1.0
