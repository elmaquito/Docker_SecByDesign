# Wireframes - NOTIMATIC MVP

## Introduction

Ce document présente les wireframes (maquettes fonctionnelles) pour l'interface utilisateur du MVP NOTIMATIC. Les wireframes sont représentés en ASCII art et accompagnés de descriptions UX détaillées.

---

## 1. Page d'Accueil / Feed d'Actualités

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ NOTIMATIC                                    [John Doe ▼] [Logout] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 🔍 Rechercher...                                    [Filtres] │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌─ Filtres ──────────────────────────────────────────────────────┐│
│  │ 🏷️  Thèmes:     [x] Sécurité  [x] DevOps  [ ] Cloud          ││
│  │ 📂 Catégories:  [x] Bac+1     [ ] Bac+2   [ ] Toutes classes ││
│  │ 📅 Période:     [Cette semaine ▼]                             ││
│  │                                              [Appliquer] [Reset]││
│  └───────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ════════════════════════════════════════════════════════════════  │
│                                                                     │
│  ┌─ NoteCard ──────────────────────────────────────────────────┐  │
│  │ 📝 Introduction à la Cryptographie                          │  │
│  │ Par Prof. Martin • il y a 2 heures                          │  │
│  │                                                              │  │
│  │ Découvrez les principes fondamentaux de la cryptographie... │  │
│  │                                                              │  │
│  │ 🏷️  Sécurité   📂 Bac+1, Cyber1                           │  │
│  │ 💬 12 commentaires  👁️ 45 vues                            │  │
│  │                                      [Voir plus] [Commenter] │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ NoteCard ──────────────────────────────────────────────────┐  │
│  │ 📝 Exercices Docker - Semaine 3                             │  │
│  │ Par Prof. Dupont • il y a 5 heures                          │  │
│  │                                                              │  │
│  │ Voici les exercices pratiques sur Docker pour cette...      │  │
│  │                                                              │  │
│  │ 🏷️  DevOps   📂 Bac+1, Toutes classes                     │  │
│  │ 💬 8 commentaires  👁️ 32 vues                             │  │
│  │                                      [Voir plus] [Commenter] │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ NoteCard ──────────────────────────────────────────────────┐  │
│  │ 📝 Rappel: Devoir à rendre vendredi                         │  │
│  │ Par Prof. Martin • hier                                     │  │
│  │                                                              │  │
│  │ N'oubliez pas de rendre votre rapport d'analyse de...       │  │
│  │                                                              │  │
│  │ 🏷️  Sécurité   📂 Bac+2, Cyber2                           │  │
│  │ 💬 3 commentaires  👁️ 28 vues                             │  │
│  │                                      [Voir plus] [Commenter] │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│                    [Charger plus de notes...]                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Description UX

**Objectif**: Afficher le feed personnalisé de notes ciblées pour l'utilisateur connecté.

**Éléments clés**:
1. **Header**: 
   - Logo NOTIMATIC (cliquable, retour accueil)
   - Nom utilisateur avec menu déroulant (profil, paramètres)
   - Bouton Logout

2. **Barre de recherche**: 
   - Recherche full-text dans les notes (future feature)
   - Bouton "Filtres" pour afficher/masquer les filtres

3. **Panneau de filtres** (collapsible):
   - Filtrage par thèmes (multi-select, checkboxes)
   - Filtrage par catégories (classes, promos, niveaux)
   - Filtrage par période
   - Boutons "Appliquer" et "Reset"

4. **Liste de NoteCards**:
   - Cartes de notes scrollables
   - Pagination ou infinite scroll
   - Bouton "Charger plus"

5. **NoteCard** (voir section 2 pour détails)

**Interactions**:
- Click sur NoteCard → Redirection vers page Détail Note
- Click sur "Commenter" → Redirection vers Détail Note avec focus commentaire
- Click sur thème/catégorie → Filtre automatique
- Scroll → Lazy loading

**Responsive**:
- Desktop: 3 colonnes (sidebar gauche optionnelle, feed central, infos droite optionnelle)
- Tablet: 2 colonnes (feed + sidebar)
- Mobile: 1 colonne (feed full-width, filtres en modal)

