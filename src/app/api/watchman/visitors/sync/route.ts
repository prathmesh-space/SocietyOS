import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connection';
import Unit from '@/models/Unit';
import Visitor from '@/models/Visitor';
import { withAuth } from '@/lib/auth/middleware';
import { logAuditEvent } from '@/lib/audit/logger';

interface SyncEntry {
  visitorName: string;
  entryTime: string;
  preApproved: boolean;
  token?: string;
  unitId?: string;
}

// POST /api/watchman/visitors/sync — Sync a batch of visitor entries captured offline
export const POST = withAuth(
  async (req, { auth }) => {
    try {
      const body = await req.json();
      const { entries } = body;

      if (!entries || !Array.isArray(entries)) {
        return NextResponse.json({ error: 'entries array is required' }, { status: 400 });
      }

      await dbConnect();

      const syncResults = [];
      const secret = process.env.JWT_SECRET || 'jwt-secret';
      const CLOCK_SKEW_MS = 60 * 1000;

      for (let i = 0; i < entries.length; i++) {
        const entry: SyncEntry = entries[i];
        const { visitorName, entryTime, preApproved, token, unitId } = entry;

        try {
          // 1. Basic validation
          if (!visitorName || !entryTime) {
            syncResults.push({
              index: i,
              success: false,
              error: 'Missing visitorName or entryTime',
              code: 'missing-data',
            });
            continue;
          }

          const clientEntryTime = new Date(entryTime);

          if (preApproved) {
            // Check token exists
            if (!token) {
              syncResults.push({
                index: i,
                success: false,
                error: 'Token is required for pre-approved entries',
                code: 'missing-token',
              });
              continue;
            }

            // Decode and verify JWT
            let decoded: any;
            try {
              decoded = jwt.verify(token, secret);
            } catch (err) {
              syncResults.push({
                index: i,
                success: false,
                error: 'Invalid token signature',
                code: 'invalid-signature',
              });
              continue;
            }

            const {
              visitorName: tokVisitorName,
              unitId: tokUnitId,
              societyId: tokSocietyId,
              start,
              end,
            } = decoded;

            // Check society scoping
            if (tokSocietyId !== auth.societyId) {
              syncResults.push({
                index: i,
                success: false,
                error: 'Token belongs to a different society',
                code: 'wrong-society',
              });
              continue;
            }

            // Check unit existence
            const unitDoc = await Unit.findById(tokUnitId);
            if (!unitDoc || unitDoc.societyId.toString() !== auth.societyId) {
              syncResults.push({
                index: i,
                success: false,
                error: 'Unit not found or does not belong to this society',
                code: 'wrong-unit',
              });
              continue;
            }

            // Expiry validation using client-capture time (tolerance for clock-skew)
            const captureTimeMs = clientEntryTime.getTime();
            const startTimeMs = new Date(start).getTime();
            const endTimeMs = new Date(end).getTime();

            if (captureTimeMs < startTimeMs - CLOCK_SKEW_MS) {
              syncResults.push({
                index: i,
                success: false,
                error: 'Capture time is before pre-approval window start time',
                code: 'not-active-yet',
              });
              continue;
            }

            if (captureTimeMs > endTimeMs + CLOCK_SKEW_MS) {
              syncResults.push({
                index: i,
                success: false,
                error: 'Capture time is after pre-approval window end time (expired)',
                code: 'expired',
              });
              continue;
            }

            // Single-use token verification
            const existingScan = await Visitor.findOne({ token }).setOptions({ unscoped: true });
            if (existingScan) {
              syncResults.push({
                index: i,
                success: false,
                error: 'Pre-approval token has already been used',
                code: 'already-used',
              });
              continue;
            }

            // Valid: Create pre-approved entry
            let visitor;
            try {
              visitor = await Visitor.create({
                societyId: auth.societyId!,
                unitId: unitDoc._id,
                visitorName: tokVisitorName,
                entryTime: clientEntryTime, // Original client capture time
                preApproved: true,
                verifiedAt: new Date(),
                verificationStatus: 'verified',
                token,
              });
            } catch (err: any) {
              if (err.code === 11000 || err.message?.includes('E11000')) {
                syncResults.push({
                  index: i,
                  success: false,
                  error: 'Pre-approval token has already been used',
                  code: 'already-used',
                });
                continue;
              }
              throw err;
            }

            // Log entry
            await logAuditEvent({
              action: 'visitor.manual_entry',
              entityType: 'Visitor',
              entityId: visitor._id,
              afterState: {
                visitorName: tokVisitorName,
                unitId: tokUnitId,
                preApproved: true,
                synced: true,
              },
              actorId: auth.userId,
              societyId: auth.societyId!,
            });

            syncResults.push({
              index: i,
              success: true,
              visitorId: visitor._id,
              code: 'verified',
            });
          } else {
            // Unscheduled/manual entry
            if (!unitId) {
              syncResults.push({
                index: i,
                success: false,
                error: 'Unit ID is required for manual entry',
                code: 'missing-unit',
              });
              continue;
            }

            const unitDoc = await Unit.findById(unitId);
            if (!unitDoc || unitDoc.societyId.toString() !== auth.societyId) {
              syncResults.push({
                index: i,
                success: false,
                error: 'Unit not found or does not belong to your society',
                code: 'wrong-unit',
              });
              continue;
            }

            const visitor = await Visitor.create({
              societyId: auth.societyId!,
              unitId: unitDoc._id,
              visitorName,
              entryTime: clientEntryTime, // Original client capture time
              preApproved: false,
              verifiedAt: null,
              verificationStatus: 'unverified',
              token: undefined,
            });

            // Log entry
            await logAuditEvent({
              action: 'visitor.manual_entry',
              entityType: 'Visitor',
              entityId: visitor._id,
              afterState: {
                visitorName,
                unitId,
                preApproved: false,
                synced: true,
              },
              actorId: auth.userId,
              societyId: auth.societyId!,
            });

            syncResults.push({
              index: i,
              success: true,
              visitorId: visitor._id,
              code: 'unverified',
            });
          }
        } catch (err: any) {
          syncResults.push({
            index: i,
            success: false,
            error: err.message || 'Processing error',
            code: 'error',
          });
        }
      }

      return NextResponse.json({
        message: 'Sync processing complete',
        results: syncResults,
      });
    } catch (error) {
      console.error('[Watchman:Sync] Sync endpoint error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['watchman'] }
);
