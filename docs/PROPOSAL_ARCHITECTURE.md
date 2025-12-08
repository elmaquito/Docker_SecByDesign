# Proposition Technique : Architecture DevSecOps "Notimatic"

## 1. Résumé Exécutif

### Objectifs
**Notimatic** est une application de prise de notes critique nécessitant un niveau de confidentialité et d'intégrité élevé.
- **Fonctionnel :** Prise de notes temps réel, synchronisation, partage sécurisé.
- **Non-fonctionnel :**
  - **Confidentialité :** Chiffrement de bout en bout (E2EE) visé, chiffrement au repos/transit obligatoire.
  - **Disponibilité :** SLA 99.9%, tolérance aux pannes d'un nœud.
  - **Conformité :** RGPD (Droit à l'oubli, Privacy by design).

### Contexte d'Hébergement & Orchestration
- **Développement :** Docker Compose (iso-prod fonctionnel).
- **Production :** Recommandation **Kubernetes (K8s)** vs Docker Swarm.
  - *Docker Swarm :* Plus simple, natif Docker, mais moins riche en fonctionnalités de sécurité avancées (NetworkPolicies fines, Admission Controllers, écosystème SecOps).
  - *Kubernetes :* Standard industriel, permet l'isolation via Namespaces, RBAC fin, OPA Gatekeeper, et NetworkPolicies.
  - **Décision :** Pour cette proposition "Docker-based", nous utiliserons une approche compatible **Docker Swarm** pour la simplicité opérationnelle immédiate, mais avec des conteneurs prêts pour K8s (stateless, config externalisée).

---

## 2. Architecture Technique Détaillée

### Diagramme Textuel des Flux
```mermaid
graph TD
    Client[Client (Browser/Mobile)] -->|HTTPS/TLS 1.3| WAF[WAF / Edge Firewall]
    WAF -->|Filtré| Proxy[Reverse Proxy / Public Gateway (Traefik)]
    Proxy -->|Routing| Front[Frontend (Static/SSR)]
    Proxy -->|API Req| APIGW[API Gateway / Load Balancer]
    APIGW -->|AuthZ/RateLimit| Auth[Auth Service (OIDC)]
    APIGW -->|Clean Req| Backend[Backend Microservices]
    Backend -->|mTLS/TCP| DB[(Database PostgreSQL)]
    Backend -->|API| Vault[HashiCorp Vault (Secrets)]
```

### Composants
1.  **Proxy Public (Edge) :** Traefik. Gère la terminaison TLS, le routing, et les headers de sécurité globaux.
2.  **WAF :** Plugin ModSecurity ou Coraza intégré à Traefik/Nginx pour bloquer les attaques OWASP Top 10.
3.  **API Gateway :** Gère l'authentification (validation JWT), le rate-limiting par IP/User, et la validation de schéma OpenAPI.
4.  **Backend :** Microservices stateless (Node.js/Go). Exécutés en `non-root`, système de fichiers en lecture seule.
5.  **Database :** PostgreSQL cluster. Disques chiffrés (LUKS ou Cloud KMS). Pas d'accès public.
6.  **Secrets Management :** HashiCorp Vault. Injecte les secrets en RAM au démarrage ou via Agent.
7.  **Observabilité :** Stack LGTM (Loki, Grafana, Tempo, Mimir) ou ELK.

### Topologie Réseau Docker
Utilisation de réseaux `overlay` chiffrés (`opt: encrypted`) pour la production.
- `net-public` : Expose uniquement le Proxy/WAF (Ports 80/443).
- `net-front` : Communication Proxy <-> Frontend.
- `net-api` : Communication Proxy <-> API Gateway <-> Backend.
- `net-data` : Communication Backend <-> Database (Isolé, pas d'accès internet).

---

## 3. Mesures de Sécurité par Couche (Security by Design)

### A. Client / Frontend
- **HTTPS/TLS 1.3 :** Obligatoire. Ciphers suites restreintes.
- **HSTS :** `max-age=31536000; includeSubDomains; preload`. Empêche le downgrade HTTP.
- **CSP (Content Security Policy) :** `default-src 'self'; script-src 'self' 'nonce-...'`. Bloque XSS et injections de scripts tiers.
- **Cookies :** Attributs `Secure`, `HttpOnly` (inaccessible JS), `SameSite=Strict` (anti-CSRF).

### B. Périmètre / Proxy
- **Composant :** Traefik.
- **ACME :** Renouvellement auto Let's Encrypt (challenge DNS-01 préféré pour ne pas exposer le port 80 si possible, sinon HTTP-01).
- **Rate Limiting :** Middleware pour limiter les requêtes (ex: 100 req/s par IP) pour mitiger DDoS L7.
- **Headers :** Suppression des headers de version (`Server: nginx/1.2` -> `Server: Notimatic`).

### C. API Gateway & Auth
- **Auth :** OAuth2/OIDC. Access Token (JWT) courte durée (15min), Refresh Token (7j) stocké en cookie HttpOnly.
- **Validation :** Rejet systématique des entrées non conformes au schéma JSON (Zod/Joi).
- **Throttling :** Quotas par utilisateur authentifié pour éviter le "Noisy Neighbor".

### D. Backend (Microservices)
- **Moindre Privilège :**
  - Conteneurs tournent avec `USER 10001` (pas root).
  - `read_only: true` pour le root filesystem du conteneur.
  - `capabilities: drop: [ALL]` (sauf strict nécessaire comme NET_BIND_SERVICE).
- **Secrets :** Jamais de `.env` en clair dans l'image. Injection via Docker Secrets ou Vault Agent.
- **Crypto Passwords :** Argon2id.
  - Params : `time_cost=4`, `memory_cost=64MB`, `parallelism=2`.
- **Supply Chain :** Images signées avec **Cosign**. Base image `distroless` ou `alpine` minimaliste pour réduire la surface d'attaque.

### E. Database
- **Cloisonnement :** Uniquement sur le réseau `net-data`.
- **Chiffrement :**
  - *At Rest :* Volume Docker chiffré ou TDE (Transparent Data Encryption).
  - *In Transit :* SSL mode `verify-full` requis par le backend.
- **Utilisateurs :** Un rôle par microservice (ex: `app_user` ne peut faire que `SELECT, INSERT, UPDATE` sur ses tables, pas de `DROP` ni `ALTER`).

### F. CI/CD & Supply Chain
- **Pipeline :**
  1. **Lint/SAST :** SonarCloud + Semgrep (code source).
  2. **Build :** Buildkit sécurisé.
  3. **Scan Image :** Trivy (vulnérabilités OS + dépendances). Critère : 0 Critical, 0 High.
  4. **Sign :** Cosign avec clé privée stockée dans Vault/GitHub Secrets.
  5. **Deploy :** GitOps (ArgoCD ou script CD) vérifiant la signature avant déploiement.

---

## 6. Plan de Mise en Œuvre (Roadmap)

### Phase 1 : MVP Sécurisé (Sprints 1-2)
- Mise en place Docker Compose Prod avec réseaux séparés.
- Config Traefik avec TLS et Headers de sécurité.
- Backend avec validation des entrées et Argon2id.
- CI basique (Build + Test).

### Phase 2 : Hardening & Observabilité (Sprints 3-4)
- Intégration Vault pour les secrets DB.
- Mise en place du scan Trivy bloquant dans la CI.
- Centralisation des logs (Loki).
- Mise en place des backups chiffrés vers S3.

### Phase 3 : Audit & Conformité (Sprint 5)
- Pentest (Grey box).
- Exercice de restauration de backup.
- Documentation RGPD et procédure de réponse à incident.