---

## 2. NoteCard (Carte de Note)

### Wireframe Détaillé

```
┌────────────────────────────────────────────────────────────────┐
│ 📝 Titre de la Note (max 100 caractères)                      │
│ Par [Auteur] • [Date relative] • 🎯 [Cibles]                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Extrait du contenu de la note (150 premiers caractères        │
│ environ) avec ellipse si tronqué...                           │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│ 🏷️  [Thème 1] [Thème 2] [Thème 3]                           │
│ 📂 [Catégorie 1: Cyber1] [Catégorie 2: Bac+1]                │
├────────────────────────────────────────────────────────────────┤
│ 💬 [N] commentaires  👁️ [N] vues  📅 [Date publication]     │
│                                                                │
│                        [Voir plus] [💬 Commenter] [⭐ Épingler]│
└────────────────────────────────────────────────────────────────┘
```

### Description UX

**Objectif**: Afficher un aperçu compact et informatif d'une note.

**Éléments**:
1. **Icône + Titre**: 
   - Icône 📝 pour note standard, 🔔 pour note urgente, 📌 pour épinglée
   - Titre cliquable (max 100 chars)
   - Tronqué avec ellipse si trop long

2. **Métadonnées**:
   - Auteur (cliquable vers profil, future feature)
   - Date relative ("il y a 2h", "hier", "3 jours")
   - Icône 🎯 + nombre de cibles si note ciblée

3. **Extrait de contenu**:
   - 150 premiers caractères du contenu
   - Ellipse (...) si tronqué
   - Sans formatage HTML (texte brut)

4. **Tags**:
   - Badges thèmes (couleurs différentes par thème)
   - Badges catégories (affichage des cibles)
   - Maximum 3 tags affichés + "..." si plus

5. **Statistiques**:
   - Nombre de commentaires
   - Nombre de vues (future feature)
   - Date de publication complète (hover)

6. **Actions**:
   - **Voir plus**: Ouvre le détail complet
   - **Commenter**: Ouvre détail avec focus commentaire
   - **Épingler**: (Admin/Teacher) épingle la note en haut du feed

**États visuels**:
- **Standard**: Fond blanc, bordure grise
- **Non lue**: Fond bleu clair, bordure bleue
- **Épinglée**: Icône 📌, fond jaune pâle
- **Urgente**: Bordure rouge, icône 🔔

**Hover**:
- Ombre portée
- Légère élévation (effet carte)
- Curseur pointer

---

## 3. Détail Note + Zone Commentaires

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ [← Retour au feed]                      [✏️ Modifier] [🗑️ Supprimer]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ Note Complète ─────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  📝 Titre Complet de la Note                                │  │
│  │  Par Prof. Martin • 15/12/2024 10:30                        │  │
│  │                                                              │  │
│  │  ──────────────────────────────────────────────────────────  │  │
│  │                                                              │  │
│  │  Contenu complet de la note avec formatage Markdown         │  │
│  │  possible. Plusieurs paragraphes.                           │  │
│  │                                                              │  │
│  │  - Liste à puces                                            │  │
│  │  - Deuxième élément                                         │  │
│  │                                                              │  │
│  │  **Texte en gras**, *italique*, `code inline`              │  │
│  │                                                              │  │
│  │  ```                                                        │  │
│  │  Bloc de code                                               │  │
│  │  ```                                                        │  │
│  │                                                              │  │
│  │  ──────────────────────────────────────────────────────────  │  │
│  │                                                              │  │
│  │  🏷️  Sécurité  DevOps  Cryptographie                      │  │
│  │  📂 Ciblé: Bac+1, Cyber1, Promo 2024-2025                  │  │
│  │  👁️ 45 vues                                                │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ════════════════════════════════════════════════════════════════  │
│                                                                     │
│  ┌─ Commentaires (12) ────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  ┌─ Comment ──────────────────────────────────────────────┐ │  │
│  │  │ 👤 Sophie L. • il y a 1 heure                          │ │  │
│  │  │                                                        │ │  │
│  │  │ Excellente explication ! J'ai enfin compris le        │ │  │
│  │  │ principe de chiffrement asymétrique.                  │ │  │
│  │  │                                          [Répondre]    │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  │  ┌─ Comment ──────────────────────────────────────────────┐ │  │
│  │  │ 👤 Marc D. • il y a 3 heures                           │ │  │
│  │  │                                                        │ │  │
│  │  │ Question: Est-ce que RSA est encore sécurisé en 2024? │ │  │
│  │  │                                          [Répondre]    │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  │  ┌─ Comment ──────────────────────────────────────────────┐ │  │
│  │  │ 👤 Prof. Martin • il y a 2 heures                      │ │  │
│  │  │                                                        │ │  │
│  │  │ @Marc D. Oui, RSA-2048 est encore sécurisé mais on    │ │  │
│  │  │ recommande RSA-3072 ou mieux, des courbes elliptiques │ │  │
│  │  │                                          [Répondre]    │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  │                      [Charger plus...]                       │  │
│  │                                                              │  │
│  │  ─────────────────────────────────────────────────────────   │  │
│  │                                                              │  │
│  │  ✍️ Ajouter un commentaire:                                 │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │ [Votre commentaire ici...]                            │ │  │
│  │  │                                                        │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  │                                [Annuler] [💬 Publier]       │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Description UX

