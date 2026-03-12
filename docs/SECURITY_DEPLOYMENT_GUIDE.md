# Guide de Déploiement Sécurité - NOTIMATIC v2.0

## Date de Création
**12 Mars 2026**

## Version
**2.0.0 - Security Stack Integration**

---

## 1. Introduction

Ce guide décrit les étapes détaillées pour déployer la stack de sécurité SIEM/SOAR sur NOTIMATIC. Il est destiné aux équipes DevOps et Security qui opèrent l'infrastructure.

### Prérequis
- Docker 24.0+
- Docker Compose 2.20+
- Kernel Linux 5.10+ (pour Falco eBPF)
- RAM: minimum 16GB disponibles (32GB recommandés)
- Disk: minimum 100GB libres (500GB en production)
- Accès HTTPS sortant (threat intel feeds)

---

## 2. Déploiement Phase 1 : Elasticsearch + Kibana + Filebeat

### 2.1 Configuration Elasticsearch

Créer le fichier `infrastructure/security/elasticsearch.yml` :

```yaml
# elasticsearch.yml
cluster.name: notimatic-security
node.name: notimatic-es-01
network.host: 0.0.0.0
http.port: 9200
transport.port: 9300

# Security
xpack.security.enabled: true
xpack.security.transport.ssl.enabled: true
xpack.security.transport.ssl.verification_mode: certificate
xpack.security.transport.ssl.keystore.path: elastic-certificates.p12
xpack.security.transport.ssl.truststore.path: elastic-certificates.p12
xpack.security.http.ssl.enabled: false  # TLS géré par Traefik

# Performance
bootstrap.memory_lock: true
indices.memory.index_buffer_size: 30%

# Index lifecycle
indices.lifecycle.poll_interval: 1m
```

### 2.2 Configuration Kibana

Créer le fichier `infrastructure/security/kibana.yml` :

```yaml
# kibana.yml
server.name: notimatic-kibana
server.host: 0.0.0.0
server.port: 5601

elasticsearch.hosts: ["http://elasticsearch:9200"]
elasticsearch.username: "kibana_system"
elasticsearch.password: "${KIBANA_SYSTEM_PASSWORD}"

# Security
xpack.security.enabled: true
xpack.encryptedSavedObjects.encryptionKey: "${KIBANA_ENCRYPTION_KEY}"

# Monitoring
monitoring.ui.enabled: true

# OIDC via Keycloak
xpack.security.authc.providers:
  oidc.oidc1:
    order: 0
    realm: oidc1
    description: "Login avec Keycloak"
  basic.basic1:
    order: 1
```

### 2.3 Configuration Filebeat

Créer le fichier `infrastructure/security/filebeat.yml` :

```yaml
# filebeat.yml
filebeat.inputs:

# Logs Docker (tous les containers)
- type: container
  paths:
    - '/var/lib/docker/containers/*/*.log'
  processors:
    - add_docker_metadata:
        host: "unix:///var/run/docker.sock"
    - decode_json_fields:
        fields: ["message"]
        target: "json"
        overwrite_keys: true

# Logs Traefik access
- type: log
  paths:
    - /var/log/traefik/access.log
  fields:
    service: traefik
    log_type: access

# Suricata events
- type: log
  paths:
    - /var/log/suricata/eve.json
  json.keys_under_root: true
  json.add_error_key: true
  fields:
    service: suricata

# Output vers Elasticsearch
output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  username: "filebeat_internal"
  password: "${FILEBEAT_INTERNAL_PASSWORD}"
  index: "notimatic-%{[fields.service]}-%{+yyyy.MM.dd}"

# Template ILM
setup.ilm.enabled: true
setup.ilm.rollover_alias: "notimatic"
setup.ilm.policy_name: "notimatic-ilm-policy"

# Logging Filebeat lui-même
logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat.log
  keepfiles: 3
  permissions: 0600
```

### 2.4 Docker Compose - Stack ELK

Ajouter dans `infrastructure/security/docker-compose.security.yml` :

