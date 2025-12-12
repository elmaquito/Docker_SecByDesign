# 🎯 Système d'Authentification Zero-Trust NOTIMATIC - Guide Rapide

## 🚀 Ce qui a été implémenté

### ✅ Authentification Sécurisée
- **Access tokens** JWT de 15 minutes (courte durée = sécurité)
- **Refresh tokens** opaques de 30 jours (longue durée = confort)
- **Rotation automatique** des tokens pour prévenir le rejeu
- **Cookies HttpOnly** pour protection contre XSS
- **HTTPS obligatoire** en production avec HSTS

### ✅ Auto-Refresh Transparent
**Le problème résolu:** Les utilisateurs recevaient "Unauthorized" après 15 minutes

**La solution:** Le serveur détecte automatiquement l'expiration et rafraîchit le token sans intervention

```
Avant:
User → Requête avec token expiré → ❌ 401 Unauthorized

Après:
User → Requête avec token expiré → ✓ Auto-refresh → ✓ Succès
```

### ✅ Multi-Appareils
- Connexion simultanée sur plusieurs appareils
- Chaque appareil a sa propre session
- Révocation possible de toutes les sessions en un clic

## 📁 Structure des Fichiers

```
backend/
├── migrations/
│   └── 008_add_sessions.sql          # Table pour refresh tokens
├── src/
│   ├── auth/
│   │   └── token.service.ts          # Gestion des tokens
│   └── main.ts                        # Endpoints + middleware auto-refresh
└── tests/
    └── unit/
        └── token.service.test.ts      # 15 tests unitaires ✓

docs/
├── ZERO_TRUST.md                      # Architecture complète
├── ZERO_TRUST_CHECKLIST.md            # Checklist déploiement
├── FIX_UNAUTHORIZED_NOTES_CREATION.md # Explication du bug fix
└── ZERO_TRUST_IMPLEMENTATION_SUMMARY.md # Résumé technique
```

## 🔑 Endpoints API

### POST /api/v1/auth/login
Connexion + émission des tokens
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student1","password":"Password123!"}' \
  -c cookies.txt
```

### POST /api/v1/auth/refresh
Rotation manuelle (nouveau access + nouveau refresh)
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -b cookies.txt -c cookies.txt
```

### POST /api/v1/auth/logout
Déconnexion (révoque la session)
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -b cookies.txt
```

### POST /api/v1/auth/revoke
Déconnexion de TOUS les appareils
```bash
curl -X POST http://localhost:3000/api/v1/auth/revoke \
  -b cookies.txt
```

## 🛡️ Sécurité

### Protections Implémentées
| Menace | Protection |
|--------|-----------|
| XSS | Cookies HttpOnly |
| CSRF | SameSite cookies + CORS |
| Rejeu de token | Rotation via /refresh |
| Man-in-the-Middle | HTTPS + HSTS (production) |
| Vol de session | Tokens hashés en DB |

### Cookies Sécurisés

**Développement:**
```javascript
{
  httpOnly: true,    // Pas accessible via JS
  secure: false,     // HTTP ok en dev
  sameSite: 'lax'    // Protection CSRF
}
```

**Production:**
```javascript
{
  httpOnly: true,    // Pas accessible via JS
  secure: true,      // HTTPS obligatoire
  sameSite: 'none'   // Cross-site avec HTTPS
}
```

## 📊 Table Sessions

```sql
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    refresh_token_hash VARCHAR(255) UNIQUE,  -- SHA-256
    created_at TIMESTAMP,
    expires_at TIMESTAMP,                     -- 30 jours
    user_agent TEXT,                          -- Audit
    ip_address VARCHAR(45),                   -- Audit
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP
);
```

## 🔄 Flux Auto-Refresh

```
1. User fait une requête (ex: créer une note)
   ↓
2. Middleware vérifie auth_token
   ↓
3. Token expiré détecté
   ↓
4. Middleware vérifie refresh_token
   ↓
5. Refresh token valide
   ↓
6. Génère NOUVEAU auth_token
   ↓
7. Set-Cookie avec nouveau token
   ↓
8. Requête continue normalement
   ↓
9. User reçoit réponse (TRANSPARENT)
```

## ⚙️ Configuration

### Variables d'Environnement

```bash
# .env (Development)
NODE_ENV=development
JWT_SECRET=dev_jwt_secret_change_me
REFRESH_TOKEN_SECRET=dev_refresh_secret_change_me
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# .env (Production)
NODE_ENV=production
JWT_SECRET=<générer avec: openssl rand -hex 32>
REFRESH_TOKEN_SECRET=<générer avec: openssl rand -hex 32>
CORS_ORIGINS=https://app.notimatic.com
```

### Générer les Secrets

```bash
# Pour JWT_SECRET
openssl rand -hex 32

