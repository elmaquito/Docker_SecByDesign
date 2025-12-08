# Threat Model & Playbooks - Notimatic

## 1. Threat Model (Méthodologie STRIDE)

Analyse des flux critiques : Authentification et Stockage des notes.

| Menace (STRIDE) | Description du Risque | Probabilité | Impact | Mitigation (Contre-mesure) |
| :--- | :--- | :--- | :--- | :--- |
| **S**poofing (Usurpation) | Un attaquant vole un token JWT ou usurpe une IP. | Moyenne | Critique | MFA obligatoire, Tokens courte durée (15min), Cookie HttpOnly (anti-XSS vol de token), TLS 1.3. |
| **T**ampering (Altération) | Modification du code source ou de l'image Docker, ou modification des données en transit. | Faible | Critique | Images signées (Cosign), Filesystem Read-Only, TLS partout, Validation intégrité DB (checksums). |
| **R**epudiation (Répudiation) | Un utilisateur malveillant nie avoir supprimé une note critique. | Moyenne | Moyen | Logs d'audit centralisés et immuables (WORM storage), Tracabilité des actions API. |
| **I**nformation Disclosure | Fuite de données (notes) via logs d'erreur ou injection SQL. | Moyenne | Critique | Gestion d'erreurs génériques, Chiffrement DB (At Rest), Sanitization des logs (pas de PII), SAST/DAST. |
| **D**enial of Service | Saturation de l'API par un botnet. | Élevée | Moyen | Rate Limiting (Traefik), WAF, Quotas par utilisateur, Timeouts stricts sur DB et Backend. |
| **E**levation of Privilege | Un attaquant exploite une faille container pour devenir root sur l'hôte. | Faible | Critique | User Namespaces, Non-root user, Drop Capabilities, Seccomp profile, Kernel Hardening. |

---

## 2. Playbook de Réponse à Incident

### Scénario : Détection d'une fuite de clé API ou Secret DB

#### 1. Détection & Analyse
- **Trigger :** Alerte du système de scan de secrets (GitGuardian) ou activité anormale en base de données (SIEM).
- **Action :** Vérifier la validité de l'alerte. Identifier le secret compromis et son scope (Prod vs Dev).

#### 2. Endiguement (Containment)
- **Immédiat :** Si le secret permet un accès externe, bloquer les IPs suspectes via le WAF/Firewall.
- **Isolation :** Si un conteneur est suspecté d'être compromis, le mettre en pause (`docker pause <id>`) pour analyse forensique, ne pas le tuer tout de suite (perte de RAM).

#### 3. Éradication
- **Rotation :** Révoquer immédiatement le secret compromis dans Vault.
- **Génération :** Générer un nouveau secret fort.
- **Déploiement :** Mettre à jour Vault et redémarrer les services dépendants (Rolling Update) pour prendre en compte le nouveau secret.

#### 4. Récupération (Recovery)
- **Vérification :** Tester que l'application fonctionne avec le nouveau secret.
- **Monitoring :** Surveillance accrue des logs pendant 24h.

#### 5. Post-Mortem (Leçons apprises)
- Comment le secret a-t-il fuité ? (Commit git ? Log ?)
- Action corrective : Ajouter un hook pre-commit, améliorer le scrubbing des logs.

---

## 3. Checklist de Déploiement Sécurisé

- [ ] **Secrets :** Aucun secret dans les variables d'environnement en clair (utiliser Docker Secrets/Vault).
- [ ] **Images :** Scan Trivy passé (0 Critical). Image signée.
- [ ] **Réseau :** Ports DB non exposés sur Internet. Seul le port 443 est ouvert.
- [ ] **Volume :** Backups testés et chiffrés.
- [ ] **Config :** `DEBUG=false` dans le backend.
- [ ] **Headers :** HSTS activé, CSP strict validé.
