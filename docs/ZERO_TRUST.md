# Zero-Trust Authentication Architecture

## Overview

NOTIMATIC implémente un système d'authentification Zero-Trust utilisant des tokens d'accès JWT de courte durée combinés avec des refresh tokens opaques rotatifs.

## Architecture Components

### 1. Access Tokens (JWT)
- **Durée**: 15 minutes
- **Type**: JSON Web Token (JWT)
- **Stockage**: Cookie HttpOnly (`auth_token`)
- **Objectif**: Authentifier les requêtes API
- **Claims**: `id`, `username`, `role`
- **Auto-refresh**: Le middleware rafraîchit automatiquement le token expiré avec le refresh token

### 2. Refresh Tokens (Opaque)
- **Durée**: 30 jours
- **Type**: Token aléatoire cryptographiquement sécurisé (64 caractères hex)
- **Stockage**: 
  - Client: Cookie HttpOnly (`refresh_token`)
  - Serveur: Hash SHA-256 dans la table `sessions`
- **Objectif**: Obtenir de nouveaux access tokens
- **Rotation**: Usage unique - chaque refresh génère un nouveau token et révoque l'ancien

### 3. Table Sessions
Stocke les métadonnées des refresh tokens:
- `id`: Identifiant unique de session
- `user_id`: Clé étrangère vers la table users
- `refresh_token_hash`: Hash SHA-256 du refresh token
- `created_at`: Timestamp de création de session
- `expires_at`: Timestamp d'expiration (30 jours depuis création)
- `user_agent`: User agent du navigateur/client
- `ip_address`: Adresse IP du client
- `revoked`: Drapeau booléen pour sessions révoquées
- `revoked_at`: Timestamp de révocation

## Flux d'Authentification

### Flux de Connexion
```
1. L'utilisateur soumet ses identifiants (username + password)
2. Le serveur valide les identifiants
3. Le serveur génère:
   - Access token court (JWT, 15min)
   - Refresh token long (opaque, 30 jours)
4. Le serveur stocke le hash du refresh token dans la table sessions
5. Le serveur définit les deux tokens comme cookies HttpOnly
6. Le serveur retourne les infos utilisateur + access token dans le corps de réponse
```

### Flux de Rafraîchissement Automatique (Middleware)
```
1. Le client fait une requête avec un access token expiré
2. Le middleware détecte l'expiration du token
3. Le middleware vérifie la présence du refresh token cookie
4. Le middleware valide le refresh token contre la base de données
5. Le middleware génère un NOUVEAU access token
6. Le middleware définit le nouveau cookie d'access token
7. La requête continue normalement (transparent pour le client)
```

### Flux de Rafraîchissement Manuel (Endpoint /refresh)
```
1. Le client appelle /api/v1/auth/refresh
2. Le serveur valide le refresh token
3. Le serveur génère un NOUVEAU access token + NOUVEAU refresh token
4. Le serveur révoque l'ancien refresh token (le marque comme révoqué en DB)
5. Le serveur stocke le hash du nouveau refresh token
6. Le serveur définit les nouveaux cookies et retourne le nouveau access token
```

### Flux de Déconnexion
```
1. Le client appelle /api/v1/auth/logout
2. Le serveur révoque le refresh token dans la base de données
3. Le serveur efface les deux cookies
4. Le client est déconnecté
```

### Flux de Révocation de Toutes les Sessions
```
1. Le client appelle /api/v1/auth/revoke
2. Le serveur révoque TOUS les refresh tokens de l'utilisateur
3. Le serveur efface les cookies
4. Toutes les sessions utilisateur sur tous les appareils sont invalidées
```

## API Endpoints

### POST /api/v1/auth/login
Authentifier l'utilisateur et émettre les tokens.

**Requête:**
```json
{
  "username": "user123",
  "password": "securePassword123!"
}
```

