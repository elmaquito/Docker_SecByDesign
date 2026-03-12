# Security Monitoring Playbooks - NOTIMATIC v2.0

## Date de Création
**12 Mars 2026**

## Version
**2.0.0 - Security Stack Integration**

---

## 1. Introduction

Ce document décrit les playbooks SOAR (Security Orchestration, Automation and Response) et les procédures de réponse aux incidents pour NOTIMATIC v2.0. Ces playbooks sont implémentés dans Shuffle SOAR et définissent les réponses automatisées aux événements de sécurité détectés par Wazuh SIEM, Falco et Suricata.

### Conventions
- **Automatisé** : Action exécutée sans intervention humaine
- **Semi-auto** : Action automatisée avec notification d'un humain
- **Manuel** : Action nécessitant intervention humaine

---

## 2. Playbook 1 : Brute Force Authentication

### Référence MITRE ATT&CK
- **Tactique** : Credential Access (TA0006)
- **Technique** : T1110 - Brute Force

### Trigger
- **Source** : Wazuh Rule ID 5551, 5710, 5712
- **Condition** : 5+ échecs d'authentification depuis la même IP en 5 minutes
- **Niveau Wazuh** : 10+

### Workflow Shuffle

```
[Déclenchement Wazuh Alert]
         │
         ▼
[Extraction IP Source]
         │
         ▼
[Vérification AbuseIPDB API]
         │
    ┌────┴────┐
    │         │
    ▼         ▼
[Score > 50] [Score ≤ 50]
    │         │
    ▼         ▼
[Blocage IP  [Log uniquement
 Traefik     + Alerte Slack
 15 minutes] "Surveillance"]
    │
    ▼
[Création Incident Wazuh]
    │
    ▼
[Notification Slack #security]
    │
    ▼
[Email si > 10 tentatives]
```

### Actions Automatisées

| Étape | Action | Timeout | Rollback |
|-------|--------|---------|---------|
| 1 | Extraction métadonnées alerte | 10s | N/A |
| 2 | Requête AbuseIPDB API | 30s | Skip blocage si API indispo |
| 3 | Blocage IP Traefik (si score > 50) | 5s | Auto-déblocage 15min |
| 4 | Création incident Wazuh | 10s | Log local si Wazuh indispo |
| 5 | Notification Slack | 10s | Email si Slack indispo |
| 6 | Email (si > 10 tentatives) | 30s | Log si SMTP indispo |

### Conditions d'Escalade Manuelle

- IP appartenant à un range interne (RFC 1918)
- Plus de 50 tentatives en 1 heure (attaque distribuée)
- Tentatives sur compte administrateur

### Code Shuffle (JSON Workflow)

```json
{
  "name": "Brute Force Response",
  "description": "Automated response to brute force attacks",
  "trigger": {
    "type": "webhook",
    "source": "wazuh",
    "condition": "rule.level >= 10 AND rule.id IN [5551, 5710, 5712]"
  },
  "actions": [
    {
      "name": "check_ip_reputation",
      "app": "AbuseIPDB",
      "action": "check_ip",
      "params": {"ip": "$alert.src_ip", "maxAgeInDays": 90}
    },
    {
      "name": "block_ip_traefik",
      "condition": "$check_ip_reputation.abuseConfidenceScore > 50",
      "app": "HTTP",
      "action": "POST",
      "url": "http://traefik:8080/api/middlewares/block-ip",
      "params": {"ip": "$alert.src_ip", "duration": "15m"}
    },
    {
      "name": "notify_slack",
      "app": "Slack",
      "action": "post_message",
      "channel": "#security",
      "message": "🚨 Brute Force detected from $alert.src_ip | Score: $check_ip_reputation.abuseConfidenceScore | Action: $block_ip_traefik.status"
    }
  ]
}
```

---

## 3. Playbook 2 : SQL Injection Detection

### Référence MITRE ATT&CK
- **Tactique** : Initial Access (TA0001)
- **Technique** : T1190 - Exploit Public-Facing Application

### Trigger
- **Source** : Wazuh Rule ID 31101-31110 (SQL Injection patterns)
- **Condition** : Pattern SQL injection détecté dans les logs Kong/Backend
- **Niveau Wazuh** : 12+

### Workflow Shuffle

