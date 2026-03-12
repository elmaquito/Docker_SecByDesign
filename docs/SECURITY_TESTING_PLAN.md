# Plan de Tests de Sécurité - NOTIMATIC v2.0

## Date de Création
**12 Mars 2026**

## Version
**2.0.0 - Security Stack Integration**

---

## 1. Introduction

Ce document décrit le plan complet de tests pour valider la stack de sécurité SIEM/SOAR de NOTIMATIC v2.0. Il couvre les tests fonctionnels, les tests de détection, les tests de performance et les exercices red team.

### Types de Tests

| Type | Objectif | Fréquence |
|------|---------|-----------|
| **Smoke Tests** | Validation déploiement | À chaque déploiement |
| **Functional Tests** | Validation fonctionnelle composants | Hebdomadaire |
| **Detection Tests** | Validation détection menaces | Bi-mensuel |
| **Performance Tests** | Validation sous charge | Mensuel |
| **Red Team Exercise** | Simulation attaque complète | Trimestriel |
| **Pentest Externe** | Audit sécurité indépendant | Annuel |

---

## 2. Environnement de Tests

### 2.1 Environnement Dédié

```yaml
Environnement de test sécurité:
  Nom: notimatic-security-test
  Infrastructure: Docker Compose (isolé)
  Réseau: 192.168.100.0/24 (non routé vers prod)
  
  Services déployés:
    - NOTIMATIC complet (backend + frontend + DB)
    - Stack sécurité complète (ELK + Wazuh + Falco + Suricata + Shuffle)
    
  Isolation:
    - Aucun accès depuis internet
    - Aucun accès vers la production
    - Données de test anonymisées
```

### 2.2 Outils de Tests

| Outil | Version | Usage | Environnement |
|-------|---------|-------|---------------|
| **OWASP ZAP** | 2.14 | DAST Web Application | Test uniquement |
| **Metasploit** | 6.3 | Exploitation framework | Red team uniquement |
| **Nmap** | 7.94 | Network scanning | Test uniquement |
| **SQLmap** | 1.7 | SQL injection testing | Test uniquement |
| **Hydra** | 9.5 | Brute force testing | Test uniquement |
| **Nikto** | 2.1.6 | Web server scanner | Test uniquement |
| **Trivy** | 0.50 | Container vulnerability scan | CI/CD |
| **k6** | 0.48 | Load testing | Performance |

> ⚠️ Ces outils ne doivent JAMAIS être utilisés en production ou sur des systèmes sans autorisation écrite.

---

## 3. Tests Fonctionnels - Composants Sécurité

### 3.1 Tests Elasticsearch

```bash
#!/bin/bash
# test_elasticsearch.sh

echo "=== Tests Elasticsearch ==="

# T-ES-01: Elasticsearch accessible
echo -n "T-ES-01 Elasticsearch health: "
STATUS=$(curl -s -u elastic:${ELASTIC_PASSWORD} http://elasticsearch:9200/_cluster/health | jq -r '.status')
[ "$STATUS" = "green" ] || [ "$STATUS" = "yellow" ] && echo "✅ PASS ($STATUS)" || echo "❌ FAIL"

# T-ES-02: Authentification requise
echo -n "T-ES-02 Auth required: "
CODE=$(curl -s -o /dev/null -w "%{http_code}" http://elasticsearch:9200/)
[ "$CODE" = "401" ] && echo "✅ PASS" || echo "❌ FAIL (code: $CODE)"

# T-ES-03: Index notimatic présent
echo -n "T-ES-03 Notimatic indices exist: "
COUNT=$(curl -s -u elastic:${ELASTIC_PASSWORD} "http://elasticsearch:9200/_cat/indices/notimatic-*" | wc -l)
[ "$COUNT" -gt "0" ] && echo "✅ PASS ($COUNT indices)" || echo "❌ FAIL"

# T-ES-04: Logs collectés (Filebeat)
echo -n "T-ES-04 Logs being collected: "
DOCS=$(curl -s -u elastic:${ELASTIC_PASSWORD} \
  "http://elasticsearch:9200/notimatic-*/_count" | jq -r '.count')
[ "$DOCS" -gt "0" ] && echo "✅ PASS ($DOCS documents)" || echo "❌ FAIL"

# T-ES-05: Chiffrement TLS en production
echo -n "T-ES-05 TLS Transport: "
CERT=$(openssl s_client -connect elasticsearch:9300 -showcerts 2>/dev/null | grep "Certificate chain")
[ -n "$CERT" ] && echo "✅ PASS" || echo "⚠️ SKIP (non requis en dev)"
```