**Réponse:**
```json
{
  "message": "Logged in",
  "user": {
    "id": 1,
    "username": "user123",
    "role": "student"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Cookies Définis:**
- `auth_token`: Access token (15min, HttpOnly)
- `refresh_token`: Refresh token (30 jours, HttpOnly)

### POST /api/v1/auth/refresh
Rotation du refresh token et obtention d'un nouveau access token.

**Requête:** Pas de corps requis (utilise le cookie refresh_token)

**Réponse:**
```json
{
  "message": "Token refreshed",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "user123",
    "role": "student"
  }
}
```

**Cookies Définis:**
- `auth_token`: Nouveau access token (15min, HttpOnly)
- `refresh_token`: Nouveau refresh token (30 jours, HttpOnly)

**Réponses d'Erreur:**
- `401`: Aucun refresh token fourni
- `403`: Refresh token invalide ou expiré

**Note Importante:** L'endpoint /refresh effectue une rotation complète (nouveau access token ET nouveau refresh token). Le middleware d'authentification, lui, rafraîchit SEULEMENT l'access token sans rotation du refresh token pour des raisons de performance.

### POST /api/v1/auth/logout
Déconnexion de la session actuelle.

**Requête:** Pas de corps requis (endpoint authentifié)

**Réponse:**
```json
{
  "message": "Logged out"
}
```

**Cookies Effacés:**
- `auth_token`
- `refresh_token`

### POST /api/v1/auth/revoke
Révoquer toutes les sessions utilisateur (déconnexion de tous les appareils).

**Requête:** Pas de corps requis (endpoint authentifié)

**Réponse:**
```json
{
  "message": "All sessions revoked"
}
```

**Cookies Effacés:**
- `auth_token`
- `refresh_token`

## Configuration des Cookies

### Environnement de Développement
```javascript
{
  httpOnly: true,
  secure: false,
  sameSite: 'lax'
}
```

### Environnement de Production
```javascript
{
  httpOnly: true,
  secure: true,        // Nécessite HTTPS
  sameSite: 'none'     // Permet les requêtes cross-site via HTTPS
}
```

## Variables d'Environnement

### Variables Requises

| Variable | Description | Exemple |
|----------|-------------|---------|
| `JWT_SECRET` | Secret pour signer les access tokens JWT | `your-super-secret-jwt-key-change-me` |
| `REFRESH_TOKEN_SECRET` | Secret pour hasher les refresh tokens | `your-refresh-token-secret-change-me` |
| `NODE_ENV` | Environnement (development/production) | `production` |
| `CORS_ORIGINS` | Liste d'origines autorisées séparées par virgule | `https://app.example.com,https://admin.example.com` |

### Variables Optionnelles

| Variable | Description | Défaut |
|----------|-------------|---------|
| `PORT` | Port du serveur | `3000` |
| `DB_HOST` | Nom d'hôte de la base de données | `database` |
| `DB_USER` | Nom d'utilisateur de la base de données | `user` |
| `DB_PASSWORD` | Mot de passe de la base de données | `dev_secret_password` |
| `DB_NAME` | Nom de la base de données | `notimatic_dev` |

## Fonctionnalités de Sécurité

### 1. Rotation des Tokens
- Les refresh tokens sont à **usage unique** quand utilisés via l'endpoint /refresh
- Chaque refresh invalide le token précédent
- Prévient les attaques par rejeu de token
- Le middleware rafraîchit automatiquement l'access token sans rotation du refresh token

### 2. Stockage Sécurisé
- Les tokens ne sont jamais stockés dans localStorage ou sessionStorage
- Les cookies HttpOnly préviennent les attaques XSS
- Le refresh token est stocké sous forme de hash SHA-256 en base de données

### 3. HTTPS en Production
- Le flag de cookie `secure: true` force HTTPS
- Les en-têtes HSTS empêchent les attaques de dégradation de protocole
- SameSite='none' nécessite une connexion sécurisée

### 4. Suivi des Sessions
- User agent et adresse IP enregistrés pour chaque session
- Permet une piste d'audit et la détection d'anomalies
- Supporte les fonctionnalités de gestion de session

### 5. Expiration des Tokens
- Access tokens de courte durée (15 min) limitent la fenêtre d'exposition
- Refresh tokens de longue durée (30 jours) réduisent la friction de connexion
- Nettoyage automatique des sessions expirées

### 6. Auto-Refresh Transparent
- Le middleware détecte automatiquement les access tokens expirés
- Utilise le refresh token pour générer un nouvel access token
- Transparent pour le client - pas besoin de gérer l'expiration côté client
- Améliore l'expérience utilisateur

## Checklist de Déploiement

### Pré-Déploiement

- [ ] Générer un `JWT_SECRET` fort (minimum 32 caractères)
- [ ] Générer un `REFRESH_TOKEN_SECRET` fort (minimum 32 caractères)
- [ ] Définir `NODE_ENV=production`
- [ ] Configurer `CORS_ORIGINS` avec les domaines de production
- [ ] S'assurer que HTTPS est configuré et forcé
- [ ] Exécuter les migrations de base de données (incluant `008_add_sessions.sql`)

### Configuration de la Base de Données

```bash
# Appliquer les migrations
cd backend
bash migrate.sh

# Ou appliquer manuellement la migration des sessions
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/008_add_sessions.sql
```

### Configuration d'Environnement

