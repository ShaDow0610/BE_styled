/**
 * Script pour initialiser la base de données avec des données test
 * Usage: npm run init-db
 */

import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import User from '../src/lib/models/User';
import Product from '../src/lib/models/Product';
import ProductVariant from '../src/lib/models/ProductVariant';
import ProductPricing from '../src/lib/models/ProductPricing';
import Brand from '../src/lib/models/Brand';
import Supplier from '../src/lib/models/Supplier';
import { calculatePricing } from '../src/lib/pricing';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zephyr-boutique';

async function initDB() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connecté à MongoDB');

    // Le schéma des produits a changé (cahier des charges) : les anciennes
    // collections/index (ex: index unique sur "sku") ne correspondent plus
    // au nouveau modèle. On repart d'une collection propre.
    console.log('🧹 Nettoyage des anciennes collections obsolètes...');
    for (const name of ['products', 'stocks', 'orders', 'outfits', 'productpricings']) {
      await mongoose.connection.db?.dropCollection(name).catch(() => {});
    }
    console.log('✓ Nettoyage effectué');

    console.log('👤 Création de l\'admin utilisateur...');
    const hashedPassword = await bcryptjs.hash('Admin123!', 10);
    const adminUser = await User.findOneAndUpdate(
      { email: 'admin@bestyled.com' },
      {
        email: 'admin@bestyled.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'Be Styled',
        role: 'admin',
        permissions: ['all'],
        active: true,
      },
      { upsert: true, new: true }
    );
    console.log('✓ Admin créé:', adminUser.email);

    console.log('🏷️  Création des marques/fournisseurs...');
    const [brand] = await Brand.find({ nom: 'Chrono Élite' }).limit(1);
    const brandDoc =
      brand ||
      (await Brand.create({
        nom: 'Chrono Élite',
        categorie_accessoire: 'montres',
        contact: 'contact@chronoelite.com',
        conditions_commerciales: 'Paiement 30 jours',
      }));

    const [supplierChine] = await Supplier.find({ nom: 'Usine Guangzhou Textile' }).limit(1);
    const supplierChineDoc =
      supplierChine ||
      (await Supplier.create({
        nom: 'Usine Guangzhou Textile',
        type: 'usine_chine',
        delai_moyen_jours: 25,
        contact: 'sales@gz-textile.cn',
        notes: 'Fournisseur principal vêtements',
      }));

    const [supplierLocal] = await Supplier.find({ nom: 'Atelier Fernando' }).limit(1);
    const supplierLocalDoc =
      supplierLocal ||
      (await Supplier.create({
        nom: 'Atelier Fernando',
        type: 'couturier_local',
        delai_moyen_jours: 7,
        contact: 'fernando@bestyled.com',
        notes: 'Confection locale sur mesure',
      }));

    console.log('✓ Marques/fournisseurs prêts');

    console.log('📦 Création de produits de test...');
    const productsSeed = [
      {
        nom: 'Pantalon Classique Noir',
        reference: 'BSTY-PANT-001',
        categorie: 'pantalon',
        origine: 'import_chine',
        description: 'Pantalon confortable coupe droite',
        fournisseur_id: supplierChineDoc._id,
        poids_kg: 0.4,
        statut: 'disponible',
        variants: [
          { taille: 'M', couleur: 'noir', stock_quantite: 20, seuil_alerte: 5, sku_variante: 'BSTY-PANT-001-M-NOIR' },
          { taille: 'L', couleur: 'noir', stock_quantite: 3, seuil_alerte: 5, sku_variante: 'BSTY-PANT-001-L-NOIR' },
        ],
        pricing: {
          cout_achat: 40, devise_achat: 'CNY', taux_change_applique: 0.19,
          cout_transport: 3, mode_transport: 'bateau', delai_estime_jours: 35,
          cout_douane: 2, cout_packaging: 0.5, cout_main_oeuvre: 0, marge_pourcentage: 60,
        },
      },
      {
        nom: 'Chemise Élégante Blanche',
        reference: 'BSTY-CHEM-001',
        categorie: 'chemise',
        origine: 'local',
        description: 'Chemise confectionnée localement',
        fournisseur_id: supplierLocalDoc._id,
        poids_kg: 0.3,
        statut: 'disponible',
        variants: [
          { taille: 'S', couleur: 'blanc', stock_quantite: 15, seuil_alerte: 5, sku_variante: 'BSTY-CHEM-001-S-BLANC' },
          { taille: 'M', couleur: 'blanc', stock_quantite: 4, seuil_alerte: 5, sku_variante: 'BSTY-CHEM-001-M-BLANC' },
        ],
        pricing: {
          cout_achat: 8000, devise_achat: 'XAF', taux_change_applique: 1,
          cout_transport: 0, mode_transport: 'local', delai_estime_jours: 3,
          cout_douane: 0, cout_packaging: 200, cout_main_oeuvre: 3000, marge_pourcentage: 45,
        },
      },
      {
        nom: 'Montre Chrono Élite',
        reference: 'BSTY-MONT-001',
        categorie: 'montre',
        origine: 'import_chine',
        description: 'Montre accessoire de marque partenaire',
        marque_partenaire_id: brandDoc._id,
        fournisseur_id: supplierChineDoc._id,
        poids_kg: 0.15,
        statut: 'en_transit',
        variants: [
          { taille: 'unique', couleur: 'argent', stock_quantite: 0, seuil_alerte: 3, sku_variante: 'BSTY-MONT-001-U-ARGENT' },
        ],
        pricing: {
          cout_achat: 120, devise_achat: 'USD', taux_change_applique: 0.0017,
          cout_transport: 5, mode_transport: 'avion', delai_estime_jours: 10,
          cout_douane: 8, cout_packaging: 1, cout_main_oeuvre: 0, marge_pourcentage: 80,
        },
      },
      {
        nom: 'Baskets Blanches',
        reference: 'BSTY-CHAU-001',
        categorie: 'chaussure',
        origine: 'import_chine',
        description: 'Baskets confortables et stylées',
        fournisseur_id: supplierChineDoc._id,
        poids_kg: 0.9,
        statut: 'disponible',
        variants: [
          { taille: '40', couleur: 'blanc', stock_quantite: 12, seuil_alerte: 4, sku_variante: 'BSTY-CHAU-001-40-BLANC' },
          { taille: '42', couleur: 'blanc', stock_quantite: 2, seuil_alerte: 4, sku_variante: 'BSTY-CHAU-001-42-BLANC' },
        ],
        pricing: {
          cout_achat: 90, devise_achat: 'CNY', taux_change_applique: 0.19,
          cout_transport: 4, mode_transport: 'bateau', delai_estime_jours: 35,
          cout_douane: 3, cout_packaging: 1, cout_main_oeuvre: 0, marge_pourcentage: 55,
        },
      },
    ];

    for (const seed of productsSeed) {
      const { variants, pricing, ...productFields } = seed;

      const product = await Product.findOneAndUpdate(
        { reference: productFields.reference },
        productFields,
        { upsert: true, new: true }
      );

      for (const variant of variants) {
        await ProductVariant.findOneAndUpdate(
          { sku_variante: variant.sku_variante },
          { ...variant, product_id: product._id },
          { upsert: true, new: true }
        );
      }

      const existingPricing = await ProductPricing.findOne({ product_id: product._id });
      if (!existingPricing) {
        const { prix_revient_total, prix_revente_final } = calculatePricing(pricing);
        await ProductPricing.create({
          product_id: product._id,
          date_effet: new Date(),
          ...pricing,
          prix_revient_total,
          prix_revente_final,
        });
      }

      console.log(`✓ Produit prêt: ${product.nom}`);
    }

    console.log('\n✨ Base de données initialisée avec succès!');
    console.log('\n📝 Identifiants de test:');
    console.log('  Email: admin@bestyled.com');
    console.log('  Password: Admin123!');
    console.log('\nℹ️ Changez ces identifiants en production!');

    await mongoose.disconnect();
    console.log('\n✓ Déconnecté de MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

initDB();