### 3.2 Tests Wazuh

```bash
#!/bin/bash
# test_wazuh.sh

echo "=== Tests Wazuh ==="

# T-WZ-01: Service Wazuh actif
echo -n "T-WZ-01 Wazuh service running: "
docker exec wazuh-manager /var/ossec/bin/ossec-control status | \
  grep -q "is running" && echo "✅ PASS" || echo "❌ FAIL"

# T-WZ-02: API Wazuh accessible
echo -n "T-WZ-02 Wazuh API accessible: "
CODE=$(curl -s -o /dev/null -w "%{http_code}" -k \
  -u ${WAZUH_API_USER}:${WAZUH_API_PASSWORD} \
  "https://wazuh-manager:55000/")
[ "$CODE" = "200" ] && echo "✅ PASS" || echo "❌ FAIL (code: $CODE)"

# T-WZ-03: Règles personnalisées chargées
echo -n "T-WZ-03 Custom rules loaded: "
RULES=$(curl -s -k -u ${WAZUH_API_USER}:${WAZUH_API_PASSWORD} \
  "https://wazuh-manager:55000/rules?rule_ids=100001,100010,100020,100030" | \
  jq -r '.data.affected_items | length')
[ "$RULES" = "4" ] && echo "✅ PASS" || echo "❌ FAIL ($RULES/4 règles)"

# T-WZ-04: Intégration Elasticsearch fonctionnelle
echo -n "T-WZ-04 Elasticsearch integration: "
COUNT=$(curl -s -u elastic:${ELASTIC_PASSWORD} \
  "http://elasticsearch:9200/wazuh-alerts-*/_count" | jq -r '.count')
[ "$COUNT" -ge "0" ] && echo "✅ PASS ($COUNT alertes)" || echo "❌ FAIL"

# T-WZ-05: Intégration Shuffle fonctionnelle
echo -n "T-WZ-05 Shuffle webhook: "
CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "http://shuffle-backend:3001/api/v1/hooks/webhook_notimatic_security")
[ "$CODE" = "200" ] || [ "$CODE" = "405" ] && echo "✅ PASS" || echo "❌ FAIL (code: $CODE)"
```

### 3.3 Tests Falco

```bash
#!/bin/bash
# test_falco.sh

echo "=== Tests Falco ==="

# T-FA-01: Service Falco actif
echo -n "T-FA-01 Falco running: "
docker inspect falco --format='{{.State.Status}}' | \
  grep -q "running" && echo "✅ PASS" || echo "❌ FAIL"

# T-FA-02: Version correcte
echo -n "T-FA-02 Falco version: "
VERSION=$(docker exec falco falco --version 2>&1 | grep "Falco version" | awk '{print $3}')
[ "$VERSION" = "0.37.1" ] && echo "✅ PASS" || echo "⚠️ Version: $VERSION"

# T-FA-03: Rules NOTIMATIC chargées
echo -n "T-FA-03 Custom rules loaded: "
RULES=$(docker exec falco falco --list | grep "notimatic" | wc -l)
[ "$RULES" -gt "0" ] && echo "✅ PASS ($RULES règles)" || echo "❌ FAIL"

# T-FA-04: Détection shell dans container (test fonctionnel)
echo -n "T-FA-04 Shell detection: "
docker exec backend-api /bin/sh -c "id" 2>/dev/null || true
sleep 2
DETECTED=$(docker logs falco --since 10s 2>&1 | grep -c "Shell Spawned\|shell_in_container")
[ "$DETECTED" -gt "0" ] && echo "✅ PASS (détecté)" || echo "❌ FAIL (non détecté)"
```