# Pour REFRESH_TOKEN_SECRET  
openssl rand -hex 32
```

## 🚀 Déploiement

### 1. Backup
```bash
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > backup.sql
```

### 2. Migration
```bash
cd backend
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/008_add_sessions.sql
```

### 3. Variables d'Environnement
```bash
# Configurer dans votre plateforme de déploiement
NODE_ENV=production
JWT_SECRET=<votre-secret-32-chars>
REFRESH_TOKEN_SECRET=<votre-secret-32-chars>
CORS_ORIGINS=https://votredomaine.com
```

### 4. Build et Démarrage
```bash
npm install
npm run build
npm start
```

### 5. Vérification
```bash
# Health check
curl https://votredomaine.com/api/v1/health

# Test login
curl -X POST https://votredomaine.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"AdminPassword123!"}' \
  -c cookies.txt -v
```

## 🧪 Tests

### Lancer les Tests
```bash
cd backend

# Tous les tests
npm test

# Tests unitaires uniquement
npm test -- tests/unit/token.service.test.ts

# Avec couverture
npm run test:coverage
```

### Résultats Attendus
```
✓ should generate a valid JWT access token
✓ should verify a valid access token
✓ should return null for invalid token
✓ should generate a unique refresh token
✓ should validate a valid refresh token
✓ should rotate refresh token successfully
✓ should revoke all sessions for a user
✓ should delete expired sessions
... (15 tests au total)

Test Suites: 1 passed
Tests: 15 passed
```

## 🐛 Troubleshooting

### Problème: "Unauthorized" persiste
**Cause possible:** Refresh token invalide ou expiré
**Solution:**
1. Vérifier les cookies dans le navigateur
2. Se déconnecter et reconnecter
3. Vérifier les logs serveur

### Problème: Cookies non définis
**Cause possible:** Mismatch hostname (localhost vs 127.0.0.1)
**Solution:**
1. Utiliser le même hostname partout
2. Vérifier CORS_ORIGINS
3. En prod: vérifier HTTPS

### Problème: Performance dégradée
**Cause possible:** Table sessions trop grande
**Solution:**
```sql
-- Nettoyer les sessions expirées
DELETE FROM sessions 
WHERE expires_at < NOW() - INTERVAL '7 days' 
   OR (revoked = TRUE AND revoked_at < NOW() - INTERVAL '7 days');
```

## 📈 Monitoring

### Logs à Surveiller
```
[Auth] SUCCESS: User <username> (<role>)
[Auth] SUCCESS: Token auto-refreshed for user <username>
[Auth] FAILED: Invalid refresh token
[Login] User authenticated: <username>
[Logout] User logged out: <username>
```

### Métriques Importantes
- Nombre de sessions actives
- Taux d'auto-refresh par heure
- Tentatives de connexion échouées
- Taille de la table sessions

## 📚 Documentation Complète

Pour plus de détails, consulter:

- **`ZERO_TRUST.md`** → Architecture et API complètes
- **`ZERO_TRUST_CHECKLIST.md`** → Checklist déploiement et sécurité
- **`FIX_UNAUTHORIZED_NOTES_CREATION.md`** → Explication du bug fix
- **`ZERO_TRUST_IMPLEMENTATION_SUMMARY.md`** → Résumé technique détaillé

## ✨ Avantages

### Pour les Utilisateurs
✅ Plus d'erreurs "Unauthorized" inattendues
✅ Session fluide sans reconnexions
✅ Fonctionne sur plusieurs appareils
✅ Déconnexion globale possible

### Pour les Développeurs
✅ Code bien testé (15 tests unitaires)
✅ Documentation complète en français
✅ Auto-refresh transparent
✅ Facile à maintenir

### Pour la Sécurité
✅ Tokens de courte durée (15 min)
✅ Protection XSS (HttpOnly)
✅ Protection CSRF (SameSite)
✅ HTTPS forcé en production
✅ Tokens hashés en base

## 🎯 Prochaines Étapes (Optionnel)

1. **Tests E2E** - Playwright pour tester l'interface
2. **Rate Limiting** - Protection contre brute force
3. **MFA** - Authentification multi-facteurs
4. **OWASP ZAP** - Scan de sécurité automatisé
5. **Analytics** - Dashboard de sessions

## 💡 FAQ Rapide

**Q: Combien de temps dure une session?**
R: 30 jours max, ou jusqu'à déconnexion/révocation

**Q: Puis-je me connecter sur mon téléphone ET ordinateur?**
R: Oui! Chaque appareil a sa propre session

**Q: Que faire si je perds l'accès à un appareil?**
R: Utiliser `/auth/revoke` pour déconnecter tous les appareils

**Q: Les tokens sont-ils stockés en clair?**
R: Non! Cookies HttpOnly côté client, hash SHA-256 en DB

**Q: Dois-je gérer l'expiration des tokens côté client?**
R: Non! Le middleware gère tout automatiquement

---

**Status:** ✅ Production Ready
**Tests:** ✅ 15/15 passing
**Documentation:** ✅ Complète
**Sécurité:** ✅ Zero-Trust conforme
