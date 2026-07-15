import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import dbConnect from '../src/lib/db/connection';
import Visitor from '../src/models/Visitor';
import User from '../src/models/User';
import Unit from '../src/models/Unit';
import { runWithTenantContext } from '../src/lib/tenant/context';

async function test() {
  await dbConnect();
  console.log('Connected');
  
  const unit = await Unit.findOne().setOptions({ unscoped: true });
  const societyId = unit.societyId;
  console.log('Testing with societyId:', societyId);

  await runWithTenantContext({ userId: new mongoose.Types.ObjectId().toString(), role: 'watchman', societyId: societyId.toString() }, async () => {
    try {
      console.log('Executing query...');
      const visitors = await Visitor.find({
        entryTime: { $ne: null },
        exitTime: null,
      })
        .populate('unitId', 'unitNumber floor')
        .sort({ entryTime: -1 })
        .lean();
      console.log('Query successful, visitors:', visitors.length);
    } catch (err: any) {
      console.error('Query failed:', err.stack);
    }
  });

  await mongoose.disconnect();
}

test().catch(console.error);