```yaml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.3
    container_name: elasticsearch
    environment:
      - node.name=notimatic-es-01
      - cluster.name=notimatic-security
      - discovery.type=single-node
      - ELASTIC_PASSWORD=${ELASTIC_PASSWORD}
      - xpack.security.enabled=true
      - xpack.security.http.ssl.enabled=false
      - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
      - ./elasticsearch.yml:/usr/share/elasticsearch/config/elasticsearch.yml:ro
    networks:
      - net-security
    ulimits:
      memlock:
        soft: -1
        hard: -1
    healthcheck:
      test: ["CMD-SHELL", "curl -s -u elastic:${ELASTIC_PASSWORD} http://localhost:9200/_cluster/health | grep -q '\"status\":\"green\"\\|\"status\":\"yellow\"'"]
      interval: 30s
      timeout: 10s
      retries: 5

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.3
    container_name: kibana
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
      - ELASTICSEARCH_USERNAME=kibana_system
      - ELASTICSEARCH_PASSWORD=${KIBANA_SYSTEM_PASSWORD}
      - KIBANA_ENCRYPTION_KEY=${KIBANA_ENCRYPTION_KEY}
    volumes:
      - ./kibana.yml:/usr/share/kibana/config/kibana.yml:ro
    networks:
      - net-security
    depends_on:
      elasticsearch:
        condition: service_healthy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.kibana.rule=Host(`kibana.notimatic.local`)"
      - "traefik.http.routers.kibana.tls=true"

  filebeat:
    image: docker.elastic.co/beats/filebeat:8.11.3
    container_name: filebeat
    user: root
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
      - FILEBEAT_INTERNAL_PASSWORD=${FILEBEAT_INTERNAL_PASSWORD}
    volumes:
      - ./filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /var/log:/var/log:ro
    networks:
      - net-security
      - net-dmz
    depends_on:
      elasticsearch:
        condition: service_healthy
    command: filebeat -e -strict.perms=false

volumes:
  elasticsearch-data:
    driver: local

networks:
  net-security:
    external: true
  net-dmz:
    external: true
```

### 2.5 Variables d'Environnement

Créer le fichier `infrastructure/security/.env.security` :

```env
# Elasticsearch
ELASTIC_PASSWORD=ChangeMeStrong!2026Es

# Kibana
KIBANA_SYSTEM_PASSWORD=ChangeMeStrong!2026Ki
KIBANA_ENCRYPTION_KEY=ChangeMeStrong!2026EncrKey32chars

# Filebeat
FILEBEAT_INTERNAL_PASSWORD=ChangeMeStrong!2026Fb

# Wazuh
WAZUH_API_PASSWORD=ChangeMeStrong!2026Wz
WAZUH_API_USER=wazuh-admin

# Shuffle
SHUFFLE_DEFAULT_USERNAME=admin@notimatic.local
SHUFFLE_DEFAULT_PASSWORD=ChangeMeStrong!2026Sh

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../...
SMTP_HOST=smtp.notimatic.local
SMTP_PORT=587
SMTP_USER=security@notimatic.local
SMTP_PASSWORD=ChangeMeStrong!2026Smtp

# AbuseIPDB
ABUSEIPDB_API_KEY=your_api_key_here
```

> ⚠️ **ATTENTION** : Ne jamais committer ce fichier en clair. Utiliser Docker Secrets ou un Vault en production.

### 2.6 Déploiement et Validation Phase 1

```bash
# 1. Créer les réseaux Docker
docker network create --subnet=172.32.0.0/24 net-security
docker network create --subnet=172.29.0.0/24 net-dmz

# 2. Déployer la stack ELK
cd infrastructure/security
docker compose -f docker-compose.security.yml --env-file .env.security up -d elasticsearch

# 3. Attendre qu'Elasticsearch soit prêt
docker compose -f docker-compose.security.yml logs -f elasticsearch

# 4. Configurer les users internes Elasticsearch
docker exec elasticsearch bin/elasticsearch-setup-passwords auto

# 5. Déployer Kibana et Filebeat
docker compose -f docker-compose.security.yml --env-file .env.security up -d kibana filebeat

# 6. Validation : vérifier les index
curl -u elastic:${ELASTIC_PASSWORD} http://localhost:9200/_cat/indices?v

# 7. Vérification Kibana
curl http://localhost:5601/api/status
```

---

## 3. Déploiement Phase 2 : Wazuh SIEM

### 3.1 Configuration Wazuh Manager

Créer `infrastructure/security/wazuh/ossec.conf` :

