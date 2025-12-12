 # Rapport d'Avancement N°1 - Projet Notimatic (Secure by Design)
**Date :** 08 Décembre 2025
**Statut Global :** Prototype Fonctionnel (Environnement de Développement)

## 1. État des Lieux

L'application "Notimatic" est actuellement déployée et fonctionnelle dans un environnement de développement local conteneurisé. Les principaux composants (Frontend, Backend, Base de données) communiquent correctement.

### ✅ Ce qui est réalisé et fonctionnel :
*   **Architecture "Secure by Design" :**
    *   **Authentification Forte :** Implémentation de `Argon2id` pour le hachage des mots de passe (résistant aux attaques GPU/ASIC).
    *   **Gestion de Session :** Utilisation de JWT (JSON Web Tokens) stockés dans des cookies `HttpOnly` (inaccessibles via JavaScript, protégeant contre les failles XSS).
    *   **Validation des Données :** Utilisation de la librairie `Zod` pour valider strictement toutes les entrées utilisateur (Backend).
    *   **Protection HTTP :** Headers de sécurité configurés via `Helmet`.
*   **Fonctionnalités Applicatives :**
    *   Création de compte utilisateur.
    *   Connexion / Déconnexion.
    *   Tableau de bord (Dashboard).
    *   Création et listage de notes personnelles sécurisées.
*   **Infrastructure (Docker) :**
    *   Conteneurisation optimisée (Multi-stage builds).
    *   Orchestration via `docker-compose`.
    *   Persistance des données (Volume PostgreSQL).

### 🔧 Problèmes Techniques Résolus :
1.  **Compatibilité Windows & Réseau :**
    *   *Problème :* Le reverse-proxy Traefik ne parvenait pas à monter le socket Docker sous Windows, bloquant l'accès.
    *   *Solution :* Configuration d'un mode "Dev" exposant directement les ports (Frontend: 5173, Backend: 3000) pour contourner la limitation sans sacrifier l'architecture.
2.  **Compilation de Modules Natifs (`argon2`) :**
    *   *Problème :* Crash du backend car la librairie de cryptographie nécessitait une compilation C++ non supportée par l'image Alpine de base.
    *   *Solution :* Ajout des outils de build (`python3`, `make`, `g++`) dans le Dockerfile et forçage de la compilation à l'installation.
3.  **Communication Cross-Origin (CORS) :**
    *   *Problème :* Le navigateur bloquait les requêtes entre le Frontend (port 5173) et le Backend (port 3000).
    *   *Solution :* Configuration explicite des règles CORS et des credentials (cookies) entre les deux origines.

---

## 2. Reste à Faire (Roadmap)

Pour atteindre l'objectif final d'une application prête pour la production, les étapes suivantes sont nécessaires :

### 🧹 Nettoyage (Immédiat)
- [x] Retirer les affichages de debug (messages rouges) dans le Frontend (`App.vue`).
- [x] Retirer les logs verbeux dans le Backend (`main.ts`).

### 🚀 Passage en Production
- [ ] **Validation de la configuration Prod :** Tester le fichier `docker-compose.prod.yml`.
- [ ] **Reverse Proxy (Traefik) :** Réactiver Traefik pour la production (sur un environnement Linux/Cloud) pour gérer le SSL/TLS.
- [ ] **Hardening :**
    - Activer le flag `Secure` sur les cookies (requiert HTTPS).
    - Affiner la Content Security Policy (CSP).
    - Mettre en place le Rate Limiting (limitation du nombre de requêtes pour contrer le Bruteforce).

### 🧪 Tests & Audit
- [ ] Vérifier l'absence de vulnérabilités dans les dépendances (via `npm audit` ou Trivy).
- [ ] Test final de pénétration basique (tentative d'injection SQL, XSS).

## 3. Conclusion
Le socle technique est solide et respecte les principes de sécurité définis. L'application est utilisable pour démonstration. La transition vers une configuration de "Production" est la prochaine étape majeure.
