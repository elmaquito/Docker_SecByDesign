# Topologie SIEM/SOAR - NOTIMATIC v2.0

## Date de Création
**12 Mars 2026**

## Version
**2.0.0 - Security Stack Integration**

---

## 1. Vue d'Ensemble de la Topologie

Ce document décrit la topologie réseau complète de la stack SIEM/SOAR intégrée à NOTIMATIC v2.0, incluant les schémas réseau, les flux de données et les configurations de connectivité entre composants.

---

## 2. Topologie Réseau Complète

### 2.1 Vue Macro

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                         │
└─────────────────────────────────┬────────────────────────────────────────────┘
                                  │ :443 / :80
                    ┌─────────────▼─────────────┐
                    │       Suricata 7.0         │
                    │   (IDS/IPS - Port Mirror)  │
                    │   net-public               │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │       Traefik Proxy        │
                    │   :443 SSL Termination     │
                    │   Rate Limiting            │
                    │   net-public + net-dmz     │
                    └──────┬──────────┬──────────┘
                           │          │
              ┌────────────▼──┐   ┌───▼──────────────────┐
              │  Frontend     │   │   Kong Gateway        │
              │  Vue 3        │   │   :8000 (HTTP)        │
              │  net-dmz      │   │   :8443 (HTTPS)       │
              └───────────────┘   │   :8001 (Admin)       │
                                  │   net-dmz             │
                                  └───┬──────────────┬────┘
                                      │              │
                          ┌───────────▼──┐   ┌───────▼────────┐
                          │  Keycloak    │   │  Backend API   │
                          │  :8080       │   │  Node.js 20.x  │
                          │  OAuth2/OIDC │   │  :3000         │
                          │  net-dmz     │   │  net-backend   │
                          │  net-auth    │   └───────┬────────┘
                          └──────────────┘           │
                                                      │
                                           ┌──────────▼────────┐
                                           │   PostgreSQL 15   │
                                           │   :5432           │
                                           │   net-data        │
                                           └───────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                        SECURITY MONITORING STACK                              │
│                           net-security                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐            │
│  │  Filebeat   │───▶│  Elasticsearch  │───▶│     Kibana      │            │
│  │  :5066      │    │  :9200 / :9300  │    │  :5601          │            │
│  │  net-dmz    │    │  net-security   │    │  net-security   │            │
│  │  net-backend│    └────────┬────────┘    └─────────────────┘            │
│  └─────────────┘             │                                              │
│                              │                                              │
│                    ┌─────────▼──────────┐    ┌─────────────────┐          │
│                    │   Wazuh Manager    │    │  Wazuh Indexer  │          │
│                    │   :55000 (API)     │◀──▶│  :9200 / :9300  │          │
│                    │   :1514 (syslog)   │    │  net-security   │          │
│                    │   :1515 (agents)   │    └─────────────────┘          │
│                    │   net-security     │                                  │
│                    └─────────┬──────────┘                                  │
│                              │ webhook                                      │
│                    ┌─────────▼──────────┐    ┌─────────────────┐          │
│                    │   Shuffle SOAR     │    │     Falco       │          │
│                    │   :3001 (Backend)  │    │  :2801 (HTTP)   │          │
│                    │   :3002 (Frontend) │    │  net-security   │          │
│                    │   net-security     │    └─────────────────┘          │
│                    └────────────────────┘                                  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Réseaux Docker

### 3.1 Configuration des Réseaux

```yaml
networks:
  net-public:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/24
    driver_opts:
      com.docker.network.bridge.name: br-public

  net-dmz:
    driver: bridge
    ipam:
      config:
        - subnet: 172.29.0.0/24
    driver_opts:
      com.docker.network.bridge.name: br-dmz
    internal: false

  net-backend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.30.0.0/24
    driver_opts:
      com.docker.network.bridge.name: br-backend
    internal: true

  net-data:
    driver: bridge
    ipam:
      config:
        - subnet: 172.31.0.0/24
    driver_opts:
      com.docker.network.bridge.name: br-data
    internal: true

  net-security:
    driver: bridge
    ipam:
      config:
        - subnet: 172.32.0.0/24
    driver_opts:
      com.docker.network.bridge.name: br-security
    internal: true

  net-kong-internal:
    driver: bridge
    ipam:
      config:
        - subnet: 172.33.0.0/24
    driver_opts:
      com.docker.network.bridge.name: br-kong
    internal: true

  net-auth:
    driver: bridge
    ipam:
      config:
        - subnet: 172.34.0.0/24
    driver_opts:
      com.docker.network.bridge.name: br-auth
    internal: true
```

