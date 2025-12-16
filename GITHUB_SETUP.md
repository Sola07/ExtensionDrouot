# Guide de mise en place du dépôt GitHub

## Étapes pour créer et publier votre projet sur GitHub

### 1. Initialiser le dépôt Git local

```bash
cd "/Users/fgs/Desktop/Extension Drouot"
git init
```

### 2. Ajouter tous les fichiers au staging

```bash
git add .
```

### 3. Créer le premier commit

```bash
git commit -m "Initial commit: Chrome extension Drouot Monitor"
```

### 4. Créer le dépôt sur GitHub

**Option A : Via l'interface web GitHub**
1. Allez sur https://github.com/new
2. Remplissez les informations :
   - Repository name: `drouot-monitor` (ou le nom de votre choix)
   - Description: "Chrome extension for automated Drouot auction monitoring"
   - Visibilité: Public ou Private (selon votre préférence)
   - **NE PAS** cocher "Initialize this repository with a README" (vous avez déjà un README)
3. Cliquez sur "Create repository"

**Option B : Via GitHub CLI** (si installé)
```bash
gh repo create drouot-monitor --public --source=. --remote=origin --push
```

### 5. Lier le dépôt local au dépôt GitHub

Après avoir créé le dépôt sur GitHub, vous obtiendrez une URL. Remplacez `VOTRE_USERNAME` par votre nom d'utilisateur GitHub :

```bash
git remote add origin https://github.com/VOTRE_USERNAME/drouot-monitor.git
```

Ou si vous utilisez SSH :
```bash
git remote add origin git@github.com:VOTRE_USERNAME/drouot-monitor.git
```

### 6. Vérifier la configuration du remote

```bash
git remote -v
```

### 7. Pousser le code vers GitHub

```bash
git branch -M main
git push -u origin main
```

## Commandes Git utiles pour la suite

### Ajouter des modifications
```bash
git add .
git commit -m "Description des modifications"
git push
```

### Vérifier le statut
```bash
git status
```

### Voir l'historique des commits
```bash
git log --oneline
```

### Créer une branche pour une nouvelle fonctionnalité
```bash
git checkout -b feature/nom-de-la-fonctionnalite
# Faire vos modifications
git add .
git commit -m "Ajout de la fonctionnalité X"
git push -u origin feature/nom-de-la-fonctionnalite
```

## Fichiers exclus du dépôt (via .gitignore)

Les fichiers suivants ne seront **pas** versionnés :
- `node_modules/` - Dépendances npm
- `dist/` - Fichiers de build (générés automatiquement)
- `.DS_Store` - Fichiers système macOS
- Fichiers de logs et temporaires
- Clés privées (`.pem`, `.crx`)

## Notes importantes

1. **package-lock.json** est maintenant inclus dans le dépôt (recommandé pour la reproductibilité)
2. Le dossier `dist/` est exclu car il est généré lors du build
3. Assurez-vous que toutes les informations sensibles sont dans `.gitignore`
4. Le README.md existant sera utilisé comme description du projet sur GitHub

## Prochaines étapes recommandées

1. Ajouter des badges dans le README (build status, version, etc.)
2. Configurer GitHub Actions pour le CI/CD (optionnel)
3. Ajouter des issues templates pour les bugs et features
4. Créer un fichier LICENSE si nécessaire
5. Ajouter des contributeurs dans le README