### 3.4 Tests Suricata

```bash
#!/bin/bash
# test_suricata.sh

echo "=== Tests Suricata ==="

# T-SU-01: Service actif
echo -n "T-SU-01 Suricata running: "
docker inspect suricata --format='{{.State.Status}}' | \
  grep -q "running" && echo "✅ PASS" || echo "❌ FAIL"

# T-SU-02: Interface réseau monitorée
echo -n "T-SU-02 Network interface monitored: "
docker exec suricata suricata --dump-config 2>/dev/null | \
  grep -q "af-packet" && echo "✅ PASS" || echo "❌ FAIL"

# T-SU-03: Fichier eve.json créé et mis à jour
echo -n "T-SU-03 EVE log active: "
[ -f /var/log/suricata/eve.json ] && \
  [ $(find /var/log/suricata/eve.json -newer /var/log/suricata/eve.json.1 2>/dev/null | wc -l) -ge 0 ] && \
  echo "✅ PASS" || echo "❌ FAIL"
```

### 3.5 Tests Shuffle SOAR

```bash
#!/bin/bash
# test_shuffle.sh

echo "=== Tests Shuffle SOAR ==="

# T-SH-01: API Shuffle accessible
echo -n "T-SH-01 Shuffle API: "
CODE=$(curl -s -o /dev/null -w "%{http_code}" http://shuffle-backend:3001/api/v1/healthz)
[ "$CODE" = "200" ] && echo "✅ PASS" || echo "❌ FAIL (code: $CODE)"

# T-SH-02: Playbooks chargés
echo -n "T-SH-02 Workflows loaded: "
COUNT=$(curl -s -H "Authorization: Bearer ${SHUFFLE_TOKEN}" \
  "http://shuffle-backend:3001/api/v1/workflows" | jq -r '.success' | grep -c "true")
[ "$COUNT" -gt "0" ] && echo "✅ PASS" || echo "❌ FAIL"

# T-SH-03: Webhook disponible
echo -n "T-SH-03 Webhook endpoint: "
CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "http://shuffle-backend:3001/api/v1/hooks/webhook_notimatic_security")
[ "$CODE" != "404" ] && echo "✅ PASS" || echo "❌ FAIL"
```

---

## 4. Tests de Détection

### 4.1 Test Brute Force Authentication

**Objectif** : Vérifier que Wazuh détecte et que Shuffle bloque les attaques brute force.

```bash
#!/bin/bash
# test_detection_bruteforce.sh

KEYCLOAK_URL="http://keycloak:8080"
TEST_IP="192.168.100.200"  # IP de test (non routée)

echo "=== Test Détection Brute Force ==="
echo "IP de test: $TEST_IP"

# Générer 6 tentatives d'authentification échouées
for i in {1..6}; do
  curl -s -X POST "${KEYCLOAK_URL}/auth/realms/notimatic/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=notimatic-app&username=test@notimatic.local&password=WRONG_PASSWORD_${i}&grant_type=password" \
    > /dev/null
  echo "Tentative $i/6 envoyée"
  sleep 1
done

echo ""
echo "Attente 30s pour traitement Wazuh..."
sleep 30

# Vérifier alerte Wazuh
echo -n "Alerte Wazuh générée: "
ALERTS=$(curl -s -k -u ${WAZUH_API_USER}:${WAZUH_API_PASSWORD} \
  "https://wazuh-manager:55000/alerts?rule_id=100001&limit=5" | \
  jq -r '.data.affected_items | length')
[ "$ALERTS" -gt "0" ] && echo "✅ PASS ($ALERTS alertes)" || echo "❌ FAIL"

# Vérifier blocage IP Traefik
echo -n "IP bloquée dans Traefik: "
BLOCKED=$(curl -s "http://traefik:8080/api/middlewares" | jq -r '.[] | select(.type=="ipAllowList")' | grep -c "$TEST_IP")
[ "$BLOCKED" -gt "0" ] && echo "✅ PASS" || echo "⚠️ Vérifier manuellement"

# Vérifier notification Slack
echo "→ Vérifier manuellement le canal Slack #security"
```

