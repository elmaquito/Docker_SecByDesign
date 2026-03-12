# Architecture de Sécurité - NOTIMATIC v2.0
**Secure by Design Extended - SIEM/SOAR Integration**

## Date de Création
**12 Mars 2026**

## Version
**2.0.0 - Security Stack Integration**

---

## 1. Vue d'Ensemble

### 1.1 Objectifs de Sécurité

NOTIMATIC v2.0 étend le principe "Secure by Design" existant avec une stack complète de sécurité défensive comprenant:

- **SIEM (Security Information and Event Management)** : Détection et analyse d'incidents
- **SOAR (Security Orchestration, Automation and Response)** : Réponse automatisée aux menaces
- **IDS/IPS** : Détection et prévention d'intrusions réseau
- **Runtime Security** : Surveillance des containers en temps réel
- **Threat Intelligence** : Enrichissement contextuel des menaces

### 1.2 Principes Architecturaux

```
┌─────────────────────────────────────────────────────────────┐
│                    Defense in Depth                          │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Network Security (Suricata IDS/IPS)              │
│  Layer 2: Application Security (Kong + Keycloak + Traefik) │
│  Layer 3: Runtime Security (Falco)                          │
│  Layer 4: Data Security (PostgreSQL + Encryption)           │
│  Layer 5: Audit & Compliance (Wazuh + Elasticsearch)        │
│  Layer 6: Orchestration (Shuffle SOAR)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture Logique

### 2.1 Stack Technique de Sécurité

| Composant | Version | Rôle | Compatibilité NOTIMATIC |
|-----------|---------|------|-------------------------|
| **Wazuh Manager** | 4.7.2 | SIEM Core | ✅ Compatible Node.js 20.x |
| **Wazuh Indexer** | 4.7.2 | Storage SIEM | ✅ Compatible PostgreSQL 15+ |
| **Elasticsearch** | 8.11.3 | Log Aggregation | ✅ Compatible Stack actuelle |
| **Kibana** | 8.11.3 | Visualization | ✅ Compatible avec ELK |
| **Filebeat** | 8.11.3 | Log Shipper | ✅ Léger, Docker-aware |
| **Shuffle** | 1.4.0 | SOAR Platform | ✅ Compatible API REST |
| **Falco** | 0.37.1 | Runtime Security | ✅ Compatible Docker |
| **Suricata** | 7.0 | Network IDS/IPS | ✅ Compatible réseau Docker |

### 2.2 Schéma d'Architecture Global

```
┌──────────────────────────────────────────────────────────────────┐
│                         INTERNET / USERS                          │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                 ┌───────────▼────────────┐
                 │   Suricata (IDS/IPS)   │  ← Network Layer Security
                 │   Port Mirroring       │
                 └───────────┬────────────┘
                             │
                 ┌───────────▼────────────┐
                 │   Traefik Proxy        │  ← Edge Security
                 │   Rate Limiting        │
                 │   SSL Termination      │
                 └───┬────────────┬───────┘
                     │            │
        ┌────────────▼──┐    ┌───▼──────────────┐
        │   Frontend    │    │   Kong Gateway   │  ← API Gateway
        │   (Vue 3)     │    │   + Rate Limit   │
        └───────────────┘    └───┬──────────────┘
                                 │
                         ┌───────▼────────┐
                         │   Keycloak     │  ← Identity Provider
                         │   OAuth2/OIDC  │
                         └───┬────────────┘
                             │
                     ┌───────▼──────────┐
                     │   Backend API    │  ← Application Layer
                     │   (Node.js 20.x) │
                     └───┬──────────────┘
                         │
                 ┌───────▼────────────┐
                 │   PostgreSQL 15    │  ← Data Layer
                 │   + Audit Logs     │
                 └────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│              SECURITY MONITORING & RESPONSE STACK                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────┐      ┌─────────────┐      ┌──────────────┐ │