```xml
<ossec_config>
  <!-- Global Configuration -->
  <global>
    <jsonout_output>yes</jsonout_output>
    <alerts_log>yes</alerts_log>
    <logall>no</logall>
    <logall_json>no</logall_json>
    <email_notification>yes</email_notification>
    <smtp_server>smtp.notimatic.local</smtp_server>
    <email_from>wazuh@notimatic.local</email_from>
    <email_to>security@notimatic.local</email_to>
    <email_maxperhour>24</email_maxperhour>
    <email_alert_level>10</email_alert_level>
  </global>

  <!-- Elasticsearch Integration -->
  <integration>
    <name>elastic</name>
    <hook_url>http://elasticsearch:9200</hook_url>
    <alert_format>json</alert_format>
    <api_key>filebeat_internal:${FILEBEAT_INTERNAL_PASSWORD}</api_key>
    <options>{"index_name": "wazuh-alerts"}</options>
  </integration>

  <!-- Shuffle SOAR Integration -->
  <integration>
    <name>shuffle</name>
    <hook_url>http://shuffle-backend:3001/api/v1/hooks/webhook_notimatic</hook_url>
    <level>7</level>
    <alert_format>json</alert_format>
  </integration>

  <!-- Rules -->
  <rules>
    <include>rules_config.xml</include>
    <include>pam_rules.xml</include>
    <include>sshd_rules.xml</include>
    <include>nginx_rules.xml</include>
    <include>local_rules.xml</include>
    <include>notimatic_rules.xml</include>
  </rules>

  <!-- Syscheck (File Integrity) -->
  <syscheck>
    <disabled>no</disabled>
    <frequency>43200</frequency>
    <scan_on_start>yes</scan_on_start>
    <directories check_all="yes" report_changes="yes">/etc/wazuh-manager/rules</directories>
    <directories check_all="yes">/usr/share/wazuh-manager</directories>
    <ignore>/proc</ignore>
    <ignore>/tmp</ignore>
  </syscheck>
</ossec_config>
```

### 3.2 Règles Personnalisées NOTIMATIC

Créer `infrastructure/security/wazuh/notimatic_rules.xml` :

```xml
<!-- notimatic_rules.xml -->
<group name="notimatic,">

  <!-- Brute Force Authentication -->
  <rule id="100001" level="10" frequency="5" timeframe="300">
    <if_matched_sid>5710</if_matched_sid>
    <description>NOTIMATIC: Brute force attack detected from $(srcip)</description>
    <group>authentication_failures,brute_force,</group>
  </rule>

  <!-- SQL Injection Attempt -->
  <rule id="100010" level="12">
    <if_group>web</if_group>
    <regex>UNION.*SELECT|SELECT.*FROM.*WHERE|DROP.*TABLE|INSERT.*INTO|'.*OR.*'1'='1</regex>
    <description>NOTIMATIC: SQL Injection attempt from $(srcip)</description>
    <group>attack,sql_injection,</group>
  </rule>

  <!-- XSS Attempt -->
  <rule id="100011" level="10">
    <if_group>web</if_group>
    <regex>&lt;script|javascript:|onerror=|onload=|alert\(|document\.cookie</regex>
    <description>NOTIMATIC: XSS attempt from $(srcip)</description>
    <group>attack,xss,</group>
  </rule>

  <!-- GDPR: Mass Data Access -->
  <rule id="100020" level="8">
    <if_group>web</if_group>
    <regex>GET /api/admin/users|limit=1000|export.*csv</regex>
    <description>NOTIMATIC: GDPR - Potential mass data access by $(srcip)</description>
    <group>gdpr,data_access,</group>
  </rule>

  <!-- Container Anomaly via Falco -->
  <rule id="100030" level="14">
    <if_sid>91100</if_sid>
    <match>CRITICAL</match>
    <description>NOTIMATIC: Critical Falco alert - container anomaly detected</description>
    <group>container,falco,critical,</group>
  </rule>

  <!-- Suricata Network Intrusion -->
  <rule id="100040" level="12">
    <if_sid>86601</if_sid>
    <description>NOTIMATIC: Suricata IDS alert - network intrusion detected</description>
    <group>network,suricata,ids,</group>
  </rule>

</group>
```

### 3.3 Déploiement et Validation Phase 2

```bash
# 1. Déployer Wazuh Manager
docker compose -f docker-compose.security.yml --env-file .env.security up -d wazuh-manager wazuh-indexer

# 2. Vérifier le statut
docker exec wazuh-manager /var/ossec/bin/ossec-control status

# 3. Tester les règles (simulation brute force)
for i in {1..6}; do
  logger -n 127.0.0.1 -P 514 "sshd[1234]: Failed password for admin from 1.2.3.4 port 12345 ssh2"
done

# 4. Vérifier les alertes
tail -f /var/ossec/logs/alerts/alerts.json | jq .

# 5. Vérifier l'intégration Elasticsearch
curl -u elastic:${ELASTIC_PASSWORD} \
  "http://elasticsearch:9200/wazuh-alerts-*/_search?q=rule.level:10&size=5"
```

