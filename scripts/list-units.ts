import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

import Society from '../src/models/Society';
import Unit from '../src/models/Unit';

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('ERROR: MONGODB_URI is not set in .env.local');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  // Find "Aditi Empire"
  const society = await Society.findOne({ name: 'Aditi Empire' }).lean();
  if (!society) {
    console.error('Society "Aditi Empire" not found.');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Society: ${society.name} (ID: ${society._id})`);

  // Find units
  let units = await Unit.find({ societyId: society._id }).lean().setOptions({ unscoped: true });
  
  if (units.length === 0) {
    console.log('No units found for Aditi Empire. Creating a default unit A-101...');
    const newUnit = await Unit.create({
      societyId: society._id,
      unitNumber: 'A-101',
      floor: 1,
    });
    console.log(`Created Unit: ${newUnit.unitNumber} (ID: ${newUnit._id})`);
    units = [newUnit.toJSON() as any];
  } else {
    console.log('\n--- Units Found ---');
    units.forEach(u => {
      console.log(`Unit Number: ${u.unitNumber} (ID: ${u._id})`);
    });
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
