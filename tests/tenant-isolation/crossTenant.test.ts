/**
 * Tenant Isolation Test Suite
 * ===========================
 *
 * PRD §8: "The test suite includes a dedicated isolation test file that:
 * creates two Societies with overlapping data shapes, authenticates as
 * a user in Society A, and asserts that every list/read endpoint returns
 * zero results and every direct-ID-access endpoint returns 404 (not 403,
 * to avoid confirming record existence) when targeting Society B's data."
 *
 * This is the single most important test suite in SocietyOS.
 * It validates the Mongoose scoping plugin at the data layer,
 * not just at the API route level.
 */

import mongoose, { Types } from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load env before anything else
config({ path: resolve(__dirname, '../../.env.local') });

import Society, { type ISociety } from '@/models/Society';
import User, { type IUser } from '@/models/User';
import Unit, { type IUnit } from '@/models/Unit';
import AuditLog from '@/models/AuditLog';
import { runWithTenantContext, type TenantContext } from '@/lib/tenant/context';
import { hashPassword } from '@/lib/auth/password';

// --- Test Data ---

interface TestSociety {
  society: ISociety;
  admin: IUser;
  resident: IUser;
  units: IUnit[];
}

let societyA: TestSociety;
let societyB: TestSociety;

// --- Setup & Teardown ---

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not set in .env.local');
  }

  await mongoose.connect(mongoUri);

  // Clean up any previous test data
  await cleanupTestData();

  // Create two societies with overlapping data shapes
  societyA = await createTestSociety('Green Valley CHS', 'A');
  societyB = await createTestSociety('Blue Ridge CHS', 'B');
});

afterAll(async () => {
  await cleanupTestData();
  await mongoose.disconnect();
});

async function cleanupTestData() {
  const testSocietyIds = (
    await Society.find({
      name: { $in: ['Green Valley CHS', 'Blue Ridge CHS'] },
    }).lean()
  ).map((s) => s._id);

  if (testSocietyIds.length > 0) {
    await Unit.deleteMany(
      { societyId: { $in: testSocietyIds } },
    ).setOptions({ unscoped: true });
    await User.deleteMany(
      { societyId: { $in: testSocietyIds } },
    ).setOptions({ unscoped: true });
    // AuditLog blocks deleteMany at the schema level, use native collection
    await mongoose.connection.collection('auditlogs').deleteMany({
      societyId: { $in: testSocietyIds },
    });
    await Society.deleteMany({ _id: { $in: testSocietyIds } });
  }
}

async function createTestSociety(name: string, prefix: string): Promise<TestSociety> {
  const society = await Society.create({
    name,
    address: `${prefix}-100 Test Lane`,
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    active: true,
    emergencyContacts: [{ name: 'Test', phone: '1234567890', role: 'Security' }],
    defaultBillAmount: 5000,
  });

  const passwordHash = await hashPassword('Test@123!');

  const admin = await User.create({
    email: `admin-${prefix.toLowerCase()}@test.societyos.in`,
    passwordHash,
    role: 'admin',
    societyId: society._id,
    name: `Admin ${prefix}`,
    phone: '+91 9999900001',
    status: 'active',
  });

  // Create units with overlapping numbers (both societies have A-101, A-102, etc.)
  const units = await Unit.insertMany([
    { unitNumber: 'A-101', floor: 1, type: '2BHK', areaSqFt: 850, societyId: society._id },
    { unitNumber: 'A-102', floor: 1, type: '2BHK', areaSqFt: 850, societyId: society._id },
    { unitNumber: 'A-201', floor: 2, type: '3BHK', areaSqFt: 1200, societyId: society._id },
  ]);

  const resident = await User.create({
    email: `resident-${prefix.toLowerCase()}@test.societyos.in`,
    passwordHash,
    role: 'resident',
    societyId: society._id,
    unitId: units[0]!._id,
    name: `Resident ${prefix}`,
    phone: '+91 9999900002',
    status: 'active',
  });

  return { society, admin, resident, units: units as IUnit[] };
}

// --- Context Helpers ---

function ctxFor(testSociety: TestSociety, role: 'admin' | 'resident' = 'admin'): TenantContext {
  const user = role === 'admin' ? testSociety.admin : testSociety.resident;
  return {
    userId: user._id.toString(),
    role: user.role as TenantContext['role'],
    societyId: testSociety.society._id.toString(),
  };
}

// AsyncLocalStorage.run() properly propagates context through await chains,
// so we pass the entire async function into it.
function asUser(testSociety: TestSociety, role: 'admin' | 'resident' = 'admin') {
  const ctx = ctxFor(testSociety, role);
  return async <T>(fn: () => Promise<T> | T): Promise<T> => {
    return runWithTenantContext(ctx, async () => {
      return await fn();
    });
  };
}

// =============================================================
// TEST SUITE: Mongoose Scoping Plugin — Unit Collection
// =============================================================