### 3.2 Attribution des Adresses IP

| Service | Réseau Principal | IP Statique | Ports Exposés |
|---------|-----------------|-------------|---------------|
| Suricata | net-public | 172.28.0.10 | Aucun (passif) |
| Traefik | net-public | 172.28.0.11 | 80, 443 |
| Frontend | net-dmz | 172.29.0.10 | Aucun (via Traefik) |
| Kong | net-dmz | 172.29.0.11 | 8000, 8443 (via Traefik) |
| Keycloak | net-dmz + net-auth | 172.29.0.12 | 8080 (via Traefik) |
| Filebeat | net-dmz + net-backend | 172.29.0.20 | 5066 (monitoring) |
| Backend API | net-backend | 172.30.0.10 | Aucun (interne) |
| PostgreSQL | net-data | 172.31.0.10 | Aucun (interne) |
| Elasticsearch | net-security | 172.32.0.10 | 9200 (interne) |
| Wazuh Manager | net-security | 172.32.0.11 | 55000, 1514, 1515 (internes) |
| Wazuh Indexer | net-security | 172.32.0.12 | 9200 (interne) |
| Kibana | net-security | 172.32.0.13 | 5601 (via Traefik) |
| Shuffle Backend | net-security | 172.32.0.14 | 3001 (interne) |
| Shuffle Frontend | net-security | 172.32.0.15 | 3002 (via Traefik) |
| Falco | net-security | 172.32.0.16 | 2801 (interne) |
| Kong DB | net-kong-internal | 172.33.0.10 | Aucun (interne) |
| Keycloak DB | net-auth | 172.34.0.10 | Aucun (interne) |

---

## 4. Flux de Données Détaillés

