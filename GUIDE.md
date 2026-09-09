# 🌟 Zephyr - Guide Complet de Gestion de Stock

Application Next.js moderne pour gérer votre boutique de vêtements, accessoires, bijoux et chaussures.

## ⚡ Démarrage Rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer MongoDB
# Éditer .env.local avec votre MONGODB_URI

# 3. Démarrer le serveur
npm run dev

# 4. Ouvrir http://localhost:3000
```

## 🎯 Fonctionnalités Principales

✅ **Gestion de Produits** - CRUD complet avec catégories
✅ **Gestion de Stock** - Suivi en temps réel, alertes
✅ **Authentification JWT** - Sécurisée et performante
✅ **Dashboard Analytics** - Statistiques en temps réel
✅ **Outfits** - Créer des tenues pré-composées
✅ **Animations Fluides** - GSAP + Framer Motion + ScrollTrigger
✅ **Interface Responsive** - Mobile, Tablet, Desktop

## 📦 Technologies Utilisées

| Category       | Tools                                          |
| -------------- | ---------------------------------------------- |
| **Frontend**   | Next.js 14, React 19, TypeScript, Tailwind CSS |
| **Animations** | GSAP, ScrollTrigger, Framer Motion, Lenis      |
| **Icons**      | FontAwesome 6                                  |
| **Backend**    | Next.js API Routes                             |
| **Database**   | MongoDB + Mongoose                             |
| **Security**   | JWT, bcryptjs                                  |

## 📍 Pages & Routes

### Public

- `/` - Page d'accueil
- `/login` - Connexion

### Protected (Auth Required)

- `/dashboard` - Dashboard principal
- `/products` - Liste des produits
- `/admin` - Panel admin

## 🔌 API Endpoints

### Authentication

```
POST /api/auth/login
  body: { email, password }
  returns: { token, user }
```

### Products

```
GET /api/products?category=clothing&limit=10
POST /api/products
PATCH /api/products/:id
DELETE /api/products/:id
```

### Stock

```
GET /api/stock?status=low-stock&warehouse=Main
POST /api/stock
PATCH /api/stock
```

## 🎨 Animations en Action

### 1. Page d'accueil

- Hero title: slide up + fade in
- Features: stagger animation
- Tech stack: scale in

### 2. Dashboard

- Stat cards: slide up en cascade
- Product list: scroll trigger animations
- Charts: progressive loading

### 3. Navigation

- Menu mobile: height animation
- Hover effects: scale + shadow
- Transitions: smooth 300ms

## 🔐 Authentification

### Login Flow

1. Utilisateur entre email/password
2. POST à `/api/auth/login`
3. Serveur valide et retourne JWT token
4. Token stocké dans localStorage
5. Redirect vers dashboard

### Protected Routes

```typescript
useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) router.push("/login");
}, []);
```

## 💾 Modèles MongoDB

### Product

- Vêtements, accessoires, bijoux, chaussures, outfits
- Priced & costed
- Variantes: couleurs, tailles
- Ratings & reviews

### Stock

- Linked to Product
- Quantity tracking
- Min/max alerts
- Warehouse management
- Status: in-stock, low-stock, out-of-stock

### User

- Admin/Manager/Staff roles
- Permissions array
- Password hashed with bcryptjs
- Last login tracking

### Outfit

- Collections de produits
- Season & occasion tags
- Pre-composed looks
- Total price calculation

### Order

- Order line items
- Status workflow
- Shipping dates
- Notes/comments

## 🚀 Déploiement

### Vercel (Recommandé)

```bash
# Juste push sur GitHub, Vercel déploie automatiquement
# N'oublie pas les env vars!
```

### Docker

```bash
docker build -t zephyr .
docker run -p 3000:3000 -e MONGODB_URI=... zephyr
```

### Railway/Render

Support natif Next.js + MongoDB Atlas

## 📊 Performance

- **Turbopack** pour builds ultra-rapides
- **Image Optimization** avec Next.js Image
- **API Routes** serverless et scalables
- **Mongoose Indexes** pour requêtes rapides
- **CSS-in-JS minimal** (Tailwind)
- **Code Splitting** automatique

## 🔒 Bonnes Pratiques de Sécurité

✅ Secrets dans `.env.local` (jamais en git)
✅ CORS configuré strictement
✅ Validation des inputs côté serveur
✅ Hachage des mots de passe avec salt
✅ JWT avec expiration courte
✅ HTTPS en production
✅ Rate limiting recommandé

## 📱 Responsive Design

- Mobile: 375px min
- Tablet: 768px+
- Desktop: 1024px+
- Tous les composants adaptés

## 🐛 Dépannage Courant

**Q: Erreur de connexion MongoDB**
A: Vérifiez MONGODB_URI dans .env.local

**Q: Authentification échoue**
A: Créez un utilisateur admin dans MongoDB

**Q: Animations manquantes**
A: Vérifiez que GSAP/Framer sont installés

**Q: Pages sont lentes**
A: Vérifiez les logs serveur, optimisez les requêtes DB

## 📚 Ressources

- Next.js Docs: https://nextjs.org/docs
- MongoDB: https://docs.mongodb.com
- GSAP: https://gsap.com/docs
- Framer Motion: https://www.framer.com/motion
- Tailwind: https://tailwindcss.com/docs

## 🎓 Tutoriels et Astuces

### Ajouter un nouveau produit

1. Remplir le formulaire dans /products
2. Envoyer POST à /api/products
3. Créer une entrée stock correspondante
4. Valider sur le dashboard

### Créer un outfit

1. Sélectionner les produits
2. Définir l'occasion/season
3. Calculer le prix total
4. Publier

### Gérer le stock

1. Définir min/max quantities
2. Surveiller les alertes low-stock
3. Mettre à jour les quantités
4. Tracker l'historique

## ✨ Prochaines Améliorations Possibles

- [ ] Upload d'images vers cloud storage
- [ ] Bulk import de CSV
- [ ] Export rapports PDF
- [ ] Notifications email
- [ ] Historique d'audit
- [ ] Multi-warehouse avancé
- [ ] Prédictions IA des ventes
- [ ] Intégration pos

---

**Zephyr** - Gestion de stock à l'état de l'art ✨

Version 1.0.0 | 2024