```
[Alerte SQL Injection Wazuh]
         │
         ▼
[Extraction détails requête]
[IP Source, URL, Payload]
         │
         ▼
[Blocage IP Traefik immédiat (1h)]
         │
         ▼
[Création Incident Critique P1]
         │
         ▼
[Notification Slack #security-critical]
         │
         ▼
[Email équipe sécurité]
         │
         ▼
[Vérification intégrité PostgreSQL]
  - Requête pg_stat_activity (connexions actives)
  - Check audit_logs table (dernières requêtes)
         │
    ┌────┴────┐
    │         │
    ▼         ▼
[Anomalie DB] [DB Normale]
    │              │
    ▼              ▼
[Snapshot DB] [Log résultat]
[Alerte P0]
```

### Actions Automatisées

| Étape | Action | Priorité | Timeout |
|-------|--------|----------|---------|
| 1 | Blocage IP Traefik | CRITIQUE | 5s |
| 2 | Log complet requête malveillante | CRITIQUE | 5s |
| 3 | Création incident Wazuh (P1) | HAUTE | 10s |
| 4 | Notification Slack | HAUTE | 10s |
| 5 | Email équipe sécurité | HAUTE | 30s |
| 6 | Check intégrité PostgreSQL | HAUTE | 60s |
| 7 | Snapshot DB si anomalie | CRITIQUE | 120s |

### Patterns SQL Injection Détectés

```regex
Patterns Wazuh (règles personnalisées):
  - UNION SELECT
  - OR '1'='1'
  - DROP TABLE
  - INSERT INTO (hors API)
  - --  (commentaire SQL)
  - xp_cmdshell
  - EXEC sp_
  - WAITFOR DELAY
  - BENCHMARK(
  - SLEEP(
```

---

## 4. Playbook 3 : Container Anomaly (Falco)

### Référence MITRE ATT&CK
- **Tactique** : Execution (TA0002)
- **Technique** : T1059 - Command and Scripting Interpreter

### Trigger
- **Source** : Falco → Wazuh (via HTTP webhook)
- **Condition** : Shell spawné dans container production, accès fichier sensible, process non autorisé
- **Priorité Falco** : CRITICAL ou HIGH

### Sous-Playbooks par Type d'Anomalie

#### 4.1 Shell dans Container Production

```
[Falco: shell_in_container CRITICAL]
         │
         ▼
[Identification container + user]
         │
         ▼
[Capture état container (docker inspect)]
         │
         ▼
[Pause container (docker pause)]
         │
         ▼
[Capture mémoire/processus (forensique)]
         │
         ▼
[Alerte P1 Slack + Email + SMS astreinte]
         │
         ▼
[Attente intervention équipe sécurité]
```

#### 4.2 Accès Fichier Sensible

```
[Falco: read_sensitive_file HIGH]
         │
         ▼
[Identification fichier + processus]
         │
         ▼
[Log complet de l'accès]
         │
    ┌────┴────┐
    │         │
    ▼         ▼
[.env, secrets] [Autres]
    │              │
    ▼              ▼
[Alerte P1]   [Alerte P2]
[Pause        [Log +
 Container]    Surveillance]
```

#### 4.3 Connexion DB Anormale

```
[Falco: unexpected_db_connection HIGH]
         │
         ▼
[Identification container source]
         │
         ▼
[Si NON backend-api]
         │
         ▼
[Blocage réseau container (iptables)]
         │
         ▼
[Alerte P1 + Investigation]
```

### Règles Falco Personnalisées NOTIMATIC

```yaml
# falco_rules_notimatic.yaml

- rule: Shell Spawned in Production Container
  desc: A shell was spawned in a NOTIMATIC production container
  condition: >
    spawned_process and
    shell_procs and
    container and
    container.name in (backend-api, frontend, kong, keycloak) and
    not proc.name in (sh, bash, ash) and
    proc.pname in (node, nginx, java)
  output: >
    Shell spawned in production container
    (user=%user.name container=%container.name
     shell=%proc.name parent=%proc.pname
     cmdline=%proc.cmdline)
  priority: CRITICAL
  tags: [container, shell, mitre_execution]

- rule: Read Sensitive File in Container
  desc: Sensitive file (.env, secrets) read in container
  condition: >
    open_read and
    container and
    fd.name in (/app/.env, /run/secrets, /etc/ssl/private)
  output: >
    Sensitive file read in container
    (user=%user.name file=%fd.name container=%container.name
     proc=%proc.name)
  priority: HIGH
  tags: [container, sensitive_file, mitre_collection]

- rule: Unexpected DB Connection from Non-Backend
  desc: Database connection attempt from non-backend container
  condition: >
    outbound and
    fd.sport = 5432 and
    container and
    not container.name = backend-api
  output: >
    Unexpected PostgreSQL connection
    (container=%container.name src=%fd.sip dst=%fd.dip)
  priority: HIGH
  tags: [network, database, mitre_lateral_movement]
```

