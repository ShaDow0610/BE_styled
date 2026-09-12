/**
 * Script pour initialiser la base de données avec des données test
 * Usage: npm run init-db
 */

import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import User from '../src/lib/models/User';
import Product from '../src/lib/models/Product';
import ProductPricing from '../src/lib/models/ProductPricing';
import Brand from '../src/lib/models/Brand';
import Supplier from '../src/lib/models/Supplier';
import OrderTracking from '../src/lib/models/OrderTracking';
import ListOption from '../src/lib/models/ListOption';
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
    for (const name of ['products', 'stocks', 'orders', 'outfits', 'productpricings', 'productvariants']) {
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
        couleurs_disponibles: ['noir'],
        tailles_disponibles: ['M', 'L'],
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
        couleurs_disponibles: ['blanc'],
        tailles_disponibles: ['S', 'M'],
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
        couleurs_disponibles: ['argent'],
        tailles_disponibles: ['unique'],
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
        couleurs_disponibles: ['blanc'],
        tailles_disponibles: ['40', '42'],
        pricing: {
          cout_achat: 90, devise_achat: 'CNY', taux_change_applique: 0.19,
          cout_transport: 4, mode_transport: 'bateau', delai_estime_jours: 35,
          cout_douane: 3, cout_packaging: 1, cout_main_oeuvre: 0, marge_pourcentage: 55,
        },
      },
    ];

    for (const seed of productsSeed) {
      const { pricing, ...productFields } = seed;

      const product = await Product.findOneAndUpdate(
        { reference: productFields.reference },
        productFields,
        { upsert: true, new: true }
      );

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

    console.log('💰 Création de ventes de test (30 derniers jours)...');
    const existingSale = await OrderTracking.findOne({ type: 'commande_client', statut: 'livre_client' });
    if (!existingSale) {
      const salesSeed = [
        { reference: 'BSTY-PANT-001', couleur: 'noir', taille: 'M', quantite: 2, joursAvant: 3 },
        { reference: 'BSTY-CHEM-001', couleur: 'blanc', taille: 'S', quantite: 1, joursAvant: 8 },
        { reference: 'BSTY-CHAU-001', couleur: 'blanc', taille: '40', quantite: 3, joursAvant: 15 },
      ];
      for (const sale of salesSeed) {
        const product = await Product.findOne({ reference: sale.reference });
        if (!product) continue;
        await OrderTracking.create({
          product_id: product._id,
          couleur: sale.couleur,
          taille: sale.taille,
          type: 'commande_client',
          statut: 'livre_client',
          quantite: sale.quantite,
          date_maj: new Date(Date.now() - sale.joursAvant * 24 * 60 * 60 * 1000),
        });
      }
      console.log('✓ Ventes de test créées');
    } else {
      console.log('⚠️ Des ventes existent déjà, skipping');
    }

    console.log('📋 Seed des listes de valeurs (couleur/taille/matière)...');
    const listOptions: { type: 'couleur' | 'taille' | 'matiere'; valeur: string }[] = [
      ...['Noir', 'Blanc', 'Bleu', 'Rouge', 'Gris', 'Beige', 'Marron', 'Vert'].map((v) => ({ type: 'couleur' as const, valeur: v })),
      ...['XS', 'S', 'M', 'L', 'XL', 'XXL', '38', '39', '40', '41', '42', '43', '44'].map((v) => ({ type: 'taille' as const, valeur: v })),
      ...['Coton', 'Lin', 'Soie', 'Denim', 'Cuir', 'Laine', 'Polyester'].map((v) => ({ type: 'matiere' as const, valeur: v })),
    ];
    for (const opt of listOptions) {
      await ListOption.findOneAndUpdate(opt, opt, { upsert: true });
    }
    console.log('✓ Listes de valeurs prêtes');

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
