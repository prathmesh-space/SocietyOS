import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

import { GET as listUnitsHandler } from '../src/app/api/admin/units/route';
import { signAccessToken } from '../src/lib/auth/jwt';
import User from '../src/models/User';
import Society from '../src/models/Society';

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('ERROR: MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  // Find Admin
  const admin = await User.findOne({ email: 'prathmeshkumbhar33@gmail.com' }).setOptions({ unscoped: true });
  if (!admin) {
    console.error('Admin user not found');
    await mongoose.disconnect();
    process.exit(1);
  }

  const token = signAccessToken({
    userId: admin._id.toString(),
    role: 'admin',
    societyId: admin.societyId ? admin.societyId.toString() : null,
  });

  console.log(`Generated Admin Token: ${token}`);

  const req = new NextRequest('http://localhost/api/admin/units?limit=100', {
    method: 'GET',
    headers: {
      'authorization': `Bearer ${token}`,
    },
  });

  const res = await listUnitsHandler(req, {} as any);
  console.log(`Response Status: ${res.status}`);
  const body = await res.json();
  console.log('\n--- Response Body ---');
  console.log(JSON.stringify(body, null, 2));

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
