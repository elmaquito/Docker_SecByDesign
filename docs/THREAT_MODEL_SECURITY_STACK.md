# Modèle de Menaces - Security Stack NOTIMATIC v2.0

## Date de Création
**12 Mars 2026**

## Version
**2.0.0 - Security Stack Integration**

---

## 1. Introduction

Ce document étend le modèle de menaces existant de NOTIMATIC (basé sur la méthodologie STRIDE) pour couvrir les nouvelles surfaces d'attaque introduites par la stack SIEM/SOAR. Il définit également les stratégies de mitigation spécifiques à chaque composant de sécurité.

### Méthodologie
- **STRIDE** : Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege
- **DREAD** : Damage, Reproducibility, Exploitability, Affected users, Discoverability
- **ATT&CK MITRE** : Référentiel des tactiques et techniques d'attaque

---

## 2. Surface d'Attaque - Stack Sécurité

### 2.1 Nouveaux Composants et Surfaces d'Attaque

| Composant | Surface Exposée | Vecteurs d'Attaque Potentiels |
|-----------|----------------|-------------------------------|
| **Elasticsearch** | API REST :9200 | Injection de requêtes, accès non authentifié, exfiltration de logs |
| **Kibana** | Interface Web :5601 | XSS via logs, CSRF, force brute admin |
| **Wazuh Manager** | API REST :55000 | Injection de faux événements, DoS règles |
| **Shuffle SOAR** | Interface Web :3002 | Injection de workflows malveillants, escalade |
| **Falco** | Kernel module | Bypass eBPF, désactivation silencieuse |
| **Suricata** | Réseau passif | Évasion IDS, tunnel chiffré, fragmentation |
| **Filebeat** | Collecte logs | Injection de logs, pollution SIEM |

---

## 3. Modèle de Menaces STRIDE Étendu

### 3.1 Spoofing (Usurpation d'Identité)

| ID | Menace | Composant Cible | Score DREAD | Mitigation |
|----|--------|----------------|-------------|------------|
| S-01 | Injection de faux événements dans Wazuh | Wazuh Manager | 8/10 | TLS mutuel entre agents et manager, authentification par clé |
| S-02 | Usurpation d'alertes SOAR pour déclencher réponses | Shuffle | 7/10 | Validation HMAC des webhooks Wazuh → Shuffle |
| S-03 | Spoofing IP source dans logs Traefik | Filebeat → Elasticsearch | 6/10 | Validation en-têtes X-Forwarded-For, rate limiting par IP réelle |
| S-04 | Usurpation identité admin Kibana | Kibana | 9/10 | Authentification Keycloak OIDC obligatoire |

### 3.2 Tampering (Altération)

| ID | Menace | Composant Cible | Score DREAD | Mitigation |
|----|--------|----------------|-------------|------------|
| T-01 | Modification des rules Wazuh | Wazuh Manager | 9/10 | Filesystem read-only, checksums des fichiers de rules |
| T-02 | Altération des playbooks SOAR | Shuffle Backend | 8/10 | Versionning des playbooks, audit trail Shuffle |
| T-03 | Modification des logs avant collecte Filebeat | Containers | 6/10 | Collecte stdout/stderr Docker (non modifiable par app) |
| T-04 | Altération rules Falco | Falco | 9/10 | Image Docker signée (Cosign), rules en ConfigMap immutable |
| T-05 | Modification configuration Suricata | Suricata | 8/10 | Filesystem read-only, rules téléchargées et vérifiées (SHA256) |

### 3.3 Repudiation

| ID | Menace | Composant Cible | Score DREAD | Mitigation |
|----|--------|----------------|-------------|------------|
| R-01 | Suppression de logs d'audit dans Elasticsearch | Elasticsearch | 9/10 | Index ILM avec DELETE policy à 6 mois, snapshots S3 |
| R-02 | Nier avoir désactivé une règle Wazuh | Wazuh Manager | 7/10 | Audit trail API Wazuh, logs Kibana des actions admin |
| R-03 | Nier avoir modifié un playbook SOAR | Shuffle | 6/10 | Versionning Git des playbooks, audit trail Shuffle |
| R-04 | Nier un incident de sécurité | SOAR/SIEM | 8/10 | Logs immuables WORM, horodatage cryptographique |

### 3.4 Information Disclosure (Divulgation d'Information)