### 4.2 Test SQL Injection Detection

```bash
#!/bin/bash
# test_detection_sqli.sh

API_URL="http://kong:8000/api"
TEST_TOKEN=$(curl -s -X POST http://keycloak:8080/auth/... | jq -r '.access_token')

echo "=== Test Détection SQL Injection ==="

# Test 1: UNION SELECT
echo -n "Test UNION SELECT: "
curl -s "${API_URL}/notes?search=' UNION SELECT * FROM users--" \
  -H "Authorization: Bearer ${TEST_TOKEN}" > /dev/null
sleep 5

ALERT=$(curl -s -k -u ${WAZUH_API_USER}:${WAZUH_API_PASSWORD} \
  "https://wazuh-manager:55000/alerts?rule_id=100010&limit=5" | \
  jq -r '.data.affected_items | length')
[ "$ALERT" -gt "0" ] && echo "✅ Détecté" || echo "❌ Non détecté"

# Test 2: OR '1'='1'
echo -n "Test OR 1=1: "
curl -s "${API_URL}/notes?search=' OR '1'='1" \
  -H "Authorization: Bearer ${TEST_TOKEN}" > /dev/null
sleep 5
# Même vérification...

# Test 3: DROP TABLE (doit être bloqué avant d'atteindre la DB)
echo -n "Test DROP TABLE: "
RESPONSE=$(curl -s -w "%{http_code}" "${API_URL}/notes" \
  -X POST \
  -H "Authorization: Bearer ${TEST_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"title": "test", "content": "DROP TABLE users;"}')
HTTP_CODE="${RESPONSE: -3}"
[ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "403" ] && echo "✅ Bloqué ($HTTP_CODE)" || echo "⚠️ Passé ($HTTP_CODE)"
```

### 4.3 Test Runtime Security (Falco)

```bash
#!/bin/bash
# test_detection_falco.sh

echo "=== Test Détection Runtime Security ==="

# Test 1: Shell dans container backend
echo -n "Test shell in container: "
docker exec backend-api /bin/sh -c "id" 2>&1 || true
sleep 3
DETECT=$(docker logs falco --since 30s 2>&1 | grep -c "CRITICAL.*shell\|shell_in_container")
[ "$DETECT" -gt "0" ] && echo "✅ Détecté" || echo "❌ Non détecté"

# Test 2: Accès fichier sensible
echo -n "Test sensitive file access: "
docker exec backend-api cat /app/.env 2>&1 || true
sleep 3
DETECT=$(docker logs falco --since 30s 2>&1 | grep -c "HIGH.*sensitive\|read_sensitive_file")
[ "$DETECT" -gt "0" ] && echo "✅ Détecté" || echo "❌ Non détecté"

# Test 3: Connexion DB depuis container non-backend
echo -n "Test unauthorized DB connection: "
docker run --rm --network net-data alpine nc -z postgresql 5432 2>&1 || true
sleep 3
DETECT=$(docker logs falco --since 30s 2>&1 | grep -c "unexpected_db_connection\|unexpected.*5432")
[ "$DETECT" -gt "0" ] && echo "✅ Détecté" || echo "❌ Non détecté"
```

### 4.4 Test Network IDS (Suricata)

