# Documentation RGPD - NOTIMATIC

## Introduction

Cette documentation décrit la mise en conformité de l'application NOTIMATIC avec le Règlement Général sur la Protection des Données (RGPD - Règlement UE 2016/679).

## 1. Responsable du Traitement

**Organisation**: NOTIMATIC  
**Type d'organisation**: Établissement d'enseignement  
**Délégué à la Protection des Données (DPO)**: À définir  
**Contact DPO**: dpo@notimatic.example.com

## 2. Données Collectées

### 2.1 Données d'Identification

| Donnée | Description | Base légale | Durée de conservation |
|--------|-------------|-------------|----------------------|
| Nom d'utilisateur | Identifiant unique | Contrat | Durée du contrat + 1 an |
| Rôle | admin, technician, teacher, student | Contrat | Durée du contrat + 1 an |
| Mot de passe (hashé) | Authentification Argon2 | Sécurité | Durée du contrat + 1 an |
| Date de création | Timestamp inscription | Intérêt légitime | Durée du contrat + 1 an |

### 2.2 Données de Profil

| Donnée | Description | Base légale | Durée de conservation |
|--------|-------------|-------------|----------------------|
| Classe | Classe de l'utilisateur | Contrat | Durée du contrat + 1 an |
| Promotion | Année de promotion | Contrat | Durée du contrat + 1 an |
| Niveau | Bac+1, Bac+2, etc. | Contrat | Durée du contrat + 1 an |

### 2.3 Données de Contenu

| Donnée | Description | Base légale | Durée de conservation |
|--------|-------------|-------------|----------------------|
| Notes créées | Titre, contenu, dates | Contrat | Durée du contrat + 1 an |
| Commentaires | Contenu des commentaires | Contrat | Durée du contrat + 1 an |
| Thèmes associés | Tags/thématiques | Intérêt légitime | Durée du contrat + 1 an |
| Catégories | Ciblage de contenu | Intérêt légitime | Durée du contrat + 1 an |

### 2.4 Données Techniques

| Donnée | Description | Base légale | Durée de conservation |
|--------|-------------|-------------|----------------------|
| Logs d'audit | Actions critiques (création note, export, suppression) | Intérêt légitime | 6 mois |
| Adresses IP (logs) | IP source pour audit | Sécurité | 6 mois max |
| Cookies JWT | Token d'authentification HTTP-only | Sécurité | 15 minutes (session) |

### 2.5 Données NON Collectées

NOTIMATIC **ne collecte PAS**:
- Données sensibles (santé, religion, orientation, etc.)
- Numéros de sécurité sociale
- Données bancaires
- Données de géolocalisation précise
- Données biométriques

## 3. Finalités du Traitement

Les données sont collectées pour les finalités suivantes:

1. **Gestion des utilisateurs**
   - Création de comptes
   - Authentification et autorisation
   - Gestion des rôles et permissions

2. **Fourniture du service de feed d'actualités**
   - Affichage de notes ciblées
   - Gestion des commentaires
   - Filtrage par thèmes et catégories

3. **Assignation de contenu pédagogique**
   - Ciblage de notes par classe/promotion/niveau
   - Gestion des thématiques

4. **Sécurité et prévention de la fraude**
   - Logs d'audit des actions critiques
   - Détection d'activités suspectes

5. **Conformité légale**
   - Réponse aux demandes RGPD
   - Conservation des preuves légales

## 4. Bases Légales

| Traitement | Base légale RGPD |
|------------|------------------|
| Création de compte utilisateur | Article 6(1)(b) - Exécution d'un contrat |
| Gestion du feed et des notes | Article 6(1)(b) - Exécution d'un contrat |
| Sécurité et logs d'audit | Article 6(1)(f) - Intérêt légitime |
| Conservation des données | Article 6(1)(c) - Obligation légale |

## 5. Droits des Utilisateurs

Conformément au RGPD, les utilisateurs disposent des droits suivants:

### 5.1 Droit d'Accès (Article 15)

**Description**: Obtenir une copie de ses données personnelles.

**Mise en œuvre**:
- Endpoint API: `GET /api/v1/users/{id}/export`
- Format: JSON
- Délai de réponse: 30 jours maximum
- Gratuit (première demande)

