import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Society from '@/models/Society';
import MaintenanceBill from '@/models/MaintenanceBill';
import { logAuditEvent } from '@/lib/audit/logger';

// POST /api/jobs/late-fees — Run the late-fee calculation job across all active societies
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Verify cron secret token if configured (skip for tests)
    if (
      cronSecret &&
      authHeader !== `Bearer ${cronSecret}` &&
      process.env.NODE_ENV !== 'test'
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Find all active societies (queries on Society are unscoped by default)
    const societies = await Society.find({ active: true }).lean();
    const batchResults = [];

    const now = new Date();

    for (const society of societies) {
      const rule = society.lateFeeRule || {
        type: 'percentage',
        value: 2,
        gracePeriodDays: 7,
      };

      const graceDays = rule.gracePeriodDays || 0;
      const feeValue = rule.value || 0;

      // Cut-off date: bills due before this date are past grace period
      const cutOffDate = new Date(now.getTime() - graceDays * 24 * 60 * 60 * 1000);

      // Find all unpaid bills past grace period that haven't had late fees applied yet.
      // Must use unscoped: true since this job runs across all societies system-wide.
      const eligibleBills = await MaintenanceBill.find({
        societyId: society._id,
        status: { $in: ['Unpaid', 'Overdue'] },
        dueDate: { $lt: cutOffDate },
        lateFeeApplied: false,
      }).setOptions({ unscoped: true });

      if (eligibleBills.length === 0) {
        continue;
      }

      let totalLateFeeAmount = 0;
      const modifiedBillIds = [];

      for (const bill of eligibleBills) {
        // Calculate fee
        const lateFee =
          rule.type === 'percentage'
            ? bill.amount * (feeValue / 100)
            : feeValue;

        // Apply fee and update status
        bill.lateFeeAmount = lateFee;
        bill.amount = bill.amount + lateFee;
        bill.lateFeeApplied = true;
        bill.status = 'Overdue';

        await bill.save();

        totalLateFeeAmount += lateFee;
        modifiedBillIds.push(bill._id.toString());
      }

      // Write a single summarizing AuditLog entry for this society's batch
      await logAuditEvent({
        action: 'bill.late_fee_applied',
        entityType: 'MaintenanceBill',
        entityId: eligibleBills[0]!._id, // Reference first bill as primary
        afterState: {
          totalBillsUpdated: eligibleBills.length,
          totalLateFeeApplied: totalLateFeeAmount,
          billIds: modifiedBillIds,
        },
        actorId: '000000000000000000000000',
        societyId: society._id.toString(),
      });

      batchResults.push({
        societyId: society._id,
        societyName: society.name,
        billsUpdated: eligibleBills.length,
        totalLateFeeApplied: totalLateFeeAmount,
      });
    }

    return NextResponse.json({
      message: 'Late fee calculation completed successfully',
      societiesProcessed: batchResults.length,
      results: batchResults,
    });
  } catch (error) {
    console.error('[Jobs:LateFees] Error running late-fee job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