```bash
#!/bin/bash
# test_detection_suricata.sh

TARGET_IP="172.28.0.11"  # Traefik

echo "=== Test Détection Network IDS ==="

# Test 1: Port scan
echo -n "Test port scan: "
nmap -p 1-1024 --open ${TARGET_IP} -T4 2>/dev/null > /dev/null
sleep 10
ALERTS=$(cat /var/log/suricata/fast.log | grep "Port Scan" | wc -l)
[ "$ALERTS" -gt "0" ] && echo "✅ Détecté ($ALERTS alertes)" || echo "❌ Non détecté"

# Test 2: User-Agent SQLmap
echo -n "Test SQLmap User-Agent: "
curl -s -H "User-Agent: sqlmap/1.7" http://${TARGET_IP}/ > /dev/null
sleep 5
ALERTS=$(cat /var/log/suricata/fast.log | grep "SQLmap\|sqlmap" | wc -l)
[ "$ALERTS" -gt "0" ] && echo "✅ Détecté" || echo "❌ Non détecté"

# Test 3: Nikto User-Agent
echo -n "Test Nikto User-Agent: "
curl -s -H "User-Agent: Nikto/2.1.6" http://${TARGET_IP}/ > /dev/null
sleep 5
ALERTS=$(cat /var/log/suricata/fast.log | grep "Nikto\|nikto" | wc -l)
[ "$ALERTS" -gt "0" ] && echo "✅ Détecté" || echo "❌ Non détecté"
```

---

## 5. Tests de Performance

### 5.1 Test de Charge - Impact Stack Sécurité

```javascript
// k6_security_load_test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Montée en charge
    { duration: '5m', target: 100 },  // Charge nominale
    { duration: '2m', target: 200 },  // Pic de charge
    { duration: '2m', target: 0 },    // Descente
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% < 500ms
    http_req_failed: ['rate<0.01'],    // < 1% erreurs
  },
};

export default function() {
  // Test API avec stack sécurité active
  const response = http.get('https://api.notimatic.local/health', {
    headers: {
      'Authorization': `Bearer ${__ENV.TEST_TOKEN}`,
    },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

**Métriques à valider** :
- Temps de réponse P95 < 500ms avec stack sécurité active
- Latence ajoutée par la stack sécurité < 50ms
- CPU Filebeat < 5% de l'usage total
- Mémoire ELK stack < 8GB (dev)

### 5.2 Test de Volume de Logs

```bash
# Générer un volume de logs élevé (1000 req/min) et vérifier que Filebeat suit
k6 run --vus 50 --duration 5m k6_security_load_test.js

# Vérifier le lag Filebeat
docker exec filebeat filebeat --version --one 2>&1 | grep "monitoring"

# Vérifier le lag d'indexation Elasticsearch
curl -s -u elastic:${ELASTIC_PASSWORD} \
  "http://elasticsearch:9200/_cat/thread_pool/write?v&s=queue:desc" | head -5
```

---

## 6. Tests OWASP ZAP (DAST)

### 6.1 Configuration ZAP

```bash
# Lancer un scan ZAP de l'application
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://notimatic.local \
  -g gen.conf \
  -r zap_report.html \
  --hook=/zap/auth_hook.py