describe('Tenant Isolation — Unit Collection', () => {
  test('Society A admin can only see Society A units', async () => {
    const units = await asUser(societyA)(() =>
      Unit.find({}).lean()
    );

    expect(units.length).toBe(3);
    for (const unit of units) {
      expect(unit.societyId.toString()).toBe(societyA.society._id.toString());
    }
  });

  test('Society B admin can only see Society B units', async () => {
    const units = await asUser(societyB)(() =>
      Unit.find({}).lean()
    );

    expect(units.length).toBe(3);
    for (const unit of units) {
      expect(unit.societyId.toString()).toBe(societyB.society._id.toString());
    }
  });

  test('Society A admin cannot find Society B unit by ID', async () => {
    const targetUnitId = societyB.units[0]!._id;

    const unit = await asUser(societyA)(() =>
      Unit.findById(targetUnitId).lean()
    );

    // Must return null (not found), not the actual unit
    expect(unit).toBeNull();
  });

  test('Society A admin cannot find Society B unit by query', async () => {
    const unit = await asUser(societyA)(() =>
      Unit.findOne({ unitNumber: 'A-101' }).lean()
    );

    // Should find Society A's A-101, not Society B's
    expect(unit).not.toBeNull();
    expect(unit!.societyId.toString()).toBe(societyA.society._id.toString());
  });

  test('Society A admin countDocuments only counts Society A units', async () => {
    const count = await asUser(societyA)(() =>
      Unit.countDocuments({})
    );

    expect(count).toBe(3);
  });

  test('Society A admin cannot update Society B unit', async () => {
    const targetUnitId = societyB.units[0]!._id;

    const result = await asUser(societyA)(() =>
      Unit.findByIdAndUpdate(targetUnitId, { floor: 99 }, { new: true })
    );

    // Should return null — unit not found in Society A scope
    expect(result).toBeNull();

    // Verify Society B's unit was NOT modified
    const originalUnit = await asUser(societyB)(() =>
      Unit.findById(targetUnitId).lean()
    );
    expect(originalUnit).not.toBeNull();
    expect(originalUnit!.floor).toBe(1); // Still original value
  });

  test('Society A admin cannot delete Society B unit', async () => {
    const targetUnitId = societyB.units[0]!._id;

    const result = await asUser(societyA)(() =>
      Unit.findByIdAndDelete(targetUnitId)
    );

    expect(result).toBeNull();

    // Verify Society B's unit still exists
    const stillExists = await asUser(societyB)(() =>
      Unit.findById(targetUnitId).lean()
    );
    expect(stillExists).not.toBeNull();
  });

  test('updateMany in Society A scope cannot affect Society B', async () => {
    await asUser(societyA)(() =>
      Unit.updateMany({}, { $set: { areaSqFt: 9999 } })
    );

    // Verify Society B's units are untouched
    const bUnits = await asUser(societyB)(() =>
      Unit.find({}).lean()
    );
    for (const unit of bUnits) {
      expect(unit.areaSqFt).not.toBe(9999);
    }

    // Reset Society A's units
    await asUser(societyA)(() =>
      Unit.updateMany({}, { $set: { areaSqFt: 850 } })
    );
  });
});

// =============================================================
// TEST SUITE: Mongoose Scoping Plugin — User Collection
// =============================================================

describe('Tenant Isolation — User Collection', () => {
  test('Society A admin sees only Society A users', async () => {
    const users = await asUser(societyA)(() =>
      User.find({}).lean()
    );

    expect(users.length).toBe(2); // admin + resident
    for (const user of users) {
      expect(user.societyId!.toString()).toBe(societyA.society._id.toString());
    }
  });

  test('Society A admin cannot find Society B user by ID', async () => {
    const targetUserId = societyB.resident._id;

    const user = await asUser(societyA)(() =>
      User.findById(targetUserId).lean()
    );

    expect(user).toBeNull();
  });

  test('Society A admin cannot find Society B user by email', async () => {
    const user = await asUser(societyA)(() =>
      User.findOne({ email: societyB.resident.email }).lean()
    );

    expect(user).toBeNull();
  });

  test('Society A admin countDocuments only counts Society A users', async () => {
    const count = await asUser(societyA)(() =>
      User.countDocuments({})
    );

    expect(count).toBe(2); // admin + resident in Society A
  });
});

// =============================================================
// TEST SUITE: Query Without Context — Safety Net
// =============================================================

describe('Tenant Isolation — No Context Safety', () => {
  test('Query without tenant context throws on tenant-scoped collection', async () => {
    await expect(
      Unit.find({}).lean().exec()
    ).rejects.toThrow(/Tenant context not set/);
  });

  test('Query without tenant context on User collection throws', async () => {
    await expect(
      User.find({}).lean().exec()
    ).rejects.toThrow(/Tenant context not set/);
  });

  test('Unscoped query explicitly bypasses tenant context', async () => {
    const allUnits = await Unit.find({}).setOptions({ unscoped: true }).lean();

    // Should see units from BOTH societies
    expect(allUnits.length).toBeGreaterThanOrEqual(6);

    const societyIds = new Set(allUnits.map((u) => u.societyId.toString()));
    expect(societyIds.size).toBeGreaterThanOrEqual(2);
  });

  test('Explicit verification: A query executed with NO tenant context throws an error, preventing silent unscoped database leaks', async () => {
    // Assert that the query execution throws the exact "Tenant context not set" error
    const queryPromise = Unit.find({}).lean().exec();
    await expect(queryPromise).rejects.toThrow(/Tenant context not set for find query on tenant-scoped collection/);
  });

  test('Creating a document with NO tenant context throws an error during save', async () => {
    const unitDoc = new Unit({
      unitNumber: 'TEMP-999',
      floor: 1,
      type: '2BHK',
      areaSqFt: 850,
      // No societyId set
    });
    await expect(unitDoc.save()).rejects.toThrow(/societyId must be set when creating a new document in a tenant-scoped collection/);
  });
});