**Objectif**: Afficher le contenu complet d'une note et permettre la discussion via commentaires.

**Section Note**:
1. **Breadcrumb/Navigation**:
   - Bouton "Retour au feed"
   - Boutons d'action (Modifier, Supprimer) si propriétaire/admin

2. **Titre et métadonnées**:
   - Titre complet
   - Auteur + date complète

3. **Contenu**:
   - Rendu Markdown (gras, italique, listes, code, etc.)
   - Sanitization XSS avec DOMPurify
   - Images autorisées (future feature)

4. **Tags et ciblage**:
   - Tous les thèmes (pas de limite)
   - Toutes les catégories ciblées
   - Statistiques (vues, etc.)

**Section Commentaires**:
1. **Titre section**: "Commentaires (N)"

2. **Liste commentaires**:
   - Avatar utilisateur (ou icône 👤)
   - Nom + rôle (badge teacher/admin)
   - Date relative
   - Contenu commentaire
   - Bouton "Répondre" (future feature: threads)

3. **Pagination**: "Charger plus" si > 10 commentaires

4. **Formulaire nouveau commentaire**:
   - Textarea
   - Boutons Annuler et Publier
   - Validation: min 1 caractère

**Interactions**:
- Click "Modifier" → Mode édition (si autorisé)
- Click "Supprimer" → Confirmation modale
- Click "Publier" → POST commentaire + refresh liste
- Click "Répondre" → Focus textarea (future: quote)

**Permissions**:
- Lecture: Utilisateurs ciblés + admin/tech + teacher (si student note)
- Commentaire: Idem
- Modification note: Propriétaire + admin + teacher (si student note)
- Suppression note: Propriétaire + admin

---