```bash
# Exemple .env de production
NODE_ENV=production
PORT=3000

# Base de données
DB_HOST=your-db-host.example.com
DB_USER=notimatic_prod
DB_PASSWORD=<mot-de-passe-base-de-données-fort>
DB_NAME=notimatic_prod

# Sécurité
JWT_SECRET=<générer-avec-openssl-rand-hex-32>
REFRESH_TOKEN_SECRET=<générer-avec-openssl-rand-hex-32>

# CORS
CORS_ORIGINS=https://app.example.com,https://admin.example.com
```

### Générer les Secrets

```bash
# Générer le secret JWT
openssl rand -hex 32

# Générer le secret refresh token
openssl rand -hex 32
```

### Post-Déploiement

- [ ] Vérifier que HTTPS fonctionne
- [ ] Tester le flux de connexion
- [ ] Tester le rafraîchissement de token
- [ ] Tester la déconnexion
- [ ] Surveiller le job de nettoyage de session
- [ ] Vérifier les en-têtes de sécurité (HSTS, CSP, etc.)

## Tests

### Tests Manuels avec curl

#### 1. Connexion
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"AdminPassword123!"}' \
  -c cookies.txt \
  -v
```

#### 2. Accéder à un Endpoint Protégé
```bash
curl -X GET http://localhost:3000/api/v1/notes \
  -b cookies.txt \
  -v
```

#### 3. Créer une Note (Test d'Auto-Refresh)
```bash
# Attendre 16 minutes pour que l'access token expire
# Puis essayer de créer une note - devrait fonctionner grâce à l'auto-refresh
curl -X POST http://localhost:3000/api/v1/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Note","content":"This should work even with expired access token"}' \
  -b cookies.txt \
  -c cookies.txt \
  -v
```

#### 4. Rafraîchir le Token Manuellement
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -b cookies.txt \
  -c cookies.txt \
  -v
```

#### 5. Déconnexion
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -b cookies.txt \
  -v