| ID | Menace | Composant Cible | Score DREAD | Mitigation |
|----|--------|----------------|-------------|------------|
| I-01 | Exfiltration de logs applicatifs via Elasticsearch | Elasticsearch | 9/10 | Elasticsearch Security activé (TLS + auth), index chiffré |
| I-02 | Fuite de tokens JWT dans les logs | Filebeat | 8/10 | Scrubbing des logs avant indexation (masquer tokens) |
| I-03 | Accès non autorisé aux dashboards Kibana | Kibana | 7/10 | Authentification Keycloak, RBAC Kibana |
| I-04 | Fuite de données personnelles dans logs SIEM | Wazuh | 8/10 | Anonymisation PII dans les règles Wazuh |
| I-05 | Exposition configuration Suricata (signatures) | Suricata | 5/10 | Configuration interne uniquement, pas d'API publique |

### 3.5 Denial of Service

| ID | Menace | Composant Cible | Score DREAD | Mitigation |
|----|--------|----------------|-------------|------------|
| D-01 | Inondation de faux événements pour saturer SIEM | Wazuh + Elasticsearch | 8/10 | Rate limiting Filebeat, alertes sur volume anormal |
| D-02 | Attaque sur API Wazuh pour désactiver détection | Wazuh Manager | 9/10 | Rate limiting API, IP allowlist pour admin |
| D-03 | Saturation Shuffle pour bloquer réponse auto | Shuffle | 7/10 | Queue d'événements, timeout sur playbooks |
| D-04 | Fragmentation paquets pour contourner Suricata | Suricata | 6/10 | Réassemblage de flux activé, stream-depth configuré |
| D-05 | Crash Falco via syscalls malformés | Falco | 7/10 | eBPF driver (plus stable que kernel module), restart policy |

### 3.6 Elevation of Privilege

| ID | Menace | Composant Cible | Score DREAD | Mitigation |
|----|--------|----------------|-------------|------------|
| E-01 | Escalade depuis container Filebeat vers hôte | Filebeat | 8/10 | Non-root user, read-only filesystem, drop capabilities |
| E-02 | Exploitation Kibana pour accéder Elasticsearch | Kibana | 9/10 | Elasticsearch Security, utilisateur Kibana limité en droits |
| E-03 | Abus Shuffle SOAR pour exécuter commandes hôte | Shuffle | 9/10 | Conteneur Shuffle isolé, audit des actions SOAR |
| E-04 | Désactivation Falco via privileged container | Falco | 7/10 | Interdire containers privileged (sauf Falco lui-même) |
| E-05 | Compromission Wazuh Manager pour blind spot | Wazuh | 10/10 | Monitoring de Wazuh par système externe, heartbeat |

---

## 4. Attaques Spécifiques MITRE ATT&CK

### 4.1 Tactiques Couvertes

| Tactique MITRE | Technique | Détection | Composant |
|----------------|-----------|-----------|-----------|
| Initial Access | T1190 - Exploit Public-Facing App | Suricata + Wazuh | Web exploits |
| Execution | T1059 - Command and Scripting | Falco | Shell in container |
| Persistence | T1078 - Valid Accounts | Wazuh auth rules | Brute force + abnormal login |
| Privilege Escalation | T1611 - Escape to Host | Falco | Container escape |
| Defense Evasion | T1562 - Impair Defenses | Wazuh heartbeat | Killing security tools |
| Credential Access | T1110 - Brute Force | Wazuh + SOAR | Auth failures |
| Discovery | T1046 - Network Scan | Suricata | Port scanning |
| Lateral Movement | T1210 - Remote Services | Suricata + Falco | Unexpected connections |
| Collection | T1005 - Data from Local System | Falco | Sensitive file access |
| Exfiltration | T1041 - Exfil over C2 Channel | Suricata | C2 communications |
| Impact | T1486 - Data Encrypted (Ransomware) | Falco + Wazuh | Mass file encryption |

### 4.2 Scénarios d'Attaque Complexes

#### Scénario 1 : Attaque par Chaîne (Supply Chain Attack)

```
Étape 1: Attaquant compromet une dépendance npm du backend
        └─ Détection: Trivy scan (CI/CD) + Wazuh file integrity

Étape 2: Code malveillant tente un reverse shell
        └─ Détection: Falco (shell in backend container)
        └─ Réponse: Shuffle pause container + alert

Étape 3: Tentative d'exfiltration des données PostgreSQL
        └─ Détection: Suricata (connexion DB anormale)
        └─ Réponse: Blocage réseau + incident critique
```