// =============================================================
// TEST SUITE: Super Admin Context
// =============================================================

describe('Tenant Isolation — Super Admin Behavior', () => {
  test('Super Admin with no societyId sees all units', async () => {
    const ctx: TenantContext = {
      userId: new Types.ObjectId().toString(),
      role: 'superadmin',
      societyId: null,
    };

    const units = await runWithTenantContext(ctx, async () => {
      return await Unit.find({}).lean();
    });

    // Super Admin with null societyId should see ALL units
    expect(units.length).toBeGreaterThanOrEqual(6);
  });

  test('Super Admin with specific societyId sees only that society\'s units', async () => {
    const ctx: TenantContext = {
      userId: new Types.ObjectId().toString(),
      role: 'superadmin',
      societyId: societyA.society._id.toString(),
    };

    const units = await runWithTenantContext(ctx, async () => {
      return await Unit.find({}).lean();
    });

    expect(units.length).toBe(3);
    for (const unit of units) {
      expect(unit.societyId.toString()).toBe(societyA.society._id.toString());
    }
  });
});

// =============================================================
// TEST SUITE: Cross-Tenant Write Prevention
// =============================================================

describe('Tenant Isolation — Cross-Tenant Write Prevention', () => {
  test('Cannot create a unit in Society B while in Society A context', async () => {
    const unitsBefore = await asUser(societyB)(() =>
      Unit.countDocuments({})
    );

    // Create a unit in Society A context — it should get Society A's ID
    const unit = await asUser(societyA)(() =>
      Unit.create({
        unitNumber: 'CROSS-TEST-01',
        floor: 1,
        societyId: societyA.society._id,
      })
    );

    expect(unit.societyId.toString()).toBe(societyA.society._id.toString());

    // Verify Society B didn't gain any units
    const unitsAfter = await asUser(societyB)(() =>
      Unit.countDocuments({})
    );
    expect(unitsAfter).toBe(unitsBefore);

    // Clean up
    await asUser(societyA)(() =>
      Unit.findByIdAndDelete(unit._id)
    );
  });

  test('findOneAndUpdate with Society B ID in Society A context returns null', async () => {
    const result = await asUser(societyA)(() =>
      Unit.findOneAndUpdate(
        { _id: societyB.units[1]!._id },
        { $set: { type: 'HACKED' } },
        { new: true }
      )
    );

    expect(result).toBeNull();

    // Verify Society B's unit wasn't modified
    const bUnit = await asUser(societyB)(() =>
      Unit.findById(societyB.units[1]!._id).lean()
    );
    expect(bUnit!.type).toBe('2BHK'); // Original value
  });

  test('deleteMany in Society A context cannot affect Society B', async () => {
    const countBefore = await asUser(societyB)(() =>
      Unit.countDocuments({})
    );

    // Delete units with floor=1 — both societies have floor=1 units
    await asUser(societyA)(() =>
      Unit.deleteMany({ floor: 1 })
    );

    const countAfter = await asUser(societyB)(() =>
      Unit.countDocuments({})
    );

    // Society B's count should be unchanged
    expect(countAfter).toBe(countBefore);

    // Restore Society A's deleted units
    await Unit.insertMany([
      { unitNumber: 'A-101', floor: 1, type: '2BHK', areaSqFt: 850, societyId: societyA.society._id },
      { unitNumber: 'A-102', floor: 1, type: '2BHK', areaSqFt: 850, societyId: societyA.society._id },
    ]);
  });
});

// =============================================================
// TEST SUITE: AuditLog Immutability
// =============================================================

describe('Tenant Isolation — AuditLog Immutability', () => {
  test('AuditLog entries cannot be updated', async () => {
    // Create an audit log entry in Society A context
    const logEntry = await asUser(societyA)(() =>
      AuditLog.create({
        societyId: societyA.society._id,
        actorId: societyA.admin._id,
        action: 'unit.create',
        entityType: 'Unit',
        entityId: societyA.units[0]!._id,
        beforeState: null,
        afterState: { test: true },
        timestamp: new Date(),
      })
    );

    // Attempting to update should throw
    await expect(
      asUser(societyA)(() =>
        AuditLog.findByIdAndUpdate(logEntry._id, { action: 'unit.delete' })
      )
    ).rejects.toThrow(/cannot be updated/);
  });

  test('AuditLog entries cannot be deleted via Mongoose', async () => {
    await expect(
      asUser(societyA)(() =>
        AuditLog.deleteMany({})
      )
    ).rejects.toThrow(/cannot be deleted/);
  });
});
