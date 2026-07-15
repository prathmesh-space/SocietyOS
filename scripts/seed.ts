import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';
import bcrypt from 'bcryptjs';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

import Society from '../src/models/Society';
import Unit from '../src/models/Unit';
import User from '../src/models/User';
import MaintenanceBill from '../src/models/MaintenanceBill';
import Payment from '../src/models/Payment';
import Complaint from '../src/models/Complaint';
import Notice from '../src/models/Notice';
import Visitor from '../src/models/Visitor';

async function seed() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('ERROR: MONGODB_URI is not set in .env.local');
    process.exit(1);
  }

  // PREVENT RUNNING AGAINST A TEST DATABASE
  const dbName = mongoUri.split('/').pop()?.split('?')[0] || '';
  if (
    mongoUri.toLowerCase().includes('test') ||
    dbName.toLowerCase() === 'test' ||
    dbName.toLowerCase().includes('test')
  ) {
    console.error(
      `ERROR: Connection string points to database "${dbName}" which looks like a test database. Refusing to run seed script to prevent data corruption or loss.`
    );
    process.exit(1);
  }

  console.log(`Connecting to MongoDB at: ${mongoUri.replace(/:[^:]+@/, ':****@')}`);
  await mongoose.connect(mongoUri);

  const demoSocietyNames = ['Demo Lotus CHS', 'Demo Sunflower Heights', 'Demo Rose Garden'];

  console.log('Cleaning up existing demo society data...');
  const existingSocieties = await Society.find({ name: { $in: demoSocietyNames } }).lean();
  const existingIds = existingSocieties.map((s) => s._id);

  if (existingIds.length > 0) {
    await Visitor.deleteMany({ societyId: { $in: existingIds } }).setOptions({ unscoped: true });
    await Notice.deleteMany({ societyId: { $in: existingIds } }).setOptions({ unscoped: true });
    await Complaint.deleteMany({ societyId: { $in: existingIds } }).setOptions({ unscoped: true });
    await Payment.deleteMany({ societyId: { $in: existingIds } }).setOptions({ unscoped: true });
    await MaintenanceBill.deleteMany({ societyId: { $in: existingIds } }).setOptions({ unscoped: true });
    await User.deleteMany({ societyId: { $in: existingIds } }).setOptions({ unscoped: true });
    await Unit.deleteMany({ societyId: { $in: existingIds } }).setOptions({ unscoped: true });
    await mongoose.connection.collection('auditlogs').deleteMany({ societyId: { $in: existingIds } });
    await Society.deleteMany({ _id: { $in: existingIds } });
  }

  console.log('Creating demo societies...');

  // Society 1: Fully configured, active, 2 emergency contacts
  const passwordHash = await bcrypt.hash('DemoPassword@123', 10);

  const soc1 = await Society.create({
    name: 'Demo Lotus CHS',
    address: '101 Lotus Marg, Sector 4',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    active: true,
    emergencyContacts: [
      { name: 'Lotus Main Gate Guard', phone: '+91 9999911111', role: 'Security' },
      { name: 'Lotus Plumber (Shyam)', phone: '+91 9888822222', role: 'Plumbing' },
    ],
    maxVisitorWindowHours: 24,
    defaultBillAmount: 3000,
  });

  // Society 2: Active, 1 emergency contact
  const soc2 = await Society.create({
    name: 'Demo Sunflower Heights',
    address: '405 Sunflower Road, Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400050',
    active: true,
    emergencyContacts: [
      { name: 'Sunflower Facility Manager', phone: '+91 9777733333', role: 'Management' },
    ],
    maxVisitorWindowHours: 12,
    defaultBillAmount: 4500,
  });

  // Society 3: Inactive, no emergency contacts (demos activation guard)
  const soc3 = await Society.create({
    name: 'Demo Rose Garden',
    address: 'Rose Garden Lane, Pune',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    active: false,
    emergencyContacts: [],
    maxVisitorWindowHours: 24,
    defaultBillAmount: 2500,
  });

  console.log('Societies created successfully.');

  // Create Units for Lotus CHS
  const unitsSoc1 = await Unit.create([
    { unitNumber: 'Flat 101', floor: 1, societyId: soc1._id },
    { unitNumber: 'Flat 102', floor: 1, societyId: soc1._id },
    { unitNumber: 'Flat 201', floor: 2, societyId: soc1._id },
    { unitNumber: 'Flat 202', floor: 2, societyId: soc1._id },
  ]);

  // Create Users for Lotus CHS
  const adminSoc1 = await User.create({
    email: 'admin-lotus@demo.societyos.in',
    passwordHash,
    role: 'admin',
    societyId: soc1._id,
    name: 'Lotus Admin (Rajesh)',
    status: 'active',
  });

  const watchmanSoc1 = await User.create({
    email: 'watch-lotus@demo.societyos.in',
    passwordHash,
    role: 'watchman',
    societyId: soc1._id,
    name: 'Lotus Watchman (Bahadur)',
    status: 'active',
  });

  // Resident 1: Active
  const res1 = await User.create({
    email: 'resident-res1@demo.societyos.in',
    passwordHash,
    role: 'resident',
    societyId: soc1._id,
    unitId: unitsSoc1[0]._id,
    name: 'Amit Sharma',
    status: 'active',
  });
  unitsSoc1[0].primaryResidentId = res1._id;
  await unitsSoc1[0].save();

  // Resident 2: Pending admin approval
  const res2 = await User.create({
    email: 'resident-res2@demo.societyos.in',
    passwordHash,
    role: 'resident',
    societyId: soc1._id,
    unitId: unitsSoc1[1]._id,
    name: 'Pooja Patel',
    status: 'pending',
  });

  // Resident 3: Active
  const res3 = await User.create({
    email: 'resident-res3@demo.societyos.in',
    passwordHash,
    role: 'resident',
    societyId: soc1._id,
    unitId: unitsSoc1[2]._id,
    name: 'Vikram Singh',
    status: 'active',
  });
  unitsSoc1[2].primaryResidentId = res3._id;
  await unitsSoc1[2].save();

  console.log('Users and units created for Society 1.');

  // Create Bills for Amit (Flat 101)
  // Bill 1: Paid in June
  const billPaid = await MaintenanceBill.create({
    societyId: soc1._id,
    unitId: unitsSoc1[0]._id,
    billingPeriod: '2026-06',
    amount: 3000,
    dueDate: new Date('2026-06-25'),
    status: 'Paid',
    lateFeeApplied: false,
  });

  await Payment.create({
    societyId: soc1._id,
    billId: billPaid._id,
    unitId: unitsSoc1[0]._id,
    amount: 3000,
    status: 'captured',
    razorpayOrderId: 'order_demo666',
    razorpayPaymentId: 'pay_demo666_captured',
    verifiedAt: new Date('2026-06-20'),
  });

  // Bill 2: Unpaid in July
  await MaintenanceBill.create({
    societyId: soc1._id,
    unitId: unitsSoc1[0]._id,
    billingPeriod: '2026-07',
    amount: 3000,
    dueDate: new Date('2026-07-25'),
    status: 'Unpaid',
    lateFeeApplied: false,
  });

  // Bill 3: Overdue from May (with late fee applied)
  await MaintenanceBill.create({
    societyId: soc1._id,
    unitId: unitsSoc1[0]._id,
    billingPeriod: '2026-05',
    amount: 3060, // 3000 + 60 late fee
    dueDate: new Date('2026-05-25'),
    status: 'Overdue',
    lateFeeApplied: true,
    lateFeeAmount: 60,
  });

  console.log('Maintenance bills and payments created.');

  // Create Complaints for Lotus CHS
  await Complaint.create([
    {
      societyId: soc1._id,
      unitId: unitsSoc1[0]._id,
      residentId: res1._id,
      category: 'Plumbing',
      description: 'Major leakage in the kitchen sink drainage pipe.',
      status: 'Open',
    },
    {
      societyId: soc1._id,
      unitId: unitsSoc1[2]._id,
      residentId: res3._id,
      assignedAdminId: adminSoc1._id,
      category: 'Electrical',
      description: 'Corridor tube light outside Flat 201 is flickering.',
      status: 'In Progress',
    },
    {
      societyId: soc1._id,
      unitId: unitsSoc1[0]._id,
      residentId: res1._id,
      assignedAdminId: adminSoc1._id,
      category: 'Security',
      description: 'Unknown delivery bike parked in slot 101.',
      status: 'Resolved',
      resolutionNote: 'Guard spoke to delivery boy; vehicle was moved.',
    },
  ]);

  console.log('Complaints created.');

  // Create Notices
  // Notice 1: Active
  await Notice.create({
    societyId: soc1._id,
    authorId: adminSoc1._id,
    title: 'Monthly Society General Body Meeting',
    body: 'All residents are requested to attend the monthly GBM scheduled on July 20th at 6:30 PM in the Clubhouse to discuss safety guidelines.',
    expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
  });

  // Notice 2: Expired
  await Notice.create({
    societyId: soc1._id,
    authorId: adminSoc1._id,
    title: 'Elevator Maintenance Work',
    body: 'Wing B lift will be shut down for preventive maintenance on July 2nd from 10:00 AM to 2:00 PM.',
    expiryDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
  });

  console.log('Notices created.');

  // Create Visitors
  await Visitor.create([
    {
      societyId: soc1._id,
      unitId: unitsSoc1[0]._id,
      visitorName: 'John Guest (PreApproved)',
      entryTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      preApproved: true,
      verifiedAt: new Date(),
      verificationStatus: 'verified',
    },
    {
      societyId: soc1._id,
      unitId: unitsSoc1[2]._id,
      visitorName: 'Zomato Delivery (Manual)',
      entryTime: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
      exitTime: new Date(Date.now() - 20 * 60 * 1000), // 20 mins ago
      preApproved: false,
      verificationStatus: 'unverified',
    },
  ]);

  console.log('Visitors created.');
  console.log('*** Demo data seeding complete successfully! ***');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding process encountered an error:', err);
  process.exit(1);
});
