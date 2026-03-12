# Roadmap d'Implémentation Sécurité - NOTIMATIC v2.0

## Date de Création
**12 Mars 2026**

## Version
**2.0.0 - Security Stack Integration**

---

## 1. Vue d'Ensemble de la Roadmap

Cette roadmap décrit le plan d'implémentation progressif de la stack de sécurité SIEM/SOAR pour NOTIMATIC v2.0. L'approche est incrémentale pour minimiser les risques et assurer la continuité de service.

### Durée Totale : 9+ semaines
### Approche : Progressive, non-disruptive

---

## 2. Phases d'Implémentation

### Phase 1 : Monitoring Passif (Semaines 1-2)

**Objectif** : Poser les bases de l'observabilité sans impacter les services existants.

#### Tâches
- [ ] Déploiement Elasticsearch 8.11.3
- [ ] Déploiement Kibana 8.11.3
- [ ] Configuration Filebeat pour collecte des logs Docker
- [ ] Configuration Filebeat pour logs Traefik
- [ ] Configuration Filebeat pour logs Backend API
- [ ] Configuration Filebeat pour logs Kong Gateway
- [ ] Configuration Filebeat pour logs Keycloak
- [ ] Création dashboard "Log Overview" dans Kibana
- [ ] Validation : tous les logs sont correctement collectés
- [ ] Documentation des index Elasticsearch

#### Critères de Succès
- 100% des services loggent dans Elasticsearch
- Kibana accessible et fonctionnel
- Latence impact < 5% sur les services existants

#### Risques Phase 1
| Risque | Probabilité | Mitigation |
|--------|-------------|------------|
| Consommation mémoire élevée (ELK) | Haute | Limiter heap Elasticsearch à 4GB en dev |
| Logs trop volumineux | Moyenne | Configurer rotation et rétention (7 jours en dev) |
| Perte de logs | Faible | Buffer Filebeat avec retry |

---

### Phase 2 : SIEM Actif (Semaines 3-4)

**Objectif** : Activer la détection d'incidents avec Wazuh.

#### Tâches
- [ ] Déploiement Wazuh Manager 4.7.2
- [ ] Déploiement Wazuh Indexer 4.7.2
- [ ] Intégration Wazuh ↔ Elasticsearch
- [ ] Configuration rules d'authentification (brute force)
- [ ] Configuration rules injection SQL
- [ ] Configuration rules XSS
- [ ] Configuration rules privilege escalation
- [ ] Configuration rules GDPR (accès données personnelles)
- [ ] Configuration alerting email
- [ ] Configuration alerting Slack (webhook)
- [ ] Tests des rules avec attaques simulées
- [ ] Tuning des faux positifs
- [ ] Création dashboard "Security Alerts" dans Kibana

#### Critères de Succès
- Wazuh détecte >95% des patterns d'attaques simulées
- Taux de faux positifs < 10% (objectif final : < 5%)
- Alertes email/Slack reçues en < 5 minutes

#### Seuils d'Alerte Wazuh

```yaml
Niveaux d'alerte:
  3-6:   Log uniquement (informationnel)
  7-9:   Alerte Slack (attention requise)
  10-12: Email + Slack (action immédiate)
  13-15: Email + Slack + SOAR trigger (critique)
```

---

### Phase 3 : Runtime Security (Semaine 5)

**Objectif** : Surveiller les comportements anormaux dans les containers Docker.

#### Tâches
- [ ] Déploiement Falco 0.37.1
- [ ] Configuration rules "shell dans container production"
- [ ] Configuration rules "accès fichiers sensibles (.env)"
- [ ] Configuration rules "connexion DB depuis container non-backend"
- [ ] Configuration rules "escalade de privilèges"
- [ ] Configuration rules "process non autorisé dans backend"
- [ ] Intégration Falco → Wazuh (alertes centralisées)
- [ ] Tests : simulation d'exécutions non autorisées
- [ ] Documentation des comportements légitimes (whitelist)

#### Critères de Succès
- Falco détecte toute exécution de shell dans les containers prod
- Alertes Falco visibles dans Wazuh dashboard
- Zéro faux positif sur les opérations normales

---

### Phase 4 : Network IDS (Semaine 6)

**Objectif** : Détecter les intrusions au niveau réseau.

#### Tâches
- [ ] Déploiement Suricata 7.0
- [ ] Configuration port mirroring sur réseau Docker
- [ ] Téléchargement ruleset Emerging Threats
- [ ] Configuration rules personnalisées NOTIMATIC
- [ ] Configuration rules OWASP Top 10
- [ ] Intégration Suricata → Wazuh (fast.log)
- [ ] Mode IDS uniquement (pas de blocage automatique en phase initiale)
- [ ] Tests : scans nmap, attaques OWASP simulées
- [ ] Analyse et tuning des alertes

#### Critères de Succès
- Suricata détecte les scans de ports
- Suricata détecte les patterns OWASP Top 10
- Intégration Wazuh fonctionnelle

---

### Phase 5 : SOAR Automation (Semaines 7-8)

**Objectif** : Automatiser la réponse aux incidents.

#### Tâches
- [ ] Déploiement Shuffle SOAR 1.4.0
- [ ] Intégration Wazuh → Shuffle (webhooks)
- [ ] Création playbook "Brute Force Response"
- [ ] Création playbook "SQL Injection Response"
- [ ] Création playbook "Container Anomaly Response"
- [ ] Création playbook "Privilege Escalation Response"
- [ ] Intégration AbuseIPDB (réputation IP)
- [ ] Configuration blocage IP Traefik via API
- [ ] Tests des playbooks en mode simulation
- [ ] Documentation des workflows d'escalade
- [ ] Formation équipe sur interface Shuffle