### 4.1 Flux de Logs Applicatifs

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FLUX DE LOGS APPLICATIFS                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Traefik Logs]           [Kong Logs]          [Keycloak Logs]     │
│  access.log               access.log           events.log          │
│       │                        │                     │             │
│       └────────────────────────┼─────────────────────┘             │
│                                │                                    │
│                         ┌──────▼──────┐                            │
│                         │  Filebeat   │                            │
│                         │             │                            │
│  [Backend Stdout]        │  - Docker   │  [PostgreSQL Audit]       │
│  [Backend Stderr]  ─────▶│  - Log files│◀─  audit_logs table       │
│                          │  - TCP      │                            │
│                          └──────┬──────┘                            │
│                                 │                                   │
│                          ┌──────▼──────────────┐                   │
│                          │   Elasticsearch     │                   │
│                          │                     │                   │
│                          │  Index: notimatic-* │                   │
│                          │  Shards: 1 (dev)    │                   │
│                          │  Replicas: 1 (prod) │                   │
│                          └──────┬──────────────┘                   │
│                                 │                                   │
│                    ┌────────────┼────────────┐                     │
│                    │            │            │                     │
│             ┌──────▼──┐  ┌──────▼──┐  ┌─────▼──────┐            │
│             │  Kibana  │  │  Wazuh  │  │  Alerting  │            │
│             │Dashboard │  │ Manager │  │  (Email/   │            │
│             │          │  │  SIEM   │  │   Slack)   │            │
│             └──────────┘  └─────────┘  └────────────┘            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Flux de Sécurité SOAR

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FLUX SOAR AUTOMATISÉ                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Wazuh Alert Level ≥ 7]                                           │
│            │                                                        │
│            │ Webhook POST                                           │
│            ▼                                                        │
│    ┌───────────────┐                                               │
│    │  Shuffle SOAR │                                               │
│    │  Trigger      │                                               │
│    └───────┬───────┘                                               │
│            │                                                        │
│     ┌──────┼──────┐                                                │
│     │      │      │                                                │
│     ▼      ▼      ▼                                                │
│  ┌──────┐ ┌────┐ ┌──────────────────┐                             │
│  │Threat│ │Log │ │  Response Action │                             │
│  │Intel │ │    │ │                  │                             │
│  │Check │ │    │ │  1. Block IP     │                             │
│  │      │ │    │ │     (Traefik API)│                             │
│  │AbuseI│ │    │ │                  │                             │
│  │PDB   │ │    │ │  2. Notify Team  │                             │
│  └──┬───┘ └────┘ │     (Slack/Email)│                             │
│     │             │                  │                             │
│     │   [Malicious] │  3. Create      │                             │
│     └──────────────▶│     Incident   │                             │
│                    │     (Wazuh)     │                             │
│                    └──────────────────┘                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Flux Runtime Security (Falco)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUX RUNTIME SECURITY                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Linux Kernel Syscalls]                                           │
│           │                                                         │
│           ▼                                                         │
│    ┌──────────────┐                                                │
│    │  Falco eBPF  │  ← Écoute syscalls via eBPF probe             │
│    │  Driver      │                                                │
│    └──────┬───────┘                                                │
│           │                                                         │
│    ┌──────▼───────┐                                                │
│    │  Falco Rules │  ← Évalue les règles de sécurité               │
│    │  Engine      │                                                │
│    └──────┬───────┘                                                │
│           │                                                         │
│    ┌──────▼───────────────────────────────────────┐               │
│    │  Output Channels                              │               │
│    │                                               │               │
│    │  - stdout (JSON)                              │               │
│    │  - HTTP webhook → Wazuh Manager :1514        │               │
│    │  - HTTP webhook → Shuffle SOAR               │               │
│    └───────────────────────────────────────────────┘               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.4 Flux Network IDS (Suricata)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUX NETWORK IDS/IPS                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Interface réseau br-public]                                      │
│           │                                                         │
│           │ (port mirroring / AF_PACKET)                           │
│           ▼                                                         │
│    ┌──────────────┐                                                │
│    │  Suricata    │  ← Analyse paquets réseau                      │
│    │  Engine      │                                                │
│    └──────┬───────┘                                                │
│           │                                                         │
│    ┌──────┴────────────────────────────────┐                      │
│    │  Output Files                         │                      │
│    │                                       │                      │
│    │  - /var/log/suricata/fast.log         │                      │
│    │  - /var/log/suricata/eve.json         │                      │
│    └──────┬────────────────────────────────┘                      │
│           │                                                         │
│    ┌──────▼────────────────────────────────┐                      │
│    │  Filebeat (Suricata module)           │                      │
│    │  → Elasticsearch (index suricata-*)  │                      │
│    │  → Wazuh Manager (via syslog)        │                      │
│    └───────────────────────────────────────┘                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Configuration des Ports

### 5.1 Ports Exposés Publiquement

| Port | Protocole | Service | Description |
|------|-----------|---------|-------------|
| 80 | TCP | Traefik | Redirection HTTPS |
| 443 | TCP | Traefik | HTTPS (SSL termination) |

### 5.2 Ports Internes (Non Exposés)

| Port | Protocole | Service | Réseau |
|------|-----------|---------|--------|
| 3000 | TCP | Backend API | net-backend |
| 5432 | TCP | PostgreSQL | net-data |
| 8000 | TCP | Kong HTTP | net-dmz |
| 8080 | TCP | Keycloak | net-dmz |
| 9200 | TCP | Elasticsearch | net-security |
| 9300 | TCP | Elasticsearch (cluster) | net-security |
| 1514 | TCP/UDP | Wazuh syslog | net-security |
| 1515 | TCP | Wazuh agents | net-security |
| 55000 | TCP | Wazuh REST API | net-security |
| 5601 | TCP | Kibana | net-security (Traefik) |
| 3001 | TCP | Shuffle Backend | net-security |
| 3002 | TCP | Shuffle Frontend | net-security (Traefik) |
| 2801 | TCP | Falco HTTP | net-security |