**Contenu de l'export**:
```json
{
  "user": {
    "id": 123,
    "username": "johndoe",
    "role": "student",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "profile": {
    "classe": "Cyber1",
    "promotion": "2024-2025",
    "niveau": "Bac+1"
  },
  "notes": [
    { "id": 1, "title": "...", "content": "...", "created_at": "..." }
  ],
  "comments": [
    { "id": 1, "note_id": 5, "content": "...", "created_at": "..." }
  ],
  "audit_logs": [
    { "action": "NOTE_CREATED", "timestamp": "..." }
  ],
  "export_date": "2024-12-12T09:00:00Z"
}
```

### 5.2 Droit de Rectification (Article 16)

**Description**: Corriger des données inexactes.

**Mise en œuvre**:
- Endpoint API: `PUT /api/v1/profiles/{userId}`
- Interface web: Menu profil utilisateur
- Délai: Immédiat

**Données rectifiables**:
- Informations de profil (classe, promotion, niveau)
- Mot de passe (via endpoint dédié)

### 5.3 Droit à l'Effacement (Article 17)

**Description**: Supprimer ses données personnelles.

**Mise en œuvre**:
- Endpoint API: `DELETE /api/v1/users/{id}`
- Procédure: Soft delete puis anonymisation
- Délai: 30 jours maximum

**Processus de suppression**:

1. **Phase 1 - Soft Delete**:
   - Flag `deleted_at` sur l'utilisateur
   - Données conservées pendant 30 jours (restauration possible)
   - Utilisateur ne peut plus se connecter

2. **Phase 2 - Anonymisation** (J+30):
   - Remplacement du username par `deleted_user_{id}`
   - Suppression du password_hash
   - Flag `anonymized = true`
   - Conservation des notes/commentaires en mode anonyme

3. **Phase 3 - Purge** (Admin seulement):
   - Suppression complète des données
   - Cascade sur notes et commentaires
   - Irréversible

### 5.4 Droit à la Limitation (Article 18)

**Description**: Limiter le traitement de ses données.

**Mise en œuvre**:
- Colonne `processing_limited` sur users (à ajouter si besoin)
- Limitation des traitements non essentiels

### 5.5 Droit à la Portabilité (Article 20)

**Description**: Récupérer ses données dans un format structuré.

**Mise en œuvre**:
- Même endpoint que droit d'accès
- Format JSON (lisible machine)
- Possibilité d'export CSV (optionnel)

### 5.6 Droit d'Opposition (Article 21)

**Description**: S'opposer au traitement de ses données.

