# Guide Utilisateur - Nouvelles Fonctionnalités NOTIMATIC

## 🔑 Réinitialisation du Mot de Passe

### Pour tous les utilisateurs

1. **Demander une réinitialisation:**
   - Sur la page de connexion, cliquez sur "Mot de passe oublié ?"
   - Entrez votre nom d'utilisateur
   - Cliquez sur "Envoyer le lien"
   - Un lien de réinitialisation sera affiché (en mode développement)

2. **Réinitialiser votre mot de passe:**
   - Cliquez sur le lien de réinitialisation
   - Entrez votre nouveau mot de passe (minimum 12 caractères)
   - Confirmez le mot de passe
   - Cliquez sur "Réinitialiser le mot de passe"
   - Vous serez redirigé vers la page de connexion

### Notes importantes:
- Le lien de réinitialisation expire après 1 heure
- Chaque lien ne peut être utilisé qu'une seule fois
- Le mot de passe doit contenir au moins 12 caractères

---

## ⚙️ Paramètres du Compte

### Modifier vos informations (sauf pour les étudiants)

1. **Accéder aux paramètres:**
   - Cliquez sur le bouton "⚙️ Mon Compte" dans le dashboard
   - Vos informations actuelles s'affichent

2. **Modifier vos informations:**
   - **Email:** Entrez votre nouvelle adresse email
   - **Téléphone:** Entrez votre numéro de téléphone
   - **Mot de passe:** Pour changer votre mot de passe, entrez le nouveau (min. 12 caractères) et confirmez-le

3. **Enregistrer:**
   - Cliquez sur "Enregistrer les modifications"
   - Un message de confirmation s'affiche

### Restrictions:
- ⚠️ **Les étudiants ne peuvent PAS modifier leurs informations de compte**
- Le nom d'utilisateur ne peut pas être modifié
- Les administrateurs, techniciens et enseignants peuvent modifier leurs informations

---

## 📝 Enregistrement de Notes - Améliorations

### Création de notes

1. **Créer une nouvelle note:**
   - Cliquez sur "➕ Créer une Note"
   - Remplissez le titre et le contenu
   - Cliquez sur "Enregistrer"

### Nouvelles fonctionnalités:
- ✅ **Indicateur de chargement:** Le bouton affiche "Enregistrement..." pendant la sauvegarde
- ✅ **Bouton désactivé:** Impossible de cliquer plusieurs fois pendant l'enregistrement
- ✅ **Messages d'erreur:** Si une erreur survient, un message explicite s'affiche
- ✅ **Feedback visuel:** Le bouton change d'apparence pendant le chargement

### Édition de notes

1. **Modifier une note existante:**
   - Cliquez sur l'icône ✏️ à côté de la note
   - Modifiez le titre et/ou le contenu
   - Cliquez sur 💾 pour enregistrer
   - Ou sur ❌ pour annuler

### Nouvelles protections:
- 🔒 **Anti-double envoi:** Impossible d'enregistrer deux fois en même temps
- ⏳ **Indicateur de progression:** L'icône change en ⏳ pendant l'enregistrement
- ❌ **Gestion d'erreurs:** Messages clairs en cas de problème

---

## 🏷️ Système de Thèmes et Catégories

Les notes sont désormais classées pour faciliter l'accès à l'information pertinente :

### Thèmes (Couleurs)
Les thèmes sont représentés par des badges colorés (ex: 🔴 Urgent, 🔵 Info, 🟢 Projet).
- Permet d'identifier visuellement l'importance ou le type de contenu.
- Les administrateurs peuvent créer de nouveaux thèmes via l'API (interface graphique en cours de développement).

### Catégories (Dossiers)
Les catégories permettent de structurer le contenu de manière hiérarchique.
- Exemples : Cours > Cyber > Réseau.
- Vous pouvez filtrer votre fil d'actualité par catégorie spécifique.

### Filtrage du Feed
1. Cliquez sur le bouton "Filtres" en haut du tableau de bord.
2. Cochez les Thèmes et Catégories qui vous intéressent.
3. Validez pour voir uniquement les notes correspondantes.

---

## 🎨 Personnalisation (Nouveau v1.0.0)

### Mode Sombre
L'interface s'adapte à vos préférences visuelles.
- Cliquez sur l'icône 🌙 / ☀️ dans l'en-tête pour basculer entre les modes.
- Cette préférence est sauvegardée sur votre appareil.

