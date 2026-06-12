import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encryptString } from '../utils/crypto.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const COLLECTION_TOKEN_PATHS = {
  organizations: [
    'integrations.google.accessToken',
    'integrations.google.refreshToken',
    'integrations.googleChat.accessToken',
    'integrations.googleChat.refreshToken',
    'integrations.microsoft.accessToken',
    'integrations.microsoft.refreshToken',
  ],
  users: ['google.accessToken', 'google.refreshToken'],
  integrationconnections: [
    'auth.accessToken',
    'auth.refreshToken',
    'credentials.accessTokenEncrypted',
    'credentials.refreshTokenEncrypted',
  ],
};

function getNestedValue(document, dottedPath) {
  return dottedPath.split('.').reduce((value, key) => value?.[key], document);
}

async function encryptCollection(db, collectionName, tokenPaths) {
  const collection = db.collection(collectionName);
  const cursor = collection.find({
    $or: tokenPaths.map((tokenPath) => ({ [tokenPath]: { $exists: true, $nin: ['', null] } })),
  });
  let updatedDocuments = 0;
  let updatedTokens = 0;

  for await (const document of cursor) {
    const updates = {};
    for (const tokenPath of tokenPaths) {
      const value = getNestedValue(document, tokenPath);
      if (typeof value !== 'string' || !value || value.startsWith('enc:gcm:')) continue;
      updates[tokenPath] = encryptString(value);
      updatedTokens += 1;
    }

    if (Object.keys(updates).length > 0) {
      await collection.updateOne({ _id: document._id }, { $set: updates });
      updatedDocuments += 1;
    }
  }

  return { collectionName, updatedDocuments, updatedTokens };
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  if (!process.env.TOKEN_ENCRYPTION_KEY) throw new Error('TOKEN_ENCRYPTION_KEY is required');

  await mongoose.connect(process.env.MONGO_URI);
  try {
    const results = [];
    for (const [collectionName, tokenPaths] of Object.entries(COLLECTION_TOKEN_PATHS)) {
      results.push(await encryptCollection(mongoose.connection.db, collectionName, tokenPaths));
    }
    console.table(results);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('[encrypt-existing-tokens] Migration failed:', error.message);
  process.exit(1);
});