---

## 4. Déploiement Phase 3 : Falco

### 4.1 Configuration Falco

Créer `infrastructure/security/falco/falco.yaml` :

```yaml
# falco.yaml
rules_file:
  - /etc/falco/falco_rules.yaml
  - /etc/falco/falco_rules.local.yaml
  - /etc/falco/notimatic_rules.yaml

# JSON output
json_output: true
json_include_output_property: true
json_include_tags_property: true

# HTTP Output (vers Wazuh)
http_output:
  enabled: true
  url: "http://wazuh-manager:55000/events"
  user_agent: "falcosecurity/falco"

# gRPC output (pour intégration avancée)
grpc:
  enabled: false

# Logging
log_stderr: true
log_syslog: false
log_level: info

# Driver (eBPF recommandé)
driver:
  kind: ebpf
  ebpf:
    probe: ${HOME}/.falco/falco-bpf.o
    buf_size_preset: 4
```

### 4.2 Déploiement Falco

```bash
# 1. Vérifier le kernel BPF support
uname -r  # Doit être >= 5.10
ls /sys/kernel/btf/vmlinux  # BTF requis pour eBPF

# 2. Déployer Falco
docker compose -f docker-compose.security.yml --env-file .env.security up -d falco

# 3. Tester Falco
docker exec falco falco --version
docker logs falco --tail 50

# 4. Test de détection : spawner un shell dans le container backend
docker exec backend-api /bin/sh -c "echo 'test'"
# Vérifier l'alerte Falco dans les logs
docker logs falco --tail 10 | grep CRITICAL
```

---

## 5. Déploiement Phase 4 : Suricata

### 5.1 Configuration Suricata

Créer `infrastructure/security/suricata/suricata.yaml` :

```yaml
# suricata.yaml
vars:
  address-groups:
    HOME_NET: "[172.28.0.0/16,172.29.0.0/24,172.30.0.0/24,172.31.0.0/24]"
    EXTERNAL_NET: "!$HOME_NET"
    HTTP_SERVERS: "$HOME_NET"
    SQL_SERVERS: "[172.31.0.10]"

  port-groups:
    HTTP_PORTS: "80,443,8080,8443,3000"

# Network capture
af-packet:
  - interface: br-public
    cluster-id: 99
    cluster-type: cluster_flow
    defrag: yes

# Outputs
outputs:
  - fast:
      enabled: yes
      filename: /var/log/suricata/fast.log
  - eve-log:
      enabled: yes
      filename: /var/log/suricata/eve.json
      types:
        - alert
        - http
        - dns
        - tls
        - files
        - flow

# Rules
rule-files:
  - /var/lib/suricata/rules/suricata.rules
  - /etc/suricata/notimatic.rules

# Performance
max-pending-packets: 1024
```

### 5.2 Règles Suricata Personnalisées

Créer `infrastructure/security/suricata/notimatic.rules` :

```
# Notimatic Custom Rules

# Détection scan de ports
alert tcp $EXTERNAL_NET any -> $HOME_NET any (msg:"NOTIMATIC Port Scan Detected"; flags:S; threshold: type both, track by_src, count 10, seconds 60; sid:9000001; rev:1;)

# Détection tentatives sur port DB PostgreSQL
alert tcp $EXTERNAL_NET any -> $SQL_SERVERS 5432 (msg:"NOTIMATIC Direct DB Access Attempt from External"; sid:9000002; rev:1;)

# Détection User-Agent suspect (outils de hack connus)
alert http $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS (msg:"NOTIMATIC Suspicious Scanner User-Agent"; http.user_agent; content:"sqlmap"; nocase; sid:9000003; rev:1;)
alert http $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS (msg:"NOTIMATIC Suspicious Scanner User-Agent"; http.user_agent; content:"nikto"; nocase; sid:9000004; rev:1;)
alert http $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS (msg:"NOTIMATIC Suspicious Scanner User-Agent"; http.user_agent; content:"nmap"; nocase; sid:9000005; rev:1;)
```

---

## 6. Déploiement Phase 5 : Shuffle SOAR

### 6.1 Configuration Shuffle

