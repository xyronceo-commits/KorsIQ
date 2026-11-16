import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  BILLING_ENABLED,
  FREE_BETA_LIMITS,
  PLANS,
  can,
  checkLimit,
  getMaxFileSizeBytes,
  getPlanDisplayName,
  formatStorageBytes,
} from './plans';

describe('Plan Limits & Single Source of Truth (lib/plans.ts)', () => {
  it('defines Free, Plus, and Pro display names while preserving internal keys', () => {
    assert.strictEqual(getPlanDisplayName('free'), 'Free');
    assert.strictEqual(getPlanDisplayName('plus'), 'Plus');
    assert.strictEqual(getPlanDisplayName('studio'), 'Pro');
    assert.strictEqual(getPlanDisplayName(undefined), 'Free');
  });

  it('has exact limits for courses, storage, uploads, credits, and circles', () => {
    assert.strictEqual(PLANS.free.maxCourses, 5);
    assert.strictEqual(PLANS.plus.maxCourses, 10);
    assert.strictEqual(PLANS.studio.maxCourses, 15);

    assert.strictEqual(PLANS.free.storageLabel, '500 MB');
    assert.strictEqual(PLANS.plus.storageLabel, '2 GB');
    assert.strictEqual(PLANS.studio.storageLabel, '10 GB');

    assert.strictEqual(PLANS.free.monthlyUploadsLimit, 15);
    assert.strictEqual(PLANS.plus.monthlyUploadsLimit, 50);
    assert.strictEqual(PLANS.studio.monthlyUploadsLimit, 200);

    assert.strictEqual(PLANS.free.aiCreditsAllowance, 20);
    assert.strictEqual(PLANS.plus.aiCreditsAllowance, 150);
    assert.strictEqual(PLANS.studio.aiCreditsAllowance, 200);

    assert.strictEqual(PLANS.free.maxCirclesCreate, 0);
    assert.strictEqual(PLANS.free.maxCirclesJoin, 2);
    assert.strictEqual(PLANS.plus.maxCirclesCreate, 3);
    assert.strictEqual(PLANS.plus.maxCirclesJoin, null);
    assert.strictEqual(PLANS.studio.maxCirclesCreate, null);
    assert.strictEqual(PLANS.studio.maxCirclesJoin, null);
  });

  it('checkLimit enforces Free Beta limits when BILLING_ENABLED is false', () => {
    assert.strictEqual(BILLING_ENABLED, false);
    assert.strictEqual(getMaxFileSizeBytes(), 25 * 1024 * 1024);
    assert.strictEqual(FREE_BETA_LIMITS.dailyAiRequestsLimit, 300);

    // Full feature access via can()
    assert.strictEqual(can('academicStudio', 'free'), true);
    assert.strictEqual(can('studioExports', 'free'), true);
    assert.strictEqual(can('scenarioCgpa', 'free'), true);
    assert.strictEqual(can('privateCircles', 'free'), true);

    const ok = checkLimit({ tier: 'free', resource: 'courses', currentCount: 2, incomingCount: 1 });
    assert.strictEqual(ok.allowed, true);
    assert.strictEqual(ok.isWarning, false);
    assert.strictEqual(ok.meterText, '2 of 15 courses');

    const warn = checkLimit({ tier: 'free', resource: 'courses', currentCount: 12, incomingCount: 1 });
    assert.strictEqual(warn.allowed, true);
    assert.strictEqual(warn.isWarning, true);
    assert.match(warn.warningText || '', /3 courses left/i);

    const blocked = checkLimit({ tier: 'free', resource: 'courses', currentCount: 15, incomingCount: 1 });
    assert.strictEqual(blocked.allowed, false);
    assert.strictEqual(blocked.isAtLimit, true);
    assert.doesNotMatch(blocked.blockMessage || '', /upgrade|plan/i);

    const bulk = checkLimit({ tier: 'free', resource: 'courses', currentCount: 0, incomingCount: 20 });
    assert.strictEqual(bulk.allowed, false);
    assert.strictEqual(bulk.allowedIncoming, 15);

    const over = checkLimit({ tier: 'free', resource: 'courses', currentCount: 18, incomingCount: 1 });
    assert.strictEqual(over.allowed, false);
    assert.strictEqual(over.isOverLimit, true);
    assert.doesNotMatch(over.overLimitMessage || '', /plan/i);

    const storageWarn = checkLimit({ tier: 'free', resource: 'storageBytes', currentCount: 80 * 1024 * 1024, incomingCount: 1024 });
    assert.strictEqual(storageWarn.allowed, true);
    assert.strictEqual(storageWarn.isWarning, true);
    assert.match(storageWarn.warningText || '', /20 MB left/i);

    const circleCreate = checkLimit({ tier: 'free', resource: 'circlesCreate', currentCount: 3, incomingCount: 1 });
    assert.strictEqual(circleCreate.allowed, false);

    const circleJoin = checkLimit({ tier: 'free', resource: 'circlesJoin', currentCount: 10, incomingCount: 1 });
    assert.strictEqual(circleJoin.allowed, false);
  });

  it('formats storage bytes cleanly', () => {
    assert.strictEqual(formatStorageBytes(0), '0 B');
    assert.strictEqual(formatStorageBytes(500 * 1024 * 1024), '500 MB');
    assert.strictEqual(formatStorageBytes(2 * 1024 * 1024 * 1024), '2 GB');
  });

  it('fails if duplicated hardcoded plan text or old limits appear outside lib/plans.ts', () => {
    const root = process.cwd();
    const targets = [
      path.join(root, 'App.tsx'),
      path.join(root, 'server.ts'),
      ...fs.readdirSync(path.join(root, 'components'))
        .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
        .map((f) => path.join(root, 'components', f)),
    ];

    const forbiddenPatterns: Array<{ label: string; regex: RegExp }> = [
      { label: 'KorsIQ Premium', regex: /KorsIQ Premium/i },
      { label: 'Choose Premium', regex: /Choose Premium/i },
      { label: 'Unlimited courses', regex: /Unlimited courses/i },
      { label: '1,000 AI credits', regex: /1,000 AI credits/i },
      { label: '100 MB storage limit', regex: /100\s*MB\s*(of\s*)?(cloud\s*)?storage/i },
      { label: 'hardcoded MAX_COURSES = 12', regex: /MAX_COURSES\s*=\s*12\b/ },
      { label: 'hardcoded maxCourses = 12', regex: /maxCourses\s*=\s*12\b/ },
      { label: 'hardcoded ₦7,500', regex: /₦7,500/ },
      { label: 'hardcoded ₦15,000', regex: /₦15,000/ },
    ];

    const violations: string[] = [];
    for (const filePath of targets) {
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf8');
      for (const { label, regex } of forbiddenPatterns) {
        if (regex.test(content)) {
          violations.push(`${path.relative(root, filePath)}: found "${label}"`);
        }
      }
    }

    assert.deepStrictEqual(violations, []);
  });
});