## 4. Formulaire Création de Note (Teacher)

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ [← Retour]                     Créer une Nouvelle Note             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ Informations de la Note ──────────────────────────────────────┐│
│  │                                                                 ││
│  │  Titre *                                                        ││
│  │  ┌────────────────────────────────────────────────────────────┐││
│  │  │ Introduction à la Cryptographie                            │││
│  │  └────────────────────────────────────────────────────────────┘││
│  │  [100 caractères max]                                          ││
│  │                                                                 ││
│  │  Contenu *                                                      ││
│  │  ┌────────────────────────────────────────────────────────────┐││
│  │  │                                                            │││
│  │  │ Rédigez le contenu de votre note ici...                   │││
│  │  │                                                            │││
│  │  │ Support Markdown:                                         │││
│  │  │ **gras** *italique* `code` [lien](url)                   │││
│  │  │                                                            │││
│  │  │                                                            │││
│  │  │                                                            │││
│  │  │                                                            │││
│  │  └────────────────────────────────────────────────────────────┘││
│  │  [Markdown supporté] [Prévisualiser]                           ││
│  │                                                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ Thématiques ───────────────────────────────────────────────────┐│
│  │                                                                 ││
│  │  Sélectionner les thèmes (multi-select):                       ││
│  │                                                                 ││
│  │  [x] Sécurité       [ ] DevOps        [x] Cryptographie        ││
│  │  [ ] Cloud          [ ] Réseau        [ ] Programmation        ││
│  │  [ ] Base de données [ ] IA/ML       [+ Créer nouveau thème]   ││
│  │                                                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ Ciblage (Qui verra cette note ?) ─────────────────────────────┐│
│  │                                                                 ││
│  │  Mode de ciblage:                                              ││
│  │  ○ Tous les étudiants                                          ││
│  │  ● Par catégories  ○ Utilisateurs spécifiques                  ││
│  │                                                                 ││
│  │  ┌─ Catégories ──────────────────────────────────────────────┐ ││
│  │  │                                                            │ ││
│  │  │ Classes:                                                   │ ││
│  │  │ [x] Cyber1   [x] Cyber2   [ ] Dev1    [ ] Dev2            │ ││
│  │  │                                                            │ ││
│  │  │ Promotions:                                                │ ││
│  │  │ [x] 2024-2025   [ ] 2023-2024   [ ] 2025-2026             │ ││
│  │  │                                                            │ ││
│  │  │ Niveaux:                                                   │ ││
│  │  │ [x] Bac+1   [ ] Bac+2   [ ] Bac+3   [ ] Bac+4   [ ] Bac+5 │ ││
│  │  │                                                            │ ││
│  │  └────────────────────────────────────────────────────────────┘ ││
│  │                                                                 ││
│  │  [+ Ajouter catégorie personnalisée]                           ││
│  │                                                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ Options Avancées ──────────────────────────────────────────────┐│
│  │                                                                 ││
│  │  [ ] Épingler en haut du feed                                  ││
│  │  [ ] Marquer comme urgente                                     ││
│  │  [ ] Envoyer notification email                                ││
│  │  [ ] Programmer la publication (future)                        ││
│  │                                                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ Aperçu ────────────────────────────────────────────────────────┐│
│  │                                                                 ││
│  │  Votre note sera visible par:                                  ││
│  │  • Étudiants des classes: Cyber1, Cyber2                       ││
│  │  • Promotion: 2024-2025                                        ││
│  │  • Niveau: Bac+1                                               ││
│  │  • Total estimé: ~45 étudiants                                 ││
│  │                                                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│                                                                     │
│            [Annuler]  [Enregistrer brouillon]  [📝 Publier]        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Description UX

**Objectif**: Permettre aux enseignants de créer des notes ciblées avec thématiques.

**Sections**:

1. **Informations de base**:
   - **Titre**: Input text, required, max 100 chars, compteur
   - **Contenu**: Textarea, required, Markdown supporté
   - Bouton "Prévisualiser" → Modal avec rendu

2. **Thématiques**:
   - Multi-select checkboxes
   - Liste des thèmes existants
   - Bouton "+ Créer nouveau thème" (ouvre modal)
   - Validation: au moins 1 thème

3. **Ciblage**:
   - **Radio buttons**:
     - "Tous les étudiants" → Note publique
     - "Par catégories" → Affiche section catégories
     - "Utilisateurs spécifiques" → Autocomplete multi-select (future)
   
   - **Catégories** (si "Par catégories"):
     - **Classes**: Multi-select checkboxes
     - **Promotions**: Multi-select checkboxes
     - **Niveaux**: Multi-select checkboxes
     - Bouton "+ Ajouter catégorie personnalisée"

4. **Options avancées** (collapsible):
   - Épingler (admin/teacher)
   - Urgente (badge rouge)
   - Notification email (future)
   - Programmation (future)

5. **Aperçu ciblage**:
   - Résumé des cibles sélectionnées
   - Estimation nombre d'utilisateurs concernés (future query)

6. **Actions**:
   - **Annuler**: Retour sans sauvegarder (confirmation si modifs)
   - **Enregistrer brouillon**: Save draft (future feature)
   - **Publier**: Validation + POST → Redirect vers détail note