**Mise en œuvre**:
- Désactivation de compte
- Suppression de compte (voir droit à l'effacement)

## 6. Politique de Conservation des Données

### 6.1 Durées de Conservation

| Type de donnée | Durée active | Durée archive | Suppression |
|----------------|--------------|---------------|-------------|
| Comptes utilisateurs | Durée du contrat | 1 an après fin | Anonymisation |
| Notes et commentaires | Durée du contrat | 1 an après fin | Anonymisation ou suppression |
| Logs d'audit | - | 6 mois | Suppression automatique |
| Demandes GDPR (export) | - | 3 mois | Suppression automatique |
| Cookies JWT | 15 minutes | - | Suppression automatique |

### 6.2 Suppression Automatique

Script cron ou scheduled job:
- **Purge logs** > 6 mois
- **Purge exports GDPR** > 3 mois
- **Anonymisation comptes** `deleted_at` > 30 jours

```sql
-- Exemple de requête de purge (à automatiser)
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '6 months';
DELETE FROM gdpr_export_requests WHERE completed_at < NOW() - INTERVAL '3 months';
UPDATE users SET anonymized = TRUE, username = 'deleted_user_' || id 
WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '30 days';
```

## 7. Sécurité des Données

### 7.1 Mesures Techniques

1. **Chiffrement**
   - Mots de passe: Argon2id (résistant aux attaques GPU)
   - Communications: HTTPS/TLS 1.3 (production)
   - Base de données: Chiffrement au repos (optionnel)

2. **Contrôle d'accès**
   - RBAC (Role-Based Access Control)
   - JWT avec HTTP-only cookies (protection XSS)
   - CORS configuré
   - Helmet (headers sécurisés)

3. **Protection des inputs**
   - Validation Zod côté backend
   - Sanitization XSS (DOMPurify frontend, validator backend)
   - Requêtes SQL paramétrées (protection injection SQL)

4. **Rate Limiting**
   - Auth endpoints: 5 req/min
   - Comments: 10 req/min
   - Protection DDoS

5. **Audit & Monitoring**
   - Logs d'audit pour actions critiques
   - Détection d'anomalies
   - Alertes sécurité

### 7.2 Mesures Organisationnelles

1. **Accès restreint**
   - Admins seulement pour opérations sensibles
   - Principe du moindre privilège

2. **Formation**
   - Sensibilisation RGPD pour développeurs
   - Bonnes pratiques de sécurité

3. **Procédures**
   - Politique de mots de passe forts
   - Procédure de gestion des incidents
   - Revue de code sécurité

## 8. Transferts de Données

**NOTIMATIC ne transfère PAS de données hors UE**.

Tous les serveurs et bases de données sont hébergés dans l'Union Européenne.

Si transfert futur nécessaire:
- Clauses contractuelles types (SCC)
- Ou mécanismes de certification (Privacy Shield successeur)
- Information et consentement utilisateurs

## 9. Sous-Traitants

Liste des sous-traitants potentiels:

| Sous-traitant | Service | Données traitées | Localisation | Contrat DPA |
|---------------|---------|------------------|--------------|-------------|
| Hébergeur (ex: OVH) | Infrastructure | Toutes | UE | ✅ |
| Service email (ex: SendGrid) | Notifications | Email, nom | UE/US (SCC) | ✅ |

**Obligation**: Contrat de sous-traitance conforme RGPD (Article 28).

## 10. Analyses d'Impact (DPIA)

**DPIA requise ?** Non, pour le MVP actuel.

**Critères CNIL nécessitant DPIA**:
- ❌ Évaluation/scoring
- ❌ Décision automatisée
- ❌ Surveillance systématique
- ❌ Données sensibles à grande échelle
- ❌ Croisement de données massif

**Si évolution future** (analytics, IA, etc.) → DPIA à réaliser.

## 11. Violations de Données (Data Breach)

### 11.1 Procédure en Cas de Violation

1. **Détection** (J+0):
   - Identifier la violation
   - Contenir la brèche
   - Logs d'audit

2. **Évaluation** (J+1):
   - Évaluer la gravité
   - Données compromises ?
   - Risques pour les utilisateurs

3. **Notification CNIL** (J+2 max, si risque):
   - Formulaire de notification
   - Description de la violation
   - Mesures prises

4. **Notification utilisateurs** (J+3 max, si risque élevé):
   - Email ou notification in-app
   - Conseils pour se protéger

5. **Documentation**:
   - Registre des violations
   - Mesures correctives

### 11.2 Contact en Cas de Violation

**Email**: security@notimatic.example.com  
**Délai de réponse**: 72h maximum

## 12. Procédures pour les Utilisateurs

### 12.1 Demande d'Export (Droit d'Accès)

**Méthode 1 - API** (pour utilisateurs connectés):
```bash
curl -X GET https://notimatic.example.com/api/v1/users/{id}/export \
  -H "Cookie: auth_token=..." \
  -o my_data.json
```

**Méthode 2 - Interface Web**:
1. Se connecter à NOTIMATIC
2. Menu Profil → "Exporter mes données"
3. Télécharger le fichier JSON

**Méthode 3 - Email au DPO**:
1. Envoyer un email à dpo@notimatic.example.com
2. Objet: "Demande d'accès RGPD"
3. Fournir: nom d'utilisateur, preuve d'identité
4. Réponse sous 30 jours

### 12.2 Demande de Suppression (Droit à l'Effacement)

**Méthode 1 - Interface Web**:
1. Se connecter à NOTIMATIC
2. Menu Profil → "Supprimer mon compte"
3. Confirmer la suppression
4. Soft delete immédiat, anonymisation à J+30

**Méthode 2 - Email au DPO**:
1. Envoyer un email à dpo@notimatic.example.com
2. Objet: "Demande de suppression RGPD"
3. Fournir: nom d'utilisateur, preuve d'identité
4. Suppression sous 30 jours

**Méthode 3 - API** (pour utilisateurs connectés):
```bash
curl -X DELETE https://notimatic.example.com/api/v1/users/{id} \
  -H "Cookie: auth_token=..."
```

### 12.3 Demande de Rectification

**Interface Web**:
1. Se connecter
2. Menu Profil → "Modifier mes informations"
3. Modifier classe, promotion, niveau
4. Enregistrer

**API**:
```bash
curl -X PUT https://notimatic.example.com/api/v1/profiles/{userId} \
  -H "Cookie: auth_token=..." \
  -H "Content-Type: application/json" \
  -d '{"classe": "Cyber2", "niveau": "Bac+2"}'
```

## 13. Information et Transparence

### 13.1 Mentions Légales

À ajouter sur le site NOTIMATIC:
- Identité du responsable de traitement
- Finalités des traitements
- Droits des utilisateurs
- Contact DPO
- Lien vers cette documentation RGPD

### 13.2 Politique de Confidentialité

Document séparé (à créer) accessible:
- Page `/privacy-policy`
- Lien dans footer
- Acceptation lors de l'inscription

### 13.3 Cookies

**Cookies utilisés**:
- `auth_token`: JWT, HTTP-only, Secure, SameSite=Lax
- Durée: 15 minutes
- Finalité: Authentification

**Bandeau cookies**: Non requis (cookies strictement nécessaires uniquement).

## 14. Registre des Activités de Traitement

À maintenir (RGPD Article 30):

| Traitement | Finalité | Base légale | Catégories de données | Durée | Destinataires |
|------------|----------|-------------|----------------------|-------|---------------|
| Gestion comptes | Authentification | Contrat | Username, rôle, password hash | Contrat + 1 an | Admins |
| Feed actualités | Service pédagogique | Contrat | Notes, commentaires, thèmes | Contrat + 1 an | Users autorisés |
| Profils | Ciblage contenu | Contrat | Classe, promo, niveau | Contrat + 1 an | Teachers, Admins |
| Audit logs | Sécurité | Intérêt légitime | Actions, IP, dates | 6 mois | Admins |

## 15. Checklist Conformité RGPD

### Mise en Conformité MVP

- [x] ✅ Identifier les données collectées
- [x] ✅ Définir les bases légales
- [x] ✅ Définir les durées de conservation
- [ ] ⏳ Implémenter endpoint export (GET /users/:id/export)
- [ ] ⏳ Implémenter endpoint suppression (DELETE /users/:id)
- [ ] ⏳ Implémenter soft delete et anonymisation
- [ ] ⏳ Créer table gdpr_export_requests
- [ ] ⏳ Ajouter colonnes deleted_at et anonymized sur users
- [ ] ⏳ Créer script de purge automatique (cron)
- [ ] ⏳ Documenter procédures utilisateurs
- [ ] ⏳ Rédiger Politique de Confidentialité
- [ ] ⏳ Afficher mentions RGPD sur le site
- [ ] ⏳ Former l'équipe à la conformité RGPD
- [ ] ⏳ Désigner un DPO (ou contact RGPD)
- [ ] ⏳ Tester les endpoints GDPR
- [ ] ⏳ Créer registre des activités de traitement

### Production

- [ ] ⏳ Activer HTTPS/TLS
- [ ] ⏳ Chiffrement base de données au repos
- [ ] ⏳ Monitoring et alertes violations
- [ ] ⏳ Contrats DPA avec sous-traitants
- [ ] ⏳ Procédure de gestion incidents
- [ ] ⏳ Revue annuelle conformité RGPD

## 16. Contacts et Ressources

### Contacts Internes

- **DPO**: dpo@notimatic.example.com
- **Sécurité**: security@notimatic.example.com
- **Support**: support@notimatic.example.com

### Autorité de Contrôle

**CNIL** (Commission Nationale de l'Informatique et des Libertés)
- Site: https://www.cnil.fr
- Téléphone: 01 53 73 22 22
- Formulaire plainte: https://www.cnil.fr/fr/plaintes

### Ressources Utiles

- RGPD (texte officiel): https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Guide CNIL: https://www.cnil.fr/fr/rgpd-de-quoi-parle-t-on
- Modèles DPA: https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/standard-contractual-clauses-scc_en

---

**Document version**: 1.0  
**Dernière mise à jour**: 12 décembre 2024  
**Prochaine revue**: 12 juin 2025  
**Auteur**: GitHub Copilot Agent