#### Scénario 2 : Attaque Brute Force Distribuée

```
Étape 1: Botnets envoient 1000 tentatives auth/min sur Keycloak
        └─ Détection: Wazuh (auth failures + rate)
        └─ Réponse SOAR: Vérification AbuseIPDB

Étape 2: IPs sont vérifiées malveillantes
        └─ Réponse SOAR: Blocage IPs Traefik (liste dynamique)
        └─ Notification: Slack + Email

Étape 3: Attaquant change de range IP
        └─ Détection: Pattern de comportement (Wazuh ML)
        └─ Réponse: Blocage sous-réseau /24
```

#### Scénario 3 : Attaque Insider

```
Étape 1: Administrateur compromis accède Kibana avec ses credentials
        └─ Détection: Connexion hors heures habituelles (Wazuh ML)

Étape 2: Export massif de logs (tentative exfiltration)
        └─ Détection: Wazuh (volume anormal d'accès Elasticsearch)
        └─ Réponse: Alerte superviseur + investigation

Étape 3: Tentative de désactivation des règles Wazuh
        └─ Détection: Audit trail Wazuh API
        └─ Réponse: Blocage accès + incident P1
```

---

## 5. Stratégies de Mitigation

### 5.1 Hardening des Composants de Sécurité

#### Elasticsearch
```yaml
Sécurité:
  - xpack.security.enabled: true
  - xpack.security.transport.ssl.enabled: true
  - xpack.security.http.ssl.enabled: true
  - Authentification: OIDC via Keycloak
  - Chiffrement at-rest: oui (AES-256)
  - Backup: snapshots S3 quotidiens
  
Accès:
  - Utilisateur notimatic-readonly (Kibana)
  - Utilisateur notimatic-filebeat (écriture seulement)
  - Utilisateur notimatic-wazuh (lecture écriture security index)
  - Superuser admin: accès IP restreint
```

#### Wazuh Manager
```yaml
Sécurité:
  - TLS mutuel agents ↔ manager
  - API Key rotation mensuelle
  - Filesystem /etc/wazuh en read-only
  - Checksums des fichiers de règles (SHA256)
  
Monitoring de Wazuh:
  - Heartbeat check toutes les minutes
  - Alerte si Wazuh down > 2 minutes
  - Monitoring par Prometheus externe
```

#### Shuffle SOAR
```yaml
Sécurité:
  - Isolation réseau (net-security uniquement)
  - Validation HMAC des webhooks entrants
  - Audit trail de toutes les actions
  - Timeout sur playbooks (max 5 minutes)
  - Sandboxing des actions (dry-run avant prod)
  
Autorisation:
  - Role Admin: modification playbooks
  - Role Analyst: exécution seulement
  - Role Viewer: lecture seule
```

#### Falco
```yaml
Sécurité:
  - eBPF driver (non kernel module direct)
  - Image signée (Cosign)
  - Rules en ConfigMap Kubernetes (ou volume read-only)
  - Restart automatique si crash
  
Rules spécifiques:
  - Whitelist des processus légitimes par container
  - Alert si Falco lui-même est tué
  - Alert si règles sont modifiées à chaud
```

### 5.2 Défense en Profondeur

