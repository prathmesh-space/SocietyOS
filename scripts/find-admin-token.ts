import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';
import crypto from 'crypto';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

import Society from '../src/models/Society';
import User from '../src/models/User';

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('ERROR: MONGODB_URI is not set in .env.local');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  // 1. Find the society "Aditi Empire"
  const society = await Society.findOne({ name: 'Aditi Empire' }).lean();
  if (!society) {
    console.error('Society "Aditi Empire" not found.');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Found Society: ${society.name} (ID: ${society._id}, Active: ${society.active})`);

  // 2. Find the admin user
  const admin = await User.findOne({ societyId: society._id, role: 'admin' })
    .select('+activationToken +activationTokenExpires +passwordHash')
    .setOptions({ unscoped: true });

  if (!admin) {
    console.error(`No admin user found for society "${society.name}".`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('\n--- Admin User Found ---');
  console.log(`Name: ${admin.name}`);
  console.log(`Email: ${admin.email}`);
  console.log(`Status: ${admin.status}`);
  console.log(`Hashed Activation Token in DB: ${admin.activationToken}`);
  console.log(`Token Expires: ${admin.activationTokenExpires}`);

  // 3. Generate a new activation token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  admin.activationToken = hashedToken;
  admin.activationTokenExpires = tokenExpiry;
  await admin.save();

  console.log('\n--- Generated New Activation Token ---');
  console.log(`Raw Activation Token: ${rawToken}`);
  console.log(`Activation Link: http://localhost:3000/activate?token=${rawToken}`);
  console.log('\nYou can use this token to activate the account via the POST API or use the link if you implement the page!');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