```

### Tests Automatisés

Exécuter les tests unitaires et d'intégration:

```bash
cd backend
npm test
```

Exécuter les tests E2E:

```bash
npm run test:e2e
```

## Monitoring & Maintenance

### Session Cleanup

The system includes a cleanup function to remove expired and revoked sessions. You can run this periodically via a cron job:

```javascript
// Cleanup expired sessions (can be called via API endpoint or cron)
const deletedCount = await tokenService.cleanupExpiredSessions();
console.log(`Cleaned up ${deletedCount} expired sessions`);
```

### Recommended Cron Schedule

```bash
# Clean up expired sessions daily at 2 AM
0 2 * * * /path/to/cleanup-script.sh
```

### Monitoring Metrics

Monitor these metrics in production:
- Active sessions count
- Session creation rate
- Refresh token rotation rate
- Failed authentication attempts
- Average session duration

## Dépannage

### Problème: Les cookies ne sont pas définis

**Symptômes:** La connexion réussit mais les requêtes suivantes sont non autorisées

**Solutions:**
1. Vérifier que le frontend et le backend utilisent le même nom d'hôte (ne pas mélanger localhost/127.0.0.1)
2. Vérifier que les origines CORS incluent le domaine frontend
3. En production, s'assurer que HTTPS est activé

### Problème: Erreur "Unauthorized" lors de la création de notes

**Symptômes:** Les étudiants et professeurs reçoivent "Unauthorized" lors de la création de notes

**Solutions:**
1. **RÉSOLU**: Le middleware `authenticateToken` a été mis à jour pour auto-rafraîchir les access tokens expirés
2. Le système détecte maintenant automatiquement l'expiration et utilise le refresh token
3. Transparent pour l'utilisateur - pas besoin de se reconnecter

### Problème: La rotation du refresh token échoue

**Symptômes:** Le rafraîchissement du token retourne une erreur 403

**Solutions:**
1. Vérifier que la table sessions existe et que la migration a été appliquée
2. Vérifier que `REFRESH_TOKEN_SECRET` est correctement défini
3. Vérifier les logs de base de données pour les violations de contraintes
4. S'assurer que le refresh token n'a pas déjà été utilisé (usage unique via /refresh endpoint)

### Problème: Les sessions ne se nettoient pas

**Symptômes:** La base de données grandit avec d'anciens enregistrements de session

**Solutions:**
1. Implémenter un job de nettoyage automatisé
2. Appeler `cleanupExpiredSessions()` périodiquement
3. Vérifier que les triggers de base de données fonctionnent

## Migration depuis l'Ancien Système d'Authentification

Si vous migrez depuis l'ancien système d'authentification:

1. **Exécuter la migration**: Appliquer `008_add_sessions.sql`
2. **Mise à jour du code**: Les nouveaux endpoints sont rétrocompatibles
3. **Changements client**: Aucun changement requis - les cookies fonctionnent de manière transparente
4. **Chemin de dépréciation**: 
   - Les anciens cookies auth_token fonctionnent toujours (durée de vie 15min)
   - Les utilisateurs seront invités à se reconnecter après 15 minutes
   - La nouvelle connexion crée automatiquement le refresh token
5. **Auto-refresh transparent**:
   - Le middleware détecte et rafraîchit automatiquement les tokens expirés
   - Les utilisateurs ne verront plus d'erreurs "Unauthorized" inattendues
   - L'expérience utilisateur est grandement améliorée

## Considérations de Sécurité

### Modèle de Menace

| Menace | Mitigation |
|--------|------------|
| XSS (Cross-Site Scripting) | Les cookies HttpOnly empêchent l'accès JavaScript |
| CSRF (Cross-Site Request Forgery) | Cookies SameSite + restrictions CORS |
| Rejeu de Token | Refresh tokens à usage unique avec rotation (endpoint /refresh) |
| Man-in-the-Middle | Enforcement HTTPS en production |
| Fixation de Session | Nouveaux tokens générés à chaque connexion |
| Credential Stuffing | Rate limiting (à implémenter) |

### Bonnes Pratiques

1. **Ne jamais logger les tokens** - Les tokens ne doivent jamais apparaître dans les logs applicatifs
2. **Rotation régulière des secrets** - Changer JWT_SECRET et REFRESH_TOKEN_SECRET périodiquement
3. **Surveiller les anomalies** - Surveiller les patterns de session inhabituels (nombreuses sessions depuis différentes IPs)
4. **Implémenter le rate limiting** - Protéger les endpoints /auth/login et /auth/refresh
5. **Utiliser des mots de passe forts** - Forcer un minimum de 12 caractères avec complexité
6. **Activer le MFA** - L'authentification multi-facteurs ajoute une couche de sécurité supplémentaire (amélioration future)

## Références

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [RFC 7519 - JSON Web Tokens](https://tools.ietf.org/html/rfc7519)
- [RFC 6749 - OAuth 2.0](https://tools.ietf.org/html/rfc6749)

## FAQ

### Q: Pourquoi utiliser à la fois des access tokens et des refresh tokens?

**R:** Les access tokens de courte durée (15 min) limitent la fenêtre d'exploitation si un token est compromis. Les refresh tokens de longue durée (30 jours) permettent une expérience utilisateur fluide sans reconnexions fréquentes. Le middleware auto-refresh rend cela totalement transparent.

### Q: Que se passe-t-il si mon access token expire pendant l'utilisation?

**R:** Le middleware `authenticateToken` détecte automatiquement l'expiration et utilise votre refresh token pour obtenir un nouvel access token. Cela se fait côté serveur et est totalement transparent pour vous. Vous ne recevrez jamais d'erreur "Unauthorized" inattendue.

### Q: Comment fonctionne la rotation des refresh tokens?

**R:** Il y a deux scénarios:
1. **Via le middleware**: Quand un access token expire, le middleware génère uniquement un NOUVEAU access token (pas de rotation du refresh token) pour des raisons de performance.
2. **Via l'endpoint /refresh**: Quand vous appelez explicitement `/api/v1/auth/refresh`, le système génère à la fois un nouveau access token ET un nouveau refresh token, et révoque l'ancien refresh token (rotation complète).

### Q: Puis-je être connecté sur plusieurs appareils?

**R:** Oui! Chaque connexion crée une session séparée avec son propre refresh token. Vous pouvez utiliser `/api/v1/auth/revoke` pour déconnecter tous les appareils si nécessaire.

### Q: Les tokens sont-ils stockés dans le localStorage?

**R:** Non! Les tokens sont stockés dans des cookies HttpOnly, ce qui signifie qu'ils ne sont pas accessibles via JavaScript. Cela protège contre les attaques XSS.

### Q: Que se passe-t-il si quelqu'un vole mon refresh token?

**R:** Si un attaquant obtient votre refresh token:
1. Il peut l'utiliser UNE SEULE FOIS (via l'endpoint /refresh qui effectue la rotation)
2. Après utilisation, l'ancien token est révoqué
3. Vous pouvez révoquer toutes vos sessions via `/api/v1/auth/revoke`
4. Les tokens sont stockés en hash dans la base de données (pas en clair)
5. En production, HTTPS + cookies Secure empêchent l'interception
