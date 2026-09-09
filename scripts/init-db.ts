/**
 * Script pour initialiser la base de données avec des données test
 * Usage: npx ts-node scripts/init-db.ts
 */

import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import User from '../src/lib/models/User';
import Product from '../src/lib/models/Product';
import Stock from '../src/lib/models/Stock';

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zephyr-boutique';

async function initDB() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connecté à MongoDB');

    // Créer un admin utilisateur
    console.log('👤 Création de l\'admin utilisateur...');
    const hashedPassword = await bcryptjs.hash('Admin123!', 10);

    const adminUser = await User.findOneAndUpdate(
      { email: 'admin@zephyr.com' },
      {
        email: 'admin@zephyr.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'Zephyr',
        role: 'admin',
        permissions: ['all'],
        active: true,
      },
      { upsert: true, new: true }
    );

    console.log('✓ Admin créé:', adminUser.email);

    // Créer des produits de test
    console.log('📦 Création de produits de test...');
    const products = [
      {
        name: 'T-Shirt Classique Noir',
        description: 'T-shirt confortable 100% coton',
        category: 'clothing',
        subcategory: 'tops',
        price: 29.99,
        cost: 10.00,
        sku: 'TS-BLK-001',
        colors: ['noir', 'blanc', 'bleu'],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        material: '100% coton',
        brand: 'ZephyrWear',
        active: true,
      },
      {
        name: 'Robe Élégante',
        description: 'Robe de soirée élégante',
        category: 'clothing',
        subcategory: 'dresses',
        price: 89.99,
        cost: 35.00,
        sku: 'DRS-ELE-001',
        colors: ['noir', 'rouge', 'blanc'],
        sizes: ['XS', 'S', 'M', 'L'],
        material: '95% polyester, 5% élasthane',
        brand: 'ZephyrFashion',
        active: true,
      },
      {
        name: 'Collier en Or',
        description: 'Collier chaîne en or 18K',
        category: 'jewelry',
        subcategory: 'necklaces',
        price: 149.99,
        cost: 60.00,
        sku: 'NEC-GLD-001',
        colors: ['or'],
        sizes: ['unique'],
        material: 'Or 18K',
        brand: 'ZephyrJewels',
        active: true,
      },
      {
        name: 'Baskets Blanches',
        description: 'Baskets confortables et stylées',
        category: 'shoes',
        subcategory: 'sneakers',
        price: 79.99,
        cost: 30.00,
        sku: 'SHO-WTE-001',
        colors: ['blanc', 'noir', 'gris'],
        sizes: ['36', '37', '38', '39', '40', '41', '42', '43'],
        material: 'Toile + caoutchouc',
        brand: 'ZephyrShoes',
        active: true,
      },
      {
        name: 'Sac à Main Leather',
        description: 'Sac à main en cuir véritable',
        category: 'accessories',
        subcategory: 'bags',
        price: 119.99,
        cost: 45.00,
        sku: 'BAG-LEA-001',
        colors: ['noir', 'brun', 'rouge'],
        sizes: ['unique'],
        material: 'Cuir véritable',
        brand: 'ZephyrBags',
        active: true,
      },
    ];

    const createdProducts = await Product.insertMany(products, { ordered: false }).catch(
      (err) => {
        if (err.code === 11000) {
          console.log('⚠️ Produits déjà existants, skipping');
          return [];
        }
        throw err;
      }
    );

    console.log(`✓ ${createdProducts.length} produits créés`);

    // Créer des stocks pour chaque produit
    console.log('📊 Création des entrées stock...');
    const stocks = createdProducts.map((product) => ({
      productId: product._id,
      sku: product.sku,
      quantity: Math.floor(Math.random() * 100) + 10,
      minQuantity: 5,
      maxQuantity: 100,
      warehouse: 'Main',
      color: product.colors[0],
      size: product.sizes[0],
      status: 'in-stock',
    }));

    await Stock.insertMany(stocks).catch((err) => {
      if (err.code === 11000) {
        console.log('⚠️ Stocks déjà existants, skipping');
      }
    });

    console.log(`✓ ${stocks.length} entrées stock créées`);

    console.log('\n✨ Base de données initialisée avec succès!');
    console.log('\n📝 Identifiants de test:');
    console.log('  Email: admin@zephyr.com');
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