### 5.3 Ports Admin (Accès Restreint)

| Port | Service | Accès | Auth |
|------|---------|-------|------|
| 5601 | Kibana | VPN uniquement | Keycloak OIDC |
| 3002 | Shuffle | VPN uniquement | Shuffle auth |
| 55000 | Wazuh API | Interne uniquement | API Key |
| 8001 | Kong Admin | Interne uniquement | IP restriction |

---

## 6. Règles de Filtrage

### 6.1 Politique par Défaut

```
Politique réseau:
  - net-public: INGRESS autorisé (internet → Traefik)
  - net-dmz: INGRESS depuis net-public uniquement
  - net-backend: INGRESS depuis net-dmz uniquement
  - net-data: INGRESS depuis net-backend uniquement
  - net-security: INGRESS depuis net-dmz + net-backend
  - net-kong-internal: INGRESS depuis net-dmz (Kong)
  - net-auth: INGRESS depuis net-dmz (Keycloak)
  
  Règle implicite: TOUT trafic non défini = BLOQUÉ
```

### 6.2 Matrice de Communication Autorisée

| Source | Destination | Port | Justification |
|--------|-------------|------|---------------|
| Internet | Traefik | 443 | Point d'entrée unique |
| Traefik | Frontend | 80 | Servir SPA |
| Traefik | Kong | 8000 | Proxy API |
| Traefik | Keycloak | 8080 | Auth OIDC |
| Kong | Backend | 3000 | API calls |
| Backend | PostgreSQL | 5432 | Data access |
| Backend | Keycloak | 8080 | Token validation |
| Filebeat | Elasticsearch | 9200 | Log shipping |
| Wazuh | Elasticsearch | 9200 | Alert storage |
| Wazuh | Shuffle | 3001 | Trigger SOAR |
| Falco | Wazuh | 1514 | Send alerts |
| Falco | Shuffle | 3001 | Direct SOAR |
| Suricata | Wazuh | 1514 | Network events |

---

## 7. Haute Disponibilité (Production)

### 7.1 Configuration Cluster Elasticsearch

```yaml
Elasticsearch Cluster (Production):
  Nœuds:
    - elasticsearch-node-1 (Master + Data)
    - elasticsearch-node-2 (Data)
    - elasticsearch-node-3 (Data)
  
  Configuration:
    cluster.name: notimatic-security
    discovery.seed_hosts: [node-1, node-2, node-3]
    cluster.initial_master_nodes: [node-1]
    
  Shards: 3 (1 par nœud)
  Réplicas: 2 (tolérance panne 2/3 nœuds)
```

### 7.2 Configuration Wazuh Cluster

```yaml
Wazuh Cluster (Production):
  Master:
    - wazuh-master (172.32.0.11)
  Workers:
    - wazuh-worker-1 (172.32.0.17)
    - wazuh-worker-2 (172.32.0.18)
  
  Configuration:
    name: notimatic-wazuh-cluster
    node_name: master/worker-1/worker-2
    key: [cluster-key-32-chars]
    bind_addr: 0.0.0.0
    port: 1516
    hidden: no
    disabled: no
```

---

## 8. Références

- [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) - Architecture globale
- [SECURITY_DEPLOYMENT_GUIDE.md](SECURITY_DEPLOYMENT_GUIDE.md) - Guide de déploiement
- [ARCHITECTURE.md](ARCHITECTURE.md) - Architecture NOTIMATIC v1.2
- [Wazuh Network Requirements](https://documentation.wazuh.com/current/getting-started/requirements.html)
- [Elasticsearch Networking](https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-network.html)

---

**Document Version**: 2.0.0  
**Dernière mise à jour**: 12 Mars 2026  
**Auteur**: Security Architecture Team  
**Statut**: ✅ Approuvé pour Implémentation
