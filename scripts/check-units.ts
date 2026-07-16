import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

import Unit from '../src/models/Unit';
import Society from '../src/models/Society';

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('ERROR: MONGODB_URI is not set in .env.local');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  const society = await Society.findOne({ name: 'Aditi Empire' }).lean();
  if (!society) {
    console.log('Aditi Empire not found');
    await mongoose.disconnect();
    return;
  }

  console.log(`Society ID: ${society._id}`);
  
  const allUnits = await Unit.find({ societyId: society._id }).lean().setOptions({ unscoped: true });
  console.log('\n--- All Units for Aditi Empire ---');
  console.log(JSON.stringify(allUnits, null, 2));

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