```bash
# 1. Déployer Shuffle
docker compose -f docker-compose.security.yml --env-file .env.security up -d shuffle-backend shuffle-frontend shuffle-database

# 2. Attendre le démarrage
sleep 30
curl http://localhost:3001/api/v1/healthz

# 3. Créer le compte admin initial
curl -X POST http://localhost:3001/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@notimatic.local",
    "password": "'${SHUFFLE_DEFAULT_PASSWORD}'",
    "role": "admin"
  }'

# 4. Importer les playbooks depuis le répertoire workflows/
for workflow in infrastructure/security/shuffle/workflows/*.json; do
  curl -X POST http://localhost:3001/api/v1/workflows \
    -H "Authorization: Bearer ${SHUFFLE_TOKEN}" \
    -H "Content-Type: application/json" \
    -d @${workflow}
done
```

### 6.2 Configuration Webhook Wazuh → Shuffle

```bash
# Ajouter dans ossec.conf de Wazuh
docker exec wazuh-manager bash -c "cat >> /var/ossec/etc/ossec.conf <<EOF
<integration>
  <name>shuffle</name>
  <hook_url>http://shuffle-backend:3001/api/v1/hooks/webhook_notimatic_security</hook_url>
  <level>7</level>
  <alert_format>json</alert_format>
</integration>
EOF"

# Redémarrer Wazuh
docker exec wazuh-manager /var/ossec/bin/ossec-control restart
```

---

## 7. Vérification Post-Déploiement

### 7.1 Checklist de Validation

```bash
#!/bin/bash
# validate_security_stack.sh

echo "=== Validation Stack Sécurité NOTIMATIC v2.0 ==="

# Elasticsearch
echo -n "Elasticsearch: "
curl -s -u elastic:${ELASTIC_PASSWORD} http://localhost:9200/_cluster/health | \
  jq -r '.status' | grep -q "green\|yellow" && echo "✅ OK" || echo "❌ KO"

# Kibana
echo -n "Kibana: "
curl -s http://localhost:5601/api/status | \
  jq -r '.status.overall.level' | grep -q "available" && echo "✅ OK" || echo "❌ KO"

# Filebeat (check index)
echo -n "Filebeat indices: "
curl -s -u elastic:${ELASTIC_PASSWORD} \
  "http://localhost:9200/notimatic-*/_count" | \
  jq -r '.count' | grep -q "^[0-9]" && echo "✅ OK (des logs sont présents)" || echo "❌ KO"

# Wazuh
echo -n "Wazuh Manager: "
docker exec wazuh-manager /var/ossec/bin/ossec-control status | \
  grep -q "is running" && echo "✅ OK" || echo "❌ KO"

# Falco
echo -n "Falco: "
docker inspect falco --format='{{.State.Status}}' | \
  grep -q "running" && echo "✅ OK" || echo "❌ KO"

# Suricata
echo -n "Suricata: "
docker inspect suricata --format='{{.State.Status}}' | \
  grep -q "running" && echo "✅ OK" || echo "❌ KO"

# Shuffle
echo -n "Shuffle SOAR: "
curl -s http://localhost:3001/api/v1/healthz | \
  grep -q "healthy" && echo "✅ OK" || echo "❌ KO"

echo ""
echo "=== Test de détection ==="
echo "Lancement test brute force (6 tentatives)..."
# Test à réaliser manuellement
echo "→ Exécuter: for i in {1..6}; do curl -X POST http://localhost:8080/auth/login -d '{\"email\":\"test@test.com\",\"password\":\"wrong\"}'; done"
echo "→ Vérifier alerte dans Wazuh et notification Slack"
```

### 7.2 Tests de Fumée

```bash
# Test 1: Logs Docker collectés par Filebeat
docker logs backend-api 2>&1 | tail -5
sleep 30
curl -s -u elastic:${ELASTIC_PASSWORD} \
  "http://localhost:9200/notimatic-backend-api-*/_count" | jq '.count'
# Expected: count > 0

# Test 2: Wazuh reçoit les events de sécurité
echo '{"rule":{"level":7,"id":"100001"},"srcip":"1.2.3.4"}' | \
  nc -u wazuh-manager 1514
tail -1 /var/ossec/logs/alerts/alerts.json | jq .rule.id
# Expected: 100001

# Test 3: Falco détecte un shell
docker exec backend-api /bin/sh -c "id"
sleep 5
docker logs falco --tail 5 | grep "Shell Spawned"
# Expected: ligne de log Falco CRITICAL
```

---