│  │   Filebeat    │─────▶│Elasticsearch│─────▶│    Kibana    │ │
│  │ Log Collector │      │ Log Storage │      │ Visualization│ │
│  └───────┬───────┘      └──────┬──────┘      └──────────────┘ │
│          │                     │                               │
│          │              ┌──────▼──────┐                        │
│          └─────────────▶│   Wazuh     │◀──────────────┐       │
│                         │   Manager   │               │       │
│                         │   (SIEM)    │               │       │
│                         └──────┬──────┘               │       │
│                                │                      │       │
│                         ┌──────▼──────┐      ┌────────▼─────┐ │
│                         │   Shuffle   │      │    Falco     │ │
│                         │   (SOAR)    │      │   Runtime    │ │
│                         │  Playbooks  │      │   Security   │ │
│                         └─────────────┘      └──────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Architecture Réseau

### 3.1 Segmentation Réseau

```
┌─────────────────────────────────────────────────────────────────┐
│                      Network Segmentation                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  net-public (172.28.0.0/24)                                    │
│  └─ Traefik (edge proxy)                                       │
│                                                                 │
│  net-dmz (172.29.0.0/24)                                       │
│  ├─ Frontend (Vue 3)                                           │
│  ├─ Kong Gateway                                               │
│  ├─ Keycloak                                                   │
│  └─ Filebeat (log collector)                                   │
│                                                                 │
│  net-backend (172.30.0.0/24)                                   │
│  └─ Backend API (Node.js)                                      │
│                                                                 │
│  net-data (172.31.0.0/24)                                      │
│  └─ PostgreSQL Database                                        │
│                                                                 │
│  net-security (172.32.0.0/24)                                  │
│  ├─ Elasticsearch                                              │
│  ├─ Wazuh Manager                                              │
│  ├─ Wazuh Indexer                                              │
│  ├─ Kibana                                                     │
│  ├─ Shuffle Backend/Frontend                                   │
│  └─ Falco                                                      │
│                                                                 │
│  net-kong-internal (172.33.0.0/24)                             │
│  └─ Kong Database                                              │
│                                                                 │
│  net-auth (172.34.0.0/24)                                      │
│  └─ Keycloak Database                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Flux de Données

```
┌─────────────────────────────────────────────────────────────┐
│                      Data Flow Security                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Application Logs:                                         │
│  [Backend/Frontend/Kong/Keycloak]                          │
│         │                                                   │
│         ▼                                                   │
│    [Filebeat] ──────────┐                                  │
│                         │                                   │
│  Docker Container Logs: │                                   │
│  [All Containers]       │                                   │
│         │               │                                   │
│         ▼               ▼                                   │
│    [Filebeat] ─────▶ [Elasticsearch]                       │
│                         │                                   │
│                         ├────────▶ [Kibana] (Visualization) │
│                         │                                   │
│                         └────────▶ [Wazuh Manager]          │
│                                      │                      │
│                                      ▼                      │
│  Security Events:              [Rule Engine]                │
│  - Auth failures                    │                      │
│  - SQL injection                    │                      │
│  - Rate limit                       │                      │
│  - Privilege escalation             │                      │
│                                     ▼                      │
│                              [Shuffle SOAR]                │
│                                     │                      │
│                                     ▼                      │
│                           [Automated Response]             │
│                           - Block IP                       │
│                           - Create incident                │
│                           - Notify admin                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Composants de Sécurité

### 4.1 Wazuh SIEM

**Rôle** : Détection d'incidents, analyse de logs, vulnerability scanning

**Configuration Clé** :
```yaml
Détection:
  - Authentication failures (>5 en 5min)
  - SQL Injection patterns
  - XSS attempts
  - Privilege escalation
  - GDPR data access
  - Container anomalies

Alerting:
  - Level 3+: Log only
  - Level 7+: Trigger SOAR
  - Level 10+: Email + SOAR

Integration:
  - Elasticsearch (storage)
  - Shuffle (automated response)
  - Email/Slack (notifications)
```