```
┌──────────────────────────────────────────────────────────────────┐
│              Stratégie Défense en Profondeur                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Couche Réseau (Suricata):                                      │
│  ├─ Blocage automatique IPs malveillantes (IPS mode)           │
│  ├─ Détection scans de ports                                   │
│  └─ Alerte sur patterns OWASP connus                           │
│                                                                  │
│  Couche Application (Kong + Wazuh):                            │
│  ├─ Rate limiting par endpoint                                 │
│  ├─ Détection injections SQL/XSS                               │
│  └─ Analyse comportementale des requêtes                       │
│                                                                  │
│  Couche Runtime (Falco):                                       │
│  ├─ Surveillance syscalls en temps réel                        │
│  ├─ Détection comportements anormaux containers                │
│  └─ Alerte sur accès fichiers sensibles                        │
│                                                                  │
│  Couche Données (PostgreSQL + Wazuh):                          │
│  ├─ Chiffrement at-rest et in-transit                          │
│  ├─ Audit de toutes les requêtes (pg_audit)                    │
│  └─ Détection accès anormaux (volume/horaire)                  │
│                                                                  │
│  Couche Identité (Keycloak + Wazuh):                           │
│  ├─ Détection brute force (>5 échecs/5min)                     │
│  ├─ Analyse comportementale (heures/localisation)              │
│  └─ MFA obligatoire pour accès admin                           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. Matrice de Risque Résiduel

Après implémentation de toutes les mitigations :

| Menace | Risque Avant | Risque Après | Réduction |
|--------|-------------|--------------|-----------|
| Brute Force Auth | Élevé | Faible | 85% |
| SQL Injection | Élevé | Très Faible | 95% |
| Container Escape | Moyen | Faible | 70% |
| Data Exfiltration | Élevé | Faible | 80% |
| Insider Threat | Moyen | Faible | 60% |
| Supply Chain Attack | Moyen | Moyen | 40% |
| DDoS | Élevé | Moyen | 50% |
| Zero-Day Exploit | Faible | Faible | 20% |
| SIEM Evasion | Faible | Faible | 30% |

> Note : Le risque zéro n'existe pas. Ces estimations supposent une implémentation correcte de toutes les mitigations.

---

## 7. Conformité RGPD - Aspects Sécurité

### 7.1 Données Personnelles dans le SIEM

```yaml
Données PII potentiellement dans les logs:
  - Adresses email (Keycloak logs)
  - User IDs (Backend logs)
  - Adresses IP (considérées PII en RGPD)
  - Contenu des notes (Backend error logs)

Mitigations RGPD:
  - Pseudonymisation des User IDs dans les logs (hash)
  - Masquage des emails dans les logs (partial: user@****.com)
  - IPs stockées mais anonymisées après 30 jours
  - Contenu des notes JAMAIS loggé
  - Rétention maximale: 6 mois (Article 5 RGPD)
```

### 7.2 Droit à l'Effacement et Logs SIEM

```yaml
Processus droit à l'effacement:
  1. Réception demande suppression compte utilisateur
  2. Suppression données applicatives (PostgreSQL)
  3. Anonymisation logs SIEM contenant User ID
     - Script: anonymize_user_logs.sh <user_id>
     - Elasticsearch Update by Query sur tous index
  4. Conservation logs anonymisés (obligation sécurité)
  5. Confirmation au DPO dans 72h
```

---

## 8. Plan de Réponse aux Incidents

### 8.1 Niveaux de Sévérité

| Niveau | Critères | MTTR Objectif | Équipe |
|--------|---------|---------------|--------|
| P1 - Critique | Breach confirmée, système compromis | 1 heure | CTO + Security + DevOps |
| P2 - Élevé | Tentative d'intrusion, anomalie critique | 4 heures | Security + DevOps |
| P3 - Moyen | Alerte SIEM niveau 7-9, scan détecté | 24 heures | DevOps |
| P4 - Faible | Alerte informationnelle, faux positif | 72 heures | DevOps (async) |

### 8.2 Checklist de Réponse P1

```
□ 1. Notification équipe d'astreinte (< 5 min)
□ 2. Isolation du/des container(s) compromis
□ 3. Capture forensique (logs + état container)
□ 4. Identification vecteur d'attaque
□ 5. Évaluation données compromises
□ 6. Notification CNIL si données personnelles (< 72h)
□ 7. Correctif et redéploiement sécurisé
□ 8. Post-mortem (< 7 jours)
□ 9. Mise à jour threat model + playbooks
```

---

## 9. Références

- [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) - Architecture globale
- [SECURITY_MONITORING_PLAYBOOKS.md](SECURITY_MONITORING_PLAYBOOKS.md) - Playbooks détaillés
- [THREAT_MODEL_AND_PLAYBOOKS.md](THREAT_MODEL_AND_PLAYBOOKS.md) - Modèle de menaces v1
- [GDPR.md](GDPR.md) - Documentation RGPD
- [MITRE ATT&CK Framework](https://attack.mitre.org/)
- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Document Version**: 2.0.0  
**Dernière mise à jour**: 12 Mars 2026  
**Auteur**: Security Architecture Team  
**Statut**: ✅ Approuvé pour Implémentation