### Feed d'Actualités Responsive
L'affichage s'adapte automatiquement aux écrans mobiles et tablettes pour une lecture confortable en déplacement.

---

## 👍👎 Réactions sur les Notes

### Réagir à une note

1. **Dans le feed ou sur une note:**
   - Deux boutons sont disponibles: 👍 (pouce haut) et 👎 (pouce bas)
   - Les compteurs affichent le nombre de réactions de chaque type

2. **Interagir avec les réactions:**
   - **Premier clic:** Ajoute votre réaction
   - **Cliquer à nouveau sur la même réaction:** Supprime votre réaction
   - **Cliquer sur l'autre réaction:** Change votre réaction

### Règles:
- ✅ Tous les utilisateurs authentifiés peuvent réagir
- 📊 Vous ne pouvez avoir qu'**une seule réaction** par note
- 🔄 Vous pouvez changer d'avis à tout moment
- 📈 Les compteurs se mettent à jour en temps réel

### Accessibilité:
- Boutons accessibles au clavier
- Labels ARIA pour les lecteurs d'écran
- Feedback visuel clair (bouton actif en bleu)

---

## 🎯 Cas d'Usage par Rôle

### Pour les Étudiants:
- ✅ Réinitialiser son mot de passe
- ✅ Réagir aux notes (👍👎)
- ✅ Créer et éditer ses propres notes avec feedback amélioré
- ❌ Modifier les informations de compte (restriction)

### Pour les Enseignants:
- ✅ Réinitialiser son mot de passe
- ✅ Modifier ses informations de compte (email, téléphone, mot de passe)
- ✅ Réagir aux notes (👍👎)
- ✅ Créer et éditer des notes avec feedback amélioré
- 🔜 Gérer les tags (créer, modifier, assigner)

### Pour les Administrateurs:
- ✅ Réinitialiser son mot de passe
- ✅ Modifier ses informations de compte
- ✅ Réagir aux notes (👍👎)
- ✅ Créer et éditer des notes avec feedback amélioré
- 🔜 Gérer tous les tags (créer, modifier, supprimer)
- ✅ Accès complet à toutes les fonctionnalités

### Pour les Techniciens:
- ✅ Réinitialiser son mot de passe
- ✅ Modifier ses informations de compte
- ✅ Réagir aux notes (👍👎)
- ✅ Gérer les utilisateurs
- 🔜 Gérer les tags

---

## 🛡️ Sécurité et Confidentialité

### Mots de passe:
- Longueur minimale: 12 caractères
- Hachage sécurisé avec Argon2
- Tokens de réinitialisation hachés en base de données
- Expiration automatique après 1 heure

### Protection des données:
- Authentification JWT via cookies HTTP-only
- Contrôle d'accès basé sur les rôles (RBAC)
- Validation côté serveur pour toutes les modifications
- Protection contre l'élévation de privilèges

### Audit:
- Les actions sensibles sont journalisées
- Traçabilité des demandes de réinitialisation
- IP address enregistrée pour les resets de mot de passe

---

## ❓ FAQ

**Q: Que faire si je n'ai pas reçu le lien de réinitialisation ?**
R: En mode développement, le lien s'affiche directement à l'écran. En production, vérifiez votre email et votre dossier spam.

**Q: Puis-je avoir plusieurs réactions sur une même note ?**
R: Non, vous ne pouvez avoir qu'une seule réaction (👍 ou 👎) par note à la fois.

**Q: Pourquoi ne puis-je pas modifier mes informations de compte ?**
R: Si vous êtes étudiant, cette fonctionnalité est restreinte. Contactez un administrateur.

**Q: Le bouton "Enregistrer" ne répond pas, que faire ?**
R: Attendez que l'enregistrement précédent soit terminé. Le bouton affiche "Enregistrement..." pendant le processus.

**Q: Combien de temps le lien de réinitialisation est-il valide ?**
R: 1 heure à partir de la demande. Après ce délai, vous devrez faire une nouvelle demande.

---

## 📞 Support

Pour toute question ou problème:
- Contactez votre administrateur système
- Consultez la documentation technique dans `/docs/API.md`
- Signalez les bugs via le système de ticketing interne