### 4.2 Shuffle SOAR

**Rôle** : Orchestration et automatisation de la réponse aux incidents

**Playbooks Principaux** :

1. **Brute Force Detection**
   ```
   Trigger: 5+ auth failures from same IP
   Actions:
     1. Check IP reputation (AbuseIPDB)
     2. Block IP in Traefik (15min)
     3. Create incident in Wazuh
     4. Send Slack notification
   ```

2. **SQL Injection Attempt**
   ```
   Trigger: SQL injection pattern detected
   Actions:
     1. Log full request details
     2. Block source IP (1h)
     3. Create critical incident
     4. Email security team
     5. Run database integrity check
   ```

3. **Container Anomaly**
   ```
   Trigger: Falco detects unexpected process
   Actions:
     1. Capture container state
     2. Stop container if critical
     3. Create forensic snapshot
     4. Alert DevOps team
   ```

### 4.3 Falco Runtime Security

**Rôle** : Surveillance en temps réel des containers

**Rules Spécifiques NOTIMATIC** :
- Shell spawned in production container
- Unauthorized process in backend
- Sensitive file access (.env, secrets)
- Database connection from non-backend container
- Privilege escalation attempts

### 4.4 Suricata IDS/IPS

**Rôle** : Détection d'intrusions réseau

**Rules Actives** :
- Emerging Threats ruleset
- Custom NOTIMATIC rules
- OWASP Top 10 signatures
- Known malware C2 communications

---

## 5. Intégration avec Stack Existante

### 5.1 Compatibilité avec Architecture Actuelle

```
Existant NOTIMATIC v1.2.0:
├─ Backend: Node.js 20.x + Express 4.18.x ✅
├─ Frontend: Vue 3.3.4 + Vite 4.4.5 ✅
├─ Database: PostgreSQL 15-alpine ✅
├─ Auth: JWT + Argon2 + Keycloak ✅
├─ Infrastructure: Docker Compose ✅
└─ Monitoring: Audit logs (table audit_logs) ✅

Nouveau Stack Sécurité v2.0:
├─ SIEM: Wazuh 4.7.2 (NEW)
├─ Log Aggregation: ELK 8.11.3 (NEW)
├─ SOAR: Shuffle 1.4.0 (NEW)
├─ Runtime Security: Falco 0.37.1 (NEW)
├─ Network IDS: Suricata 7.0 (NEW)
└─ Intégration complète via Docker Compose
```

### 5.2 Points d'Intégration

| Composant Existant | Point d'Intégration | Méthode |
|--------------------|---------------------|---------|
| **Backend API** | Logs applicatifs | Filebeat collecte stdout/stderr |
| **PostgreSQL** | Audit logs table | Filebeat query periodique |
| **Kong Gateway** | Access logs | Filebeat + Wazuh rules |
| **Keycloak** | Auth events | Filebeat + Wazuh auth rules |
| **Docker** | Container logs | Filebeat Docker input |
| **Traefik** | Access logs | Filebeat log parser |

---

## 6. Métriques de Sécurité

### 6.1 KPIs de Sécurité

```yaml
Detection:
  - Mean Time to Detect (MTTD): < 5 minutes
  - False Positive Rate: < 5%
  - Detection Coverage: > 95% OWASP Top 10

Response:
  - Mean Time to Respond (MTTR): < 15 minutes
  - Automated Response Rate: > 80%
  - Incident Resolution Time: < 2 hours

Compliance:
  - Log Retention: 6 months (GDPR compliant)
  - Audit Coverage: 100% critical actions
  - Vulnerability Scan Frequency: Daily
```

### 6.2 Dashboards Kibana

1. **Security Overview**
   - Total events/day
   - Top 10 security rules triggered
   - Geographic distribution of threats
   - Timeline of incidents

2. **Authentication Security**
   - Failed login attempts
   - Successful logins by user/role
   - Session duration analysis
   - Password reset requests