## 8. Maintenance et Opérations

### 8.1 Mises à Jour

```bash
# Mise à jour des règles Suricata (hebdomadaire)
docker exec suricata suricata-update
docker exec suricata suricata -T  # Test de configuration
docker exec suricata kill -USR2 1  # Reload rules sans redémarrage

# Mise à jour des règles Wazuh (mensuelle)
docker exec wazuh-manager apt-get update && apt-get upgrade -y wazuh-manager

# Mise à jour ELK (planifiée, avec fenêtre de maintenance)
# Voir: https://www.elastic.co/guide/en/elasticsearch/reference/current/rolling-upgrades.html
```

### 8.2 Backup et Restauration

```bash
# Backup Elasticsearch (quotidien via cron)
curl -X PUT "http://elasticsearch:9200/_snapshot/notimatic_backup" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "s3",
    "settings": {
      "bucket": "notimatic-security-backups",
      "region": "eu-west-3"
    }
  }'

# Snapshot quotidien
curl -X PUT "http://elasticsearch:9200/_snapshot/notimatic_backup/snapshot_$(date +%Y%m%d)" \
  -H "Content-Type: application/json" \
  -d '{"indices": "notimatic-*,wazuh-*", "ignore_unavailable": true}'

# Restauration en cas de perte
curl -X POST "http://elasticsearch:9200/_snapshot/notimatic_backup/snapshot_20260312/_restore" \
  -H "Content-Type: application/json" \
  -d '{"indices": "notimatic-*", "rename_pattern": "(.+)", "rename_replacement": "restored_$1"}'
```

### 8.3 Rotation des Credentials

```bash
# Rotation mensuelle recommandée
# 1. Générer nouveaux mots de passe
NEW_ELASTIC_PASS=$(openssl rand -base64 24)
NEW_KIBANA_PASS=$(openssl rand -base64 24)

# 2. Mettre à jour Elasticsearch
curl -X POST -u elastic:${ELASTIC_PASSWORD} \
  "http://elasticsearch:9200/_security/user/kibana_system/_password" \
  -H "Content-Type: application/json" \
  -d "{\"password\": \"${NEW_KIBANA_PASS}\"}"

# 3. Mettre à jour .env.security
sed -i "s/KIBANA_SYSTEM_PASSWORD=.*/KIBANA_SYSTEM_PASSWORD=${NEW_KIBANA_PASS}/" .env.security

# 4. Redémarrer Kibana
docker compose -f docker-compose.security.yml restart kibana
```

---

## 9. Troubleshooting

### 9.1 Problèmes Courants

| Problème | Cause Probable | Solution |
|---------|----------------|---------|
| Elasticsearch en rouge | Espace disque insuffisant | Libérer espace, augmenter disk.watermark.flood_stage |
| Filebeat ne collecte pas | Permissions Docker socket | Vérifier user root pour Filebeat |
| Wazuh ne génère pas d'alertes | Config ossec.conf incorrecte | `ossec-control restart` + vérifier logs |
| Falco crash au démarrage | Kernel incompatible | Vérifier kernel >= 5.10, BTF disponible |
| Shuffle n'exécute pas les playbooks | Webhook mal configuré | Vérifier URL webhook dans Wazuh config |

### 9.2 Logs de Debug

```bash
# Elasticsearch debug
docker exec elasticsearch bash -c "cat /usr/share/elasticsearch/logs/notimatic-security.log | tail -50"

# Wazuh debug
docker exec wazuh-manager bash -c "cat /var/ossec/logs/ossec.log | tail -50"

# Filebeat debug
docker exec filebeat bash -c "filebeat -e -d '*' --once 2>&1 | head -100"

# Falco debug
docker logs falco 2>&1 | tail -50
```

---

## 10. Références

- [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) - Architecture globale
- [SIEM_SOAR_TOPOLOGY.md](SIEM_SOAR_TOPOLOGY.md) - Topologie réseau
- [SECURITY_TESTING_PLAN.md](SECURITY_TESTING_PLAN.md) - Tests de validation
- [Wazuh Installation Guide](https://documentation.wazuh.com/current/installation-guide/)
- [Elasticsearch Docker Guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/docker.html)
- [Falco Installation](https://falco.org/docs/getting-started/installation/)

---

**Document Version**: 2.0.0  
**Dernière mise à jour**: 12 Mars 2026  
**Auteur**: Security Architecture Team  
**Statut**: ✅ Approuvé pour Implémentation
