import { v2 as cloudinary } from 'cloudinary';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error('Service d\'upload non configuré (variables Cloudinary manquantes)');
  }
  cloudinary.config({ cloud_name, api_key, api_secret });
  configured = true;
}

export function uploadImage(buffer: Buffer): Promise<string> {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'be-styled/products' },
      (error, result) => {
        if (error || !result) return reject(error || new Error('Échec du téléversement'));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}