3. **Application Security**
   - SQL injection attempts
   - XSS attempts
   - CSRF violations
   - Rate limiting triggers

4. **Infrastructure Security**
   - Container anomalies (Falco)
   - Network intrusions (Suricata)
   - Vulnerability scan results
   - System resource abuse

---

## 7. Stratégie de Déploiement

### 7.1 Phases de Déploiement

**Phase 1: Monitoring Passif (Semaine 1-2)**
- Déploiement Elasticsearch + Kibana
- Configuration Filebeat (logs only)
- Création dashboards initiaux
- Mode observation uniquement

**Phase 2: SIEM Actif (Semaine 3-4)**
- Déploiement Wazuh Manager
- Configuration rules personnalisées
- Alerting email/Slack
- Mode détection active

**Phase 3: Runtime Security (Semaine 5)**
- Déploiement Falco
- Configuration rules containers
- Intégration avec Wazuh

**Phase 4: Network IDS (Semaine 6)**
- Déploiement Suricata
- Configuration rules réseau
- Monitoring passif initial

**Phase 5: SOAR Automation (Semaine 7-8)**
- Déploiement Shuffle
- Création playbooks basiques
- Test réponse automatisée
- Activation progressive

**Phase 6: Production Complète (Semaine 9+)**
- Monitoring 24/7
- Automated response activé
- Documentation finalisée
- Formation équipes

### 7.2 Rollback Strategy

```yaml
Rollback Levels:
  Level 1 (SOAR):
    - Désactiver automated response
    - Conserver monitoring
    - Impact: Minimal

  Level 2 (IDS/IPS):
    - Désactiver Suricata/Falco
    - Conserver SIEM
    - Impact: Faible

  Level 3 (SIEM):
    - Désactiver Wazuh rules
    - Conserver logs Elasticsearch
    - Impact: Moyen

  Level 4 (Full):
    - Arrêt stack sécurité complète
    - Retour NOTIMATIC v1.2.0
    - Impact: Élevé (perte monitoring)
```

---

## 8. Conformité et Audit

### 8.1 Conformité RGPD

```
Nouvelles Mesures RGPD v2.0:
├─ Monitoring accès données personnelles
├─ Alertes sur exports GDPR
├─ Audit automatique des suppressions
├─ Logs anonymisés après 6 mois
└─ Rapports de conformité mensuels
```

### 8.2 Audit Trail

Tous les événements de sécurité sont journalisés:
- **Qui** : User ID, IP source
- **Quoi** : Action effectuée
- **Quand** : Timestamp UTC
- **Où** : Service/Container concerné
- **Résultat** : Succès/Échec/Bloqué

---

## 9. Ressources et Dépendances

### 9.1 Ressources Système

| Environnement | CPU | RAM | Disk | Réseau |
|---------------|-----|-----|------|--------|
| **Dev (Local)** | 8 cores | 16GB | 100GB | 1Gbps |
| **Staging** | 16 cores | 32GB | 500GB | 1Gbps |
| **Production** | 32 cores | 64GB | 2TB | 10Gbps |

### 9.2 Dépendances Externes

- **Docker** : 24.0+
- **Docker Compose** : 2.20+
- **Kernel Linux** : 5.10+ (pour Falco)
- **Network** : Accès HTTPS sortant (threat intel feeds)

---

## 10. Références

- [Wazuh Documentation](https://documentation.wazuh.com/)
- [Shuffle Documentation](https://shuffler.io/docs)
- [Falco Rules](https://github.com/falcosecurity/rules)
- [Suricata Rules](https://suricata.io/features/)
- [NOTIMATIC Architecture v1.2](ARCHITECTURE.md)
- [NOTIMATIC GDPR](GDPR.md)
- [OWASP Top 10 2021](https://owasp.org/Top10/)

---

**Document Version**: 2.0.0  
**Dernière mise à jour**: 12 Mars 2026  
**Auteur**: Security Architecture Team  
**Statut**: ✅ Approuvé pour Implémentation