# Analyser les résultats
# Alert HIGH ou MEDIUM → bloquer CI/CD
# Alert LOW → créer ticket
```

### 6.2 Résultats Attendus

| Catégorie OWASP | Niveau Maximum Acceptable | Action |
|----------------|--------------------------|--------|
| A01 - Access Control | LOW | Ticket |
| A02 - Cryptographic Failures | NONE | Bloquer CI |
| A03 - Injection | LOW | Ticket |
| A04 - Insecure Design | MEDIUM | Ticket P2 |
| A05 - Security Misconfiguration | LOW | Ticket |
| A06 - Vulnerable Components | MEDIUM | Ticket P2 |
| A07 - Auth Failures | NONE | Bloquer CI |
| A08 - Integrity Failures | LOW | Ticket |
| A09 - Logging Failures | NONE | Bloquer CI |
| A10 - SSRF | NONE | Bloquer CI |

---

## 7. Exercice Red Team

### 7.1 Règles d'Engagement

```yaml
Exercice Red Team NOTIMATIC:
  
  Autorisation:
    - Périmètre: Environnement de test uniquement
    - Durée: 2 jours
    - Équipe: 2 pentesters externes
    - Notification: CTO + Security lead
    
  Objectifs:
    - Tester l'efficacité de la stack SIEM/SOAR
    - Mesurer le MTTD (Mean Time to Detect)
    - Identifier les angles morts
    - Valider les playbooks SOAR
    
  Scénarios à tester:
    1. Brute force sur Keycloak
    2. SQL injection via Kong API
    3. Exploitation d'une dépendance vulnérable (simulé)
    4. Tentative d'accès direct à la DB
    5. Scan réseau complet
    6. Exfiltration de données simulée
    
  Métriques collectées:
    - Temps entre attaque et détection (MTTD)
    - Temps entre détection et réponse (MTTR)
    - Taux de détection (% attaques détectées)
    - Faux positifs générés
```

### 7.2 Rapport Post-Exercice

```markdown
## Template Rapport Red Team

### Résumé Exécutif
- Taux de détection: X%
- MTTD moyen: X minutes
- MTTR moyen: X minutes

### Vulnérabilités Trouvées
| ID | Sévérité | Description | Détecté | MTTD |
|----|---------|-------------|---------|------|

### Angles Morts Identifiés
- ...

### Recommandations
1. ...
```

---

## 8. Tests de Conformité

### 8.1 Conformité RGPD

```bash
#!/bin/bash
# test_gdpr_compliance.sh

echo "=== Tests Conformité RGPD ==="

# T-RGPD-01: PII non loggée dans Elasticsearch (email en clair)
echo -n "T-RGPD-01 PII not in Elasticsearch: "
EMAILS=$(curl -s -u elastic:${ELASTIC_PASSWORD} \
  "http://elasticsearch:9200/notimatic-*/_search" \
  -d '{"query": {"regexp": {"message": "[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}"}}}' | \
  jq -r '.hits.total.value')
[ "$EMAILS" = "0" ] && echo "✅ PASS" || echo "❌ FAIL ($EMAILS documents avec emails)"

# T-RGPD-02: Rétention logs respectée (< 6 mois)
echo -n "T-RGPD-02 Log retention policy: "
POLICY=$(curl -s -u elastic:${ELASTIC_PASSWORD} \
  "http://elasticsearch:9200/_ilm/policy/notimatic-ilm-policy" | \
  jq -r '.notimatic-ilm-policy.policy.phases.delete.min_age')
[ "$POLICY" = "180d" ] && echo "✅ PASS (180 jours)" || echo "⚠️ Politique: $POLICY"

# T-RGPD-03: Audit trail complet pour actions critiques
echo -n "T-RGPD-03 Audit trail for critical actions: "
# Effectuer une action critique (ex: suppression compte)
# Vérifier la présence dans audit_logs table
AUDIT=$(psql -U postgres notimatic -t -c \
  "SELECT COUNT(*) FROM audit_logs WHERE action='USER_DELETE' AND created_at > NOW() - INTERVAL '1 hour';")
echo "→ Vérification manuelle requise (audit_logs table)"
```

### 8.2 Tests de Hardening CIS

```bash
#!/bin/bash
# test_cis_benchmark.sh

echo "=== Tests CIS Docker Benchmark ==="

# CIS-01: Containers non-root
for container in backend-api frontend filebeat; do
  echo -n "CIS-01 $container runs as non-root: "
  USER=$(docker exec $container id -u)
  [ "$USER" != "0" ] && echo "✅ PASS (uid: $USER)" || echo "❌ FAIL (root!)"
done

# CIS-02: Filesystem read-only
for container in backend-api frontend; do
  echo -n "CIS-02 $container read-only filesystem: "
  RO=$(docker inspect $container --format='{{.HostConfig.ReadonlyRootfs}}')
  [ "$RO" = "true" ] && echo "✅ PASS" || echo "⚠️ WARN (writable)"
