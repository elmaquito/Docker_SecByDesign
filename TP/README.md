# 📚 Travaux Pratiques - Sécurité Docker par Design

Bienvenue dans les Travaux Pratiques de sécurité Docker ! Ces TPs vous guideront étape par étape dans l'application des meilleures pratiques de sécurité pour les conteneurs Docker.

## 🎯 Objectifs Pédagogiques

À la fin de ces TPs, vous serez capable de :
- Configurer des conteneurs avec le principe du moindre privilège
- Créer des images Docker optimisées et sécurisées
- Implémenter l'isolation réseau entre services
- Gérer les secrets de manière sécurisée
- Protéger vos conteneurs contre les attaques DoS
- Analyser les vulnérabilités de vos images
- Utiliser des images distroless

## 📋 Prérequis

- Docker Engine 20.10+ installé
- Docker Compose v2.0+ installé
- Connaissances de base en ligne de commande Linux
- Un éditeur de texte (VSCode recommandé)

## 🗂️ Liste des TPs

| TP | Titre | Durée | Difficulté |
|----|-------|-------|------------|
| [TP1](./TP1-non-root-user.md) | Utilisateur Non-Root | 30 min | ⭐ Débutant |
| [TP2](./TP2-multi-stage-build.md) | Multi-Stage Build | 45 min | ⭐⭐ Intermédiaire |
| [TP3](./TP3-network-isolation.md) | Isolation Réseau | 45 min | ⭐⭐ Intermédiaire |
| [TP4](./TP4-secrets-management.md) | Gestion des Secrets | 30 min | ⭐ Débutant |
| [TP5](./TP5-resource-limits.md) | Limites de Ressources | 30 min | ⭐ Débutant |
| [TP6](./TP6-image-scanning.md) | Analyse d'Images | 45 min | ⭐⭐ Intermédiaire |
| [TP7](./TP7-readonly-filesystem.md) | Filesystem Read-Only | 30 min | ⭐ Débutant |
| [TP8](./TP8-distroless.md) | Images Distroless | 45 min | ⭐⭐⭐ Avancé |

## 🚀 Comment Utiliser ces TPs

1. **Suivez l'ordre** : Les TPs sont conçus pour être suivis dans l'ordre, chaque TP renforçant les concepts précédents.

2. **Pratiquez** : Tapez les commandes vous-même plutôt que de copier-coller pour mieux retenir.

3. **Expérimentez** : N'hésitez pas à modifier les exemples pour voir ce qui se passe.

4. **Vérifiez** : Chaque TP inclut des points de vérification pour valider votre progression.

## 📁 Structure du Dossier

```
TP/
├── README.md                    # Ce fichier
├── TP1-non-root-user.md        # TP1: Utilisateur non-root
├── TP2-multi-stage-build.md    # TP2: Multi-stage builds
├── TP3-network-isolation.md    # TP3: Isolation réseau
├── TP4-secrets-management.md   # TP4: Gestion des secrets
├── TP5-resource-limits.md      # TP5: Limites de ressources
├── TP6-image-scanning.md       # TP6: Analyse d'images
├── TP7-readonly-filesystem.md  # TP7: Filesystem read-only
└── TP8-distroless.md           # TP8: Images distroless
```

## 💡 Conseils

- **En cas de problème** : Vérifiez que Docker fonctionne avec `docker version`
- **Nettoyage** : Utilisez `docker system prune` pour nettoyer les ressources inutilisées
- **Documentation** : Consultez la [documentation Docker officielle](https://docs.docker.com/)

Bonne pratique ! 🐳
