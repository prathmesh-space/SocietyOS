import mongoose from 'mongoose';
import { runWithTenantContext } from './src/lib/tenant/context';
import Unit from './src/models/Unit';
require('dotenv').config({path: '.env.local'});

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const societyId = '6a589b63a2acbf3ff60817f5'; // the admin's society
  
  await runWithTenantContext({ societyId, role: 'admin' }, async () => {
    try {
      const units = await Unit.find({ active: true })
        .populate('primaryResidentId', 'name email phone')
        .sort({ unitNumber: 1 })
        .skip(0)
        .limit(100)
        .lean();
        
      console.log('UNITS FOUND:', units.length);
      console.log(units[0]);
    } catch(e) {
      console.error(e);
    }
  });
  
  process.exit(0);
}

main();
