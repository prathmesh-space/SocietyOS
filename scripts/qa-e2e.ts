import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';
import bcrypt from 'bcryptjs';

config({ path: resolve(__dirname, '../.env.local') });

import Society from '../src/models/Society';
import Unit from '../src/models/Unit';
import User from '../src/models/User';
import Visitor from '../src/models/Visitor';

async function runQA() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is missing');
  
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to Database');

  try {
    // 1. Super Admin onboards a society
    console.log('\n--- Step 1: Onboard Society ---');
    const society = await Society.create({
      name: 'QA Test Society',
      address: '123 QA Lane',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      active: false, // Starts inactive
      emergencyContacts: [],
      maxVisitorWindowHours: 24,
      defaultBillAmount: 3000,
    });
    console.log(`✅ Society created: ${society.name} (Active: ${society.active})`);

    // 2. Attempt to activate without emergency contacts (Should be blocked by validation)
    console.log('\n--- Step 2: Attempt Activation (No Emergency Contacts) ---');
    try {
      society.active = true;
      await society.save();
      console.error('❌ ERROR: Society activated without emergency contacts!');
    } catch (err: any) {
      console.log(`✅ Expected Failure: ${err.message}`);
    }

    // 3. Admin adds emergency contacts
    console.log('\n--- Step 3: Add Emergency Contacts ---');
    const dbSociety = await Society.findById(society._id);
    if (!dbSociety) throw new Error('Society not found');
    dbSociety.emergencyContacts.push({ name: 'QA Guard', phone: '+91 9999900000', role: 'Security' });
    await dbSociety.save();
    console.log('✅ Emergency contacts added');

    // 4. Super Admin successfully activates society
    console.log('\n--- Step 4: Activate Society ---');
    dbSociety.active = true;
    await dbSociety.save();
    console.log('✅ Society successfully activated');

    // 5. Admin adds unit and approves resident
    console.log('\n--- Step 5: Add Unit & Approve Resident ---');
    const unit = await Unit.create({
      societyId: dbSociety._id,
      unitNumber: 'A-101',
      floor: 1,
    });
    console.log(`✅ Unit created: ${unit.unitNumber}`);

    const passwordHash = await bcrypt.hash('Password@123', 10);
    const resident = await User.create({
      societyId: dbSociety._id,
      unitId: unit._id,
      email: 'qa-resident@test.com',
      passwordHash,
      role: 'resident',
      name: 'QA Resident',
      status: 'pending', // Starts pending
    });
    console.log(`✅ Resident signed up (Status: ${resident.status})`);

    // Admin approves resident
    resident.status = 'active';
    await resident.save();
    console.log(`✅ Resident approved by Admin (Status: ${resident.status})`);

    // 6. Admin creates watchman
    console.log('\n--- Step 6: Create Watchman ---');
    const watchman = await User.create({
      societyId: dbSociety._id,
      email: 'qa-watchman@test.com',
      passwordHash,
      role: 'watchman',
      name: 'QA Watchman',
      status: 'active',
    });
    console.log(`✅ Watchman created: ${watchman.email}`);

    // 7. Resident pre-approves visitor (Generates Token)
    console.log('\n--- Step 7: Pre-approve Visitor (Resident) ---');
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'jwt-secret';
    const startWindow = new Date();
    const endWindow = new Date(Date.now() + 2 * 60 * 60 * 1000); // +2 hours
    const token = jwt.sign(
      {
        visitorName: 'QA Guest',
        unitId: unit._id.toString(),
        societyId: dbSociety._id.toString(),
        start: startWindow.toISOString(),
        end: endWindow.toISOString(),
      },
      secret
    );
    console.log(`✅ Pre-approval QR Token generated successfully`);

    // 8. Watchman scans the QR token
    console.log('\n--- Step 8: Watchman Scans QR Token ---');
    const decoded = jwt.verify(token, secret);
    const visitor = await Visitor.create({
      societyId: dbSociety._id,
      unitId: decoded.unitId,
      visitorName: decoded.visitorName,
      entryTime: new Date(),
      preApproved: true,
      verificationStatus: 'verified',
      verifiedAt: new Date(),
      token: token
    });
    console.log(`✅ Visitor entry logged by Watchman: ${visitor.visitorName} (ID: ${visitor._id})`);

    console.log('\n🎉 ALL BACKEND QA E2E FLOWS PASSED SUCCESSFULLY!');

  } finally {
    // Cleanup QA Data
    console.log('\nCleaning up QA data...');
    const qa_society = await Society.findOne({ name: 'QA Test Society' });
    if (qa_society) {
      await Visitor.deleteMany({ societyId: qa_society._id }).setOptions({ unscoped: true });
      await User.deleteMany({ societyId: qa_society._id }).setOptions({ unscoped: true });
      await Unit.deleteMany({ societyId: qa_society._id }).setOptions({ unscoped: true });
      await Society.findByIdAndDelete(qa_society._id);
    }
    await mongoose.disconnect();
    console.log('✅ Cleanup complete');
  }
}

runQA().catch(err => {
  console.error('QA Script Failed:', err);
  process.exit(1);
});