---

## 5. Playbook 4 : Privilege Escalation

### Référence MITRE ATT&CK
- **Tactique** : Privilege Escalation (TA0004)
- **Technique** : T1611 - Escape to Host

### Trigger
- **Sources** : Falco (container escape) + Wazuh (sudo rules)
- **Condition** : Tentative d'escalade dans un container ou sur l'hôte
- **Niveau** : CRITIQUE

### Workflow Shuffle

```
[Alerte Privilege Escalation]
         │
         ▼
[Identification vecteur]
  - Container escape?
  - Sudo abuse?
  - SUID exploit?
         │
         ▼
[ARRÊT du service concerné]
[docker stop <container>]
         │
         ▼
[Isolation réseau (iptables DROP)]
         │
         ▼
[Snapshot forensique]
         │
         ▼
[Alerte P0 toute l'équipe]
[Slack + Email + SMS]
         │
         ▼
[Mode investigation manuelle]
```

---

## 6. Playbook 5 : Network Scan / Port Scan

### Référence MITRE ATT&CK
- **Tactique** : Discovery (TA0007)
- **Technique** : T1046 - Network Service Discovery

### Trigger
- **Source** : Suricata Rule ET SCAN
- **Condition** : Scan de ports détecté (>10 ports en 1 minute)
- **Niveau** : MOYEN

### Workflow Shuffle

```
[Suricata: ET SCAN alert]
         │
         ▼
[Extraction IP source + ports scannés]
         │
         ▼
[Vérification IP (AbuseIPDB + IP interne?)]
         │
    ┌────┴────┐
    │         │
    ▼         ▼
[IP Externe] [IP Interne]
    │              │
    ▼              ▼
[Blocage 1h]  [Alerte
[Slack notif]  Superviseur
               (Insider?)]
```

---

## 7. Playbook 6 : GDPR Data Access Anomaly

### Référence RGPD
- **Article** : Art. 32 - Sécurité du traitement
- **Article** : Art. 33 - Notification des violations

### Trigger
- **Source** : Wazuh (custom GDPR rules)
- **Condition** : Accès massif aux données personnelles (>1000 enregistrements en 1 req), export non autorisé, accès hors heures

### Workflow Shuffle

```
[Wazuh GDPR Alert]
         │
         ▼
[Analyse de la requête]
[User ID, Volume, Heure]
         │
         ▼
[Log complet pour compliance]
         │
         ▼
[Notification DPO par email]
         │
         ▼
[Si export >10000 enregistrements]
         │
         ▼
[Suspension temporaire endpoint]
[Alerte P1]
```

---

## 8. Procédures Manuelles d'Investigation

### 8.1 Investigation Brute Force

```bash
# 1. Voir les tentatives récentes (Elasticsearch)
curl -X GET "http://elasticsearch:9200/notimatic-auth-*/_search" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "bool": {
        "must": [
          {"match": {"event.category": "authentication"}},
          {"match": {"event.outcome": "failure"}}
        ],
        "filter": [
          {"range": {"@timestamp": {"gte": "now-1h"}}}
        ]
      }
    },
    "aggs": {
      "by_ip": {
        "terms": {"field": "source.ip", "size": 20}
      }
    }
  }'

# 2. Vérifier les IPs bloquées dans Traefik
curl http://traefik:8080/api/middlewares

# 3. Vérifier les incidents Wazuh
curl -u admin:password -X GET \
  "https://wazuh-manager:55000/security/events?level=10&limit=50"
```

### 8.2 Investigation Container Anomaly

```bash
# 1. Voir les événements Falco récents
docker logs falco --tail 100 | grep CRITICAL

# 2. Inspecter le container suspect
docker inspect <container_id>
docker top <container_id>

# 3. Capturer les processus en cours
docker exec <container_id> ps aux

# 4. Voir les connexions réseau
docker exec <container_id> netstat -tlnp

# 5. Capturer l'état du container (forensique)
docker export <container_id> > /tmp/forensic_$(date +%Y%m%d_%H%M%S).tar
```

### 8.3 Investigation SQL Injection