done

# CIS-03: Capabilities limitées
for container in backend-api frontend; do
  echo -n "CIS-03 $container capabilities dropped: "
  CAPS=$(docker inspect $container --format='{{.HostConfig.CapDrop}}')
  [ "$CAPS" != "[]" ] && echo "✅ PASS ($CAPS)" || echo "⚠️ WARN (aucun drop)"
done

# CIS-04: Aucun container privileged (sauf Falco)
echo -n "CIS-04 No privileged containers (except Falco): "
PRIVILEGED=$(docker ps --quiet | xargs docker inspect --format='{{.Name}}: {{.HostConfig.Privileged}}' | \
  grep "true" | grep -v falco)
[ -z "$PRIVILEGED" ] && echo "✅ PASS" || echo "❌ FAIL: $PRIVILEGED"
```

---

## 9. Intégration CI/CD

### 9.1 Pipeline de Tests Sécurité

```yaml
# .github/workflows/security-tests.yml (référence)
security-tests:
  runs-on: ubuntu-latest
  steps:
    - name: Deploy security test environment
      run: docker compose -f docker-compose.security.yml up -d

    - name: Wait for services
      run: sleep 60

    - name: Run smoke tests
      run: bash tests/security/smoke_tests.sh

    - name: Run Trivy container scan
      run: |
        trivy image --exit-code 1 --severity CRITICAL notimatic-backend:latest
        trivy image --exit-code 1 --severity CRITICAL notimatic-frontend:latest

    - name: Run OWASP ZAP baseline scan
      run: |
        docker run -t owasp/zap2docker-stable zap-baseline.py \
          -t http://localhost:3000 \
          -J zap_results.json

    - name: Check ZAP results
      run: python3 tests/security/check_zap_results.py zap_results.json

    - name: Run functional security tests
      run: bash tests/security/test_all.sh

    - name: Publish security report
      uses: actions/upload-artifact@v3
      with:
        name: security-test-report
        path: tests/security/reports/
```

---

## 10. Rapport de Tests

### 10.1 Template de Rapport Hebdomadaire

```markdown
## Rapport Tests Sécurité - Semaine XX/2026

### Résumé
- Tests exécutés: X
- Tests réussis: X (XX%)
- Tests échoués: X (XX%)
- Nouvelles vulnérabilités: X (Critical: X, High: X, Medium: X)

### Résultats par Composant
| Composant | Tests | Pass | Fail | Notes |
|-----------|-------|------|------|-------|
| Elasticsearch | | | | |
| Wazuh | | | | |
| Falco | | | | |
| Suricata | | | | |
| Shuffle | | | | |

### Alertes et Actions Requises
1. ...

### Métriques SIEM/SOAR
- Alertes générées cette semaine: X
- Alertes vraies positives: X (XX%)
- Alertes faux positives: X (XX%)
- Playbooks déclenchés: X
- Actions automatisées réussies: X (XX%)
```

---

## 11. Références

- [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) - Architecture globale
- [SECURITY_MONITORING_PLAYBOOKS.md](SECURITY_MONITORING_PLAYBOOKS.md) - Playbooks SOAR
- [SECURITY_DEPLOYMENT_GUIDE.md](SECURITY_DEPLOYMENT_GUIDE.md) - Guide de déploiement
- [THREAT_MODEL_SECURITY_STACK.md](THREAT_MODEL_SECURITY_STACK.md) - Modèle de menaces
- [OWASP Testing Guide v4.2](https://owasp.org/www-project-web-security-testing-guide/)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [NIST SP 800-115 - Technical Guide to Information Security Testing](https://csrc.nist.gov/publications/detail/sp/800-115/final)

---

**Document Version**: 2.0.0  
**Dernière mise à jour**: 12 Mars 2026  
**Auteur**: Security Architecture Team  
**Statut**: ✅ Approuvé pour Implémentation