**Validation**:
- Titre: required, max 100
- Contenu: required, min 10 chars
- Thèmes: au moins 1
- Ciblage: au moins 1 cible si mode "catégories"

**Workflow**:
1. Teacher click "Créer note" → Form
2. Remplir titre, contenu
3. Sélectionner thèmes
4. Choisir mode ciblage
5. Sélectionner catégories
6. Optionnel: Options avancées
7. Vérifier aperçu
8. Click "Publier"
9. Backend crée note + associations (note_themes, note_categories, note_targets)
10. Redirect vers note créée

---

## 5. Dashboard Enseignant

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ NOTIMATIC - Dashboard Enseignant                   [Prof. Martin ▼]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ Actions Rapides ───────────────────────────────────────────────┐│
│  │                                                                 ││
│  │  [📝 Créer Nouvelle Note]  [🏷️ Gérer Thèmes]  [📂 Catégories] ││
│  │                                                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ Statistiques ──────────────────────────────────────────────────┐│
│  │                                                                 ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       ││
│  │  │    15    │  │    128   │  │   342    │  │   4.2    │       ││
│  │  │  Notes   │  │Comments  │  │  Vues    │  │ Avg/Note │       ││
│  │  │  créées  │  │  reçus   │  │  totales │  │  Score   │       ││
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘       ││
│  │                                                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ Mes Notes Récentes ────────────────────────────────────────────┐│
│  │                                                                 ││
│  │  [Toutes] [Publiées] [Brouillons] [Archivées]                  ││
│  │                                                                 ││
│  │  ┌────────────────────────────────────────────────────────────┐ ││
│  │  │ 📝 Introduction à la Cryptographie                         │ ││
│  │  │ Publié il y a 2 heures • 12 💬 • 45 👁️                   │ ││
│  │  │ 🏷️ Sécurité, Crypto  📂 Bac+1, Cyber1                    │ ││
│  │  │                        [Voir] [Éditer] [Stats] [Archiver] │ ││
│  │  └────────────────────────────────────────────────────────────┘ ││
│  │                                                                 ││
│  │  ┌────────────────────────────────────────────────────────────┐ ││
│  │  │ 📝 Exercices Docker - Semaine 3                            │ ││
│  │  │ Publié il y a 5 heures • 8 💬 • 32 👁️                    │ ││
│  │  │ 🏷️ DevOps  📂 Toutes classes                             │ ││
│  │  │                        [Voir] [Éditer] [Stats] [Archiver] │ ││
│  │  └────────────────────────────────────────────────────────────┘ ││
│  │                                                                 ││
│  │  ┌────────────────────────────────────────────────────────────┐ ││
│  │  │ 📝 TP Sécurité Réseau - Partie 2                           │ ││
│  │  │ Publié hier • 15 💬 • 67 👁️                              │ ││
│  │  │ 🏷️ Sécurité, Réseau  📂 Bac+2                            │ ││
│  │  │                        [Voir] [Éditer] [Stats] [Archiver] │ ││
│  │  └────────────────────────────────────────────────────────────┘ ││
│  │                                                                 ││
│  │                      [Voir toutes mes notes]                    ││
│  │                                                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ Activité Récente ──────────────────────────────────────────────┐│
│  │                                                                 ││
│  │  • Sophie L. a commenté "Introduction à la Cryptographie"      ││
│  │    il y a 1 heure                                              ││
│  │                                                                 ││
│  │  • Marc D. a commenté "Exercices Docker - Semaine 3"           ││
│  │    il y a 2 heures                                             ││
│  │                                                                 ││
│  │  • 5 nouveaux étudiants ont vu "TP Sécurité Réseau - Partie 2" ││
│  │    il y a 3 heures                                             ││
│  │                                                                 ││
│  │                      [Voir toute l'activité]                    ││
│  │                                                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Description UX

**Objectif**: Tableau de bord centralisé pour les enseignants.

**Sections**:

1. **Actions rapides**:
   - Boutons d'accès direct vers fonctions principales
   - Créer note, gérer thèmes, gérer catégories

2. **Statistiques**:
   - Cards avec métriques clés
   - Notes créées, commentaires reçus, vues totales, score moyen (future)
   - Graphiques (future: courbes d'évolution)

3. **Mes notes récentes**:
   - Filtres par statut (Toutes, Publiées, Brouillons, Archivées)
   - Liste des dernières notes (5-10)
   - Actions rapides: Voir, Éditer, Stats, Archiver
   - Lien "Voir toutes mes notes"

4. **Activité récente**:
   - Feed d'activité (commentaires, vues, etc.)
   - Limite 5 dernières activités
   - Lien "Voir toute l'activité"

**Navigation**:
- Accessible via menu utilisateur → "Dashboard"
- Ou lien direct "Mon Dashboard" dans header

---

## 6. Gestion des Thèmes (Admin/Teacher)

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ [← Retour]                   Gestion des Thèmes                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [🔍 Rechercher...]                        [+ Créer Nouveau Thème] │
│                                                                     │
│  ┌─ Liste des Thèmes ──────────────────────────────────────────────┐│
│  │                                                                 ││
│  │  ┌──────────────────────────────────────────────────────────┐  ││
│  │  │ 🏷️ Sécurité                                              │  ││
│  │  │ Thèmes liés à la cybersécurité, pentest, etc.           │  ││
│  │  │ Créé par Admin • Utilisé dans 23 notes                  │  ││
│  │  │                                   [✏️ Modifier] [🗑️ Suppr] │  ││
│  │  └──────────────────────────────────────────────────────────┘  ││
│  │                                                                 ││
│  │  ┌──────────────────────────────────────────────────────────┐  ││
│  │  │ 🏷️ DevOps                                                │  ││
│  │  │ CI/CD, Docker, Kubernetes, automatisation               │  ││
│  │  │ Créé par Prof. Martin • Utilisé dans 15 notes           │  ││
│  │  │                                   [✏️ Modifier] [🗑️ Suppr] │  ││
│  │  └──────────────────────────────────────────────────────────┘  ││
│  │                                                                 ││
│  │  ┌──────────────────────────────────────────────────────────┐  ││
│  │  │ 🏷️ Cryptographie                                         │  ││
│  │  │ Chiffrement, hashing, signatures, PKI                   │  ││
│  │  │ Créé par Prof. Dupont • Utilisé dans 8 notes            │  ││
│  │  │                                   [✏️ Modifier] [🗑️ Suppr] │  ││
│  │  └──────────────────────────────────────────────────────────┘  ││
│  │                                                                 ││
│  │                           [...]                                 ││
│  │                                                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

────────────────────────────────────────────────────────────────────────

Modal: Créer/Modifier Thème
┌─────────────────────────────────────────────────────────────────┐
│ [X]                  Créer un Nouveau Thème                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Nom du thème *                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Sécurité                                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│  [Max 100 caractères]                                          │
│                                                                 │
│  Description                                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Thèmes liés à la cybersécurité, pentest, sécurité         │ │
│  │ applicative, etc.                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│  [Optionnel, max 500 caractères]                               │
│                                                                 │
│  Couleur (affichage badge)                                      │
│  ⬛ ⬜ 🟥 🟧 🟨 🟩 🟦 🟪                                         │
│  [Bleu sélectionné]                                            │
│                                                                 │
│                                                                 │
│                                   [Annuler]  [💾 Enregistrer]  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Description UX

**Objectif**: Gérer les thématiques pour l'organisation des notes.

**Fonctionnalités**:
1. **Liste thèmes**:
   - Barre recherche
   - Bouton "+ Créer"
   - Cards thèmes avec nom, description, stats
   - Actions: Modifier, Supprimer

2. **Modal création/modification**:
   - Champ nom (required, unique)
   - Champ description (optionnel)
   - Sélection couleur (badge)
   - Validation + enregistrement

3. **Suppression**:
   - Confirmation si thème utilisé dans notes
   - Option: supprimer ou réassigner notes

**Permissions**:
- Admin: CRUD complet
- Teacher: Create, Read, Update (own), Delete (own, si pas utilisé)
- Student: Read only

---

## 7. Gestion des Catégories (Admin/Teacher)

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ [← Retour]                 Gestion des Catégories                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [🔍 Rechercher...]                     [+ Créer Nouvelle Catégorie]│
│                                                                     │
│  ┌─ Liste des Catégories ──────────────────────────────────────────┐│
│  │                                                                 ││
│  │  ┌──────────────────────────────────────────────────────────┐  ││
│  │  │ 📂 Classe: Cyber1                                        │  ││
│  │  │ Type: Classe • Valeur: Cyber1                            │  ││
│  │  │ Utilisé dans 15 notes • 18 étudiants                     │  ││
│  │  │                                   [✏️ Modifier] [🗑️ Suppr] │  ││
│  │  └──────────────────────────────────────────────────────────┘  ││
│  │                                                                 ││
│  │  ┌──────────────────────────────────────────────────────────┐  ││
│  │  │ 📂 Promotion: 2024-2025                                  │  ││
│  │  │ Type: Promotion • Valeur: 2024-2025                      │  ││
│  │  │ Utilisé dans 32 notes • 45 étudiants                     │  ││
│  │  │                                   [✏️ Modifier] [🗑️ Suppr] │  ││
│  │  └──────────────────────────────────────────────────────────┘  ││
│  │                                                                 ││
│  │  ┌──────────────────────────────────────────────────────────┐  ││
│  │  │ 📂 Niveau: Bac+1                                         │  ││
│  │  │ Type: Niveau • Valeur: Bac+1                             │  ││
│  │  │ Utilisé dans 28 notes • 55 étudiants                     │  ││
│  │  │                                   [✏️ Modifier] [🗑️ Suppr] │  ││
│  │  └──────────────────────────────────────────────────────────┘  ││
│  │                                                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

────────────────────────────────────────────────────────────────────────

Modal: Créer Catégorie
┌─────────────────────────────────────────────────────────────────┐
│ [X]               Créer une Nouvelle Catégorie                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Nom de la catégorie *                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Classe: Cyber1                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Type de ciblage *                                              │
│  ○ Classe  ○ Promotion  ○ Niveau  ○ Tous                       │
│  [Classe sélectionné]                                          │
│                                                                 │
│  Valeur cible *                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Cyber1                                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│  [Ex: "Cyber1", "2024-2025", "Bac+1", laissez vide pour "all"]│
│                                                                 │
│  Description (optionnel)                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Étudiants de première année cybersécurité                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                                                 │
│                                   [Annuler]  [💾 Enregistrer]  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Description UX

**Objectif**: Gérer les catégories pour le ciblage de notes.

**Fonctionnalités**:
1. **Liste catégories**:
   - Affichage type + valeur
   - Stats d'utilisation
   - Actions CRUD

2. **Modal création**:
   - Nom catégorie
   - Type (classe, promo, niveau, all)
   - Valeur cible
   - Description

3. **Validation**:
   - Nom unique
   - Type requis
   - Valeur requise sauf si type = "all"

---

## Principes UX Globaux

### Accessibilité (WCAG AA)
- Contraste couleurs > 4.5:1
- Navigation au clavier
- Labels aria pour lecteurs d'écran
- Focus visible
- Textes alternatifs pour images/icônes

### Responsive Design
- **Mobile** (< 768px): 1 colonne, navigation hamburger, filtres en modal
- **Tablet** (768-1024px): 2 colonnes, sidebar collapsible
- **Desktop** (> 1024px): 3 colonnes, sidebar fixe

### Performance
- Lazy loading images
- Virtual scrolling pour longues listes
- Debounce sur recherche
- Pagination ou infinite scroll

### Feedback Utilisateur
- Loading spinners
- Toasts pour succès/erreur
- Confirmations pour actions destructives
- Messages d'erreur explicites

### Cohérence Visuelle
- Design System basé sur Material Design ou Tailwind
- Palette de couleurs cohérente
- Typographie hiérarchisée
- Espacements constants (8px grid)

---

**Version**: 1.0  
**Date**: 12 décembre 2024  
**Auteur**: GitHub Copilot Agent
