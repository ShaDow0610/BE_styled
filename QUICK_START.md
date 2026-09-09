# 🚀 QUICK START - Zephyr Boutique

Mise en route rapide de l'application en 5 minutes!

## ⚡ Installation Express

### 1️⃣ Prérequis

- Node.js 18+ installé
- MongoDB local OU MongoDB Atlas
- Git

### 2️⃣ Cloner et Installer

```bash
# Cloner le projet
git clone <votre-repo>
cd zephyr-boutique

# Installer les dépendances
npm install
```

### 3️⃣ Configuration

```bash
# Copier l'exemple de config
cp .env.example .env.local

# Éditer .env.local avec vos paramètres MongoDB
nano .env.local
# ou utiliser votre éditeur préféré
```

**Important:**

- `MONGODB_URI` = votre connexion MongoDB
- `JWT_SECRET` = changez cette clé!
- `SESSION_SECRET` = changez cette clé!

### 4️⃣ Initialiser la Base de Données

```bash
# Créer un admin et des données de test
npm run init-db
```

Voir la console pour les identifiants de test!

### 5️⃣ Démarrer

```bash
npm run dev
```

Ouvrir: **http://localhost:3000**

---

## 📝 Identifiants de Test

Après `npm run init-db`:

```
Email:    admin@zephyr.com
Password: Admin123!
```

⚠️ **Changez ces identifiants en production!**

---

## 🐳 Avec Docker (Encore plus facile!)

```bash
# Démarrer MongoDB + App
docker-compose up -d

# Arrêter
docker-compose down
```

L'app est à **http://localhost:3000**
MongoDB est à **mongodb://localhost:27017**

---

## 📊 Premier Pas dans l'App

1. ✅ Login avec admin@zephyr.com / Admin123!
2. 📈 Voir le dashboard avec statistiques
3. 📦 Explorer les produits de test
4. ⚙️ Aller à /admin pour le panel admin
5. 🔐 Changer les mots de passe de test!

---

## 🔧 Scripts Utiles

```bash
npm run dev       # Dev avec hot reload
npm run build     # Build production
npm start         # Lancer en prod
npm run init-db   # Initialiser la DB
npm run docker:run   # Docker compose up
npm run docker:stop  # Docker compose down
```

---

## 🆘 Problèmes Courants

### "MongoDB connection error"

→ Vérifier MONGODB_URI dans .env.local
→ MongoDB doit être en cours d'exécution

### "Cannot find module"

→ `npm install` encore
→ Redémarrer le serveur dev

### "Port 3000 déjà utilisé"

```bash
# Utiliser un autre port
PORT=3001 npm run dev
```

### "Authentification échouée"

→ Vérifier que init-db a réussi
→ Vérifier les identifiants

---

## 📚 Après la Configuration

- [Documentation Complète](./GUIDE.md)
- [Stack Technique](./README.md)
- Voir [src/](./src/) pour le code source

---

## 🎯 Prochaines Étapes

- [ ] Ajouter vos produits
- [ ] Configurer les catégories
- [ ] Créer des outfits
- [ ] Gérer le stock
- [ ] Intégrer paiements (optionnel)
- [ ] Déployer en production

---

**Besoin d'aide?** Voir la section Support du README.md

Bonne gestion de stock! 📦✨