```bash
# 1. Voir les logs Kong pour l'IP suspecte
curl "http://elasticsearch:9200/notimatic-kong-*/_search" \
  -d '{"query": {"match": {"client.ip": "1.2.3.4"}}}'

# 2. Vérifier l'audit table PostgreSQL
psql -U postgres notimatic -c \
  "SELECT * FROM audit_logs WHERE ip_address='1.2.3.4' ORDER BY created_at DESC LIMIT 50;"

# 3. Vérifier les connexions DB actives
psql -U postgres notimatic -c \
  "SELECT pid, usename, application_name, client_addr, state, query 
   FROM pg_stat_activity WHERE state != 'idle';"
```

---

## 9. Escalade et Contacts

### 9.1 Matrice d'Escalade

| Sévérité | Contact Initial | Escalade 30min | Escalade 1h |
|----------|----------------|----------------|-------------|
| P0 | Astreinte + CTO | CTO + CEO | N/A |
| P1 | Astreinte | CTO | CEO |
| P2 | DevOps lead | Security lead | CTO |
| P3 | DevOps | DevOps lead | Security lead |
| P4 | Ticket async | N/A | N/A |

### 9.2 Canaux de Communication par Sévérité

```yaml
P0 - Critique:
  - SMS astreinte (immédiat)
  - Appel téléphonique CTO (immédiat)
  - Slack #security-critical (immédiat)
  - Email all-hands (< 15 minutes)

P1 - Élevé:
  - Slack #security-critical (immédiat)
  - Email équipe sécurité (< 5 minutes)
  - Ticket jira P1 (< 10 minutes)

P2 - Moyen:
  - Slack #security (immédiat)
  - Ticket jira P2 (< 30 minutes)

P3/P4 - Faible:
  - Ticket jira P3/P4 (async)
```

---

## 10. Métriques des Playbooks

### 10.1 SLA par Playbook

| Playbook | Temps Détection | Temps Réponse Auto | Temps Résolution |
|----------|----------------|-------------------|-----------------|
| Brute Force | < 5 min | < 2 min | < 20 min |
| SQL Injection | < 1 min | < 30 sec | < 1 heure |
| Container Anomaly | < 30 sec | < 1 min | < 2 heures |
| Privilege Escalation | < 30 sec | < 1 min | < 4 heures |
| Port Scan | < 5 min | < 2 min | < 30 min |
| GDPR Anomaly | < 10 min | < 5 min | < 24 heures |

### 10.2 Métriques à Suivre (Kibana Dashboard)

```yaml
Métriques Hebdomadaires:
  - Nombre de playbooks déclenchés par type
  - Taux de succès des actions automatisées
  - Nombre de faux positifs par playbook
  - Temps moyen de résolution (MTTR)
  - IPs bloquées (total + unique)

Métriques Mensuelles:
  - Évolution des types d'attaques
  - Efficacité des mitigations (récidive)
  - Couverture des détections (audit)
```

---

## 11. Maintenance des Playbooks

### 11.1 Cycle de Révision

- **Hebdomadaire** : Revue des faux positifs et ajustement des seuils
- **Mensuel** : Mise à jour des rules Wazuh (Emerging Threats)
- **Trimestriel** : Test complet des playbooks (red team exercise)
- **Annuel** : Révision complète des workflows SOAR

### 11.2 Tests des Playbooks

```bash
# Test Playbook Brute Force (dry-run)
for i in {1..6}; do
  curl -X POST http://keycloak:8080/auth/realms/notimatic/protocol/openid-connect/token \
    -d "client_id=notimatic-app&username=test@test.com&password=wrong_password&grant_type=password"
done

# Vérifier l'alerte Wazuh (niveau 10+)
# Vérifier la notification Slack
# Vérifier le blocage IP Traefik
```

---

## 12. Références

- [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) - Architecture globale
- [THREAT_MODEL_SECURITY_STACK.md](THREAT_MODEL_SECURITY_STACK.md) - Modèle de menaces
- [SECURITY_TESTING_PLAN.md](SECURITY_TESTING_PLAN.md) - Plan de tests
- [Shuffle Documentation](https://shuffler.io/docs)
- [Wazuh Rules Documentation](https://documentation.wazuh.com/current/user-manual/ruleset/ruleset-xml-syntax/rules.html)
- [Falco Rules Reference](https://falco.org/docs/rules/)

---

**Document Version**: 2.0.0  
**Dernière mise à jour**: 12 Mars 2026  
**Auteur**: Security Architecture Team  
**Statut**: ✅ Approuvé pour Implémentation