#### Critères de Succès
- Playbook brute force répond en < 2 minutes
- Blocage IP Traefik fonctionnel via API
- Notifications équipe reçues correctement

#### Playbooks à Implémenter

| Playbook | Trigger | Actions Automatisées | Escalade Manuelle |
|----------|---------|---------------------|-------------------|
| Brute Force | 5+ échecs auth/5min | Blocage IP 15min + notif Slack | Si IP interne |
| SQL Injection | Pattern SQL détecté | Blocage IP 1h + incident | Toujours |
| Container Anomaly | Falco alert critical | Pause container + snapshot | Toujours |
| Port Scan | Suricata scan alert | Log + notif | Si interne |
| Privilege Escalation | Falco/Wazuh alert | Arrêt service + incident | Toujours |

---

### Phase 6 : Production Complète (Semaine 9+)

**Objectif** : Stack de sécurité complète opérationnelle en production.

#### Tâches
- [ ] Activation mode IPS Suricata (blocage réseau actif)
- [ ] Activation réponse automatisée SOAR en production
- [ ] Configuration monitoring 24/7
- [ ] Mise en place rapports hebdomadaires automatiques
- [ ] Configuration backup Elasticsearch (6 mois rétention)
- [ ] Configuration scan de vulnérabilités quotidien
- [ ] Formation équipe complète (2h de formation)
- [ ] Documentation post-implémentation
- [ ] Premier audit de sécurité externe
- [ ] Mise à jour du SECURITY_TESTING_PLAN.md avec résultats

#### Critères de Succès Production
- MTTD < 5 minutes
- MTTR < 15 minutes
- Automated response rate > 80%
- Zero security incident non détecté en 30 jours de monitoring

---

## 3. Planning Détaillé

```
Semaine 1  [████████] Phase 1 : ELK Setup
Semaine 2  [████████] Phase 1 : Filebeat + Dashboards
Semaine 3  [████████] Phase 2 : Wazuh Deploy + Rules
Semaine 4  [████████] Phase 2 : Alerting + Tuning
Semaine 5  [████████] Phase 3 : Falco + Runtime Security
Semaine 6  [████████] Phase 4 : Suricata + Network IDS
Semaine 7  [████████] Phase 5 : Shuffle Deploy + Playbooks
Semaine 8  [████████] Phase 5 : Tests + Formation
Semaine 9+ [████████] Phase 6 : Production + Monitoring continu
```

---

## 4. Dépendances et Prérequis

### Prérequis Techniques
- [ ] Docker 24.0+ installé
- [ ] Docker Compose 2.20+ installé
- [ ] Kernel Linux 5.10+ (pour Falco eBPF)
- [ ] Minimum 16GB RAM disponibles (pour ELK + Wazuh)
- [ ] Minimum 100GB espace disque libre
- [ ] Accès HTTPS sortant (threat intel feeds)

### Prérequis Organisationnels
- [ ] Compte Slack avec webhook configuré
- [ ] SMTP configuré pour alertes email
- [ ] Compte AbuseIPDB (API key)
- [ ] Contacts d'escalade définis (email + téléphone)
- [ ] Procédure d'astreinte définie

---

## 5. KPIs et Métriques de Succès

### Métriques par Phase

| Phase | KPI Principal | Objectif | Méthode Mesure |
|-------|---------------|----------|----------------|
| Phase 1 | Log Coverage | 100% services | Kibana index check |
| Phase 2 | Detection Rate | >95% OWASP | Red team simulation |
| Phase 3 | Runtime Coverage | 100% containers | Falco test suite |
| Phase 4 | Network Detection | >90% patterns | Suricata test |
| Phase 5 | Response Time | <2min auto | Playbook metrics |
| Phase 6 | MTTD/MTTR | <5min/<15min | Wazuh dashboard |

### Métriques Long Terme (Post Phase 6)

```yaml
Mensuel:
  - Nombre incidents détectés vs réels
  - Taux de faux positifs
  - Temps moyen de résolution
  - Couverture des règles

Trimestriel:
  - Audit de configuration sécurité
  - Mise à jour des rules (Emerging Threats)
  - Revue des playbooks SOAR
  - Test de restauration des logs

Annuel:
  - Audit de sécurité externe
  - Pentest complet
  - Révision architecture sécurité
  - Mise à jour threat model
```

---

## 6. Budget Ressources

### Infrastructure Additionnelle (Production)

| Ressource | Actuel | Après Déploiement | Delta |
|-----------|--------|-------------------|-------|
| CPU | 8 cores | 20 cores | +12 cores |
| RAM | 16GB | 48GB | +32GB |
| Disk | 200GB | 2.2TB | +2TB |
| Réseau | 1Gbps | 1Gbps | 0 |

### Temps Équipe

| Rôle | Temps Phase 1-6 | Temps Maintenance/Mois |
|------|-----------------|------------------------|
| DevOps | 80h | 10h |
| Security Engineer | 60h | 20h |
| Développeur Backend | 20h | 5h |
| Responsable Sécurité | 10h | 5h |

---

## 7. Références

- [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) - Architecture détaillée
- [SIEM_SOAR_TOPOLOGY.md](SIEM_SOAR_TOPOLOGY.md) - Topologie réseau
- [SECURITY_DEPLOYMENT_GUIDE.md](SECURITY_DEPLOYMENT_GUIDE.md) - Guide de déploiement
- [SECURITY_TESTING_PLAN.md](SECURITY_TESTING_PLAN.md) - Plan de tests
- [ROADMAP.md](ROADMAP.md) - Roadmap produit globale

---

**Document Version**: 2.0.0  
**Dernière mise à jour**: 12 Mars 2026  
**Auteur**: Security Architecture Team  
**Statut**: ✅ Approuvé pour Implémentation
