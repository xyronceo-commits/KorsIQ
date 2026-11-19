import { SubscriptionPlanType } from '../types';

/**
 * Single master switch for billing, plans, credits, and paywalls.
 * When false, KorsIQ runs in Free Beta Mode: everyone has full feature access
 * with generous shared beta limits and no pricing/credit UI.
 */
export const BILLING_ENABLED = false;

export type FeatureKey =
  | 'basicCgpa'
  | 'semesterPlan'
  | 'scenarioCgpa'
  | 'academicStudio'
  | 'fullAcademicStudio'
  | 'studioExports'
  | 'createCircles'
  | 'privateCircles';

export type PlanResource =
  | 'courses'
  | 'storageBytes'
  | 'monthlyUploads'
  | 'circlesCreate'
  | 'circlesJoin';

const MB = 1024 * 1024;
const GB = 1024 * 1024 * 1024;

export const FREE_BETA_LIMITS = {
  maxCourses: 15,
  storageLimitBytes: 100 * MB,
  storageLabel: '100 MB',
  maxFileSizeBytes: 25 * MB,
  maxFileSizeLabel: '25 MB',
  maxCirclesCreate: 3,
  maxCirclesJoin: 10,
  dailyAiRequestsLimit: 300,
  weeklyStudioGenerationsLimit: 3,
  weeklyStudioWindowDays: 7,
} as const;

export interface PlanConfig {
  key: SubscriptionPlanType;
  /** Single place to change user-facing tier name. */
  displayName: string;
  tagline: string;
  priceNaira: number;
  priceFormatted: string;
  periodLabel: string;
  maxCourses: number;
  storageLimitBytes: number;
  storageLabel: string;
  monthlyUploadsLimit: number;
  aiCreditsAllowance: number;
  /** null means unlimited */
  maxCirclesCreate: number | null;
  /** null means unlimited */
  maxCirclesJoin: number | null;
  canCreateCircles: boolean;
  canCreatePrivateCircles: boolean;
  hasBasicCgpa: boolean;
  hasSemesterPlan: boolean;
  hasScenarioCgpa: boolean;
  hasAcademicStudio: boolean;
  hasFullAcademicStudio: boolean;
  hasStudioExports: boolean;
  /** Full checklist for this plan */
  features: string[];
  /** Incremental items over the previous tier (for Plan page "next plan" preview) */
  extrasOverPrevious: string[];
}

export const PLAN_ORDER: SubscriptionPlanType[] = ['free', 'plus', 'studio'];

export const PLANS: Record<SubscriptionPlanType, PlanConfig> = {
  free: {
    key: 'free',
    displayName: 'Free',
    tagline: 'Core tools to organize your semester',
    priceNaira: 0,
    priceFormatted: '₦0',
    periodLabel: 'forever',
    maxCourses: 5,
    storageLimitBytes: 500 * MB,
    storageLabel: '500 MB',
    monthlyUploadsLimit: 15,
    aiCreditsAllowance: 20,
    maxCirclesCreate: 0,
    maxCirclesJoin: 2,
    canCreateCircles: false,
    canCreatePrivateCircles: false,
    hasBasicCgpa: true,
    hasSemesterPlan: true,
    hasScenarioCgpa: false,
    hasAcademicStudio: false,
    hasFullAcademicStudio: false,
    hasStudioExports: false,
    features: [
      'Up to 5 active courses',
      '500 MB file storage',
      '15 file uploads per month',
      '20 AI credits per month',
      'Join up to 2 study circles',
      'Basic CGPA calculator',
      'Semester Plan (outline analysis uses credits)',
    ],
    extrasOverPrevious: [],
  },
  plus: {
    key: 'plus',
    displayName: 'Plus',
    tagline: 'More capacity, study circles, and Lite Studio',
    priceNaira: 7500,
    priceFormatted: '₦7,500',
    periodLabel: 'month',
    maxCourses: 10,
    storageLimitBytes: 2 * GB,
    storageLabel: '2 GB',
    monthlyUploadsLimit: 50,
    aiCreditsAllowance: 150,
    maxCirclesCreate: 3,
    maxCirclesJoin: null,
    canCreateCircles: true,
    canCreatePrivateCircles: true,
    hasBasicCgpa: true,
    hasSemesterPlan: true,
    hasScenarioCgpa: true,
    hasAcademicStudio: true,
    hasFullAcademicStudio: false,
    hasStudioExports: false,
    features: [
      'Up to 10 active courses',
      '2 GB file storage',
      '50 file uploads per month',
      '150 AI credits per month',
      'Create up to 3 circles (private with invite codes)',
      'Join unlimited study circles',
      'Scenario CGPA projection',
      'Lite Academic Studio',
    ],
    extrasOverPrevious: [
      '10 active courses (up from 5)',
      '2 GB storage (up from 500 MB)',
      '50 monthly uploads (up from 15)',
      '150 AI credits/month (up from 20)',
      'Create up to 3 private circles & join unlimited',
      'Scenario CGPA projection',
      'Lite Academic Studio',
    ],
  },
  studio: {
    key: 'studio',
    displayName: 'Pro',
    tagline: 'Full Academic Studio, exports, and highest limits',
    priceNaira: 15000,
    priceFormatted: '₦15,000',
    periodLabel: 'month',
    maxCourses: 15,
    storageLimitBytes: 10 * GB,
    storageLabel: '10 GB',
    monthlyUploadsLimit: 200,
    aiCreditsAllowance: 200,
    maxCirclesCreate: null,
    maxCirclesJoin: null,
    canCreateCircles: true,
    canCreatePrivateCircles: true,
    hasBasicCgpa: true,
    hasSemesterPlan: true,
    hasScenarioCgpa: true,
    hasAcademicStudio: true,
    hasFullAcademicStudio: true,
    hasStudioExports: true,
    features: [
      'Up to 15 active courses',
      '10 GB file storage',
      '200 file uploads per month',
      '200 AI credits per month',
      'Unlimited study circles (create & join)',
      'Scenario CGPA projection',
      'Full Academic Studio with real citations & version history',
      'Word (.docx), PDF & PowerPoint (.pptx) exports',
    ],
    extrasOverPrevious: [
      '15 active courses (up from 10)',
      '10 GB storage (up from 2 GB)',
      '200 monthly uploads (up from 50)',
      '200 AI credits/month (up from 150)',
      'Unlimited circle creation',
      'Full Academic Studio with citations & version history',
      'Word, PDF & PowerPoint exports',
    ],
  },
};

export function normalizePlanTier(tier?: string | null): SubscriptionPlanType {
  if (tier === 'plus' || tier === 'studio' || tier === 'free') {
    return tier;
  }
  return 'free';
}

export function getPlanConfig(tier?: string | null): PlanConfig {
  return PLANS[normalizePlanTier(tier)];
}

export function getPlanDisplayName(tier?: string | null): string {
  return getPlanConfig(tier).displayName;
}

export function getNextPlanTier(tier?: string | null): SubscriptionPlanType | null {
  const normalized = normalizePlanTier(tier);
  if (normalized === 'free') return 'plus';
  if (normalized === 'plus') return 'studio';
  return null;
}

export function formatStorageBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < GB) return `${Math.round(bytes / MB)} MB`;
  return `${(bytes / GB).toFixed(bytes % GB === 0 ? 0 : 1)} GB`;
}

export function can(feature: FeatureKey, tier?: string | null): boolean {
  if (!BILLING_ENABLED) return true;
  const plan = getPlanConfig(tier);
  switch (feature) {
    case 'basicCgpa':
      return plan.hasBasicCgpa;
    case 'semesterPlan':
      return plan.hasSemesterPlan;
    case 'scenarioCgpa':
      return plan.hasScenarioCgpa;
    case 'academicStudio':
      return plan.hasAcademicStudio;
    case 'fullAcademicStudio':
      return plan.hasFullAcademicStudio;
    case 'studioExports':
      return plan.hasStudioExports;
    case 'createCircles':
      return plan.canCreateCircles;
    case 'privateCircles':
      return plan.canCreatePrivateCircles;
  }
}

export function getMaxFileSizeBytes(): number {
  return FREE_BETA_LIMITS.maxFileSizeBytes;
}

export function getResourceLimit(tier: string | null | undefined, resource: PlanResource): number | null {
  if (!BILLING_ENABLED) {
    switch (resource) {
      case 'courses':
        return FREE_BETA_LIMITS.maxCourses;
      case 'storageBytes':
        return FREE_BETA_LIMITS.storageLimitBytes;
      case 'monthlyUploads':
        return null;
      case 'circlesCreate':
        return FREE_BETA_LIMITS.maxCirclesCreate;
      case 'circlesJoin':
        return FREE_BETA_LIMITS.maxCirclesJoin;
    }
  }

  const plan = getPlanConfig(tier);
  switch (resource) {
    case 'courses':
      return plan.maxCourses;
    case 'storageBytes':
      return plan.storageLimitBytes;
    case 'monthlyUploads':
      return plan.monthlyUploadsLimit;
    case 'circlesCreate':
      return plan.maxCirclesCreate;
    case 'circlesJoin':
      return plan.maxCirclesJoin;
  }
}

const RESOURCE_LABELS: Record<PlanResource, { singular: string; plural: string; archiveAction?: string }> = {
  courses: { singular: 'course', plural: 'courses', archiveAction: 'archive or remove a course' },
  storageBytes: { singular: 'storage', plural: 'storage', archiveAction: 'delete unused files' },
  monthlyUploads: { singular: 'upload', plural: 'uploads', archiveAction: 'wait for your monthly reset' },
  circlesCreate: { singular: 'circle', plural: 'circles', archiveAction: 'remove an existing circle' },
  circlesJoin: { singular: 'circle', plural: 'circles', archiveAction: 'leave an existing circle' },
};

export interface LimitCheckResult {
  tier: SubscriptionPlanType;
  planName: string;
  resource: PlanResource;
  limit: number | null;
  current: number;
  incoming: number;
  remaining: number | null;
  allowed: boolean;
  allowedIncoming: number;
  isAtLimit: boolean;
  isOverLimit: boolean;
  isWarning: boolean;
  meterText: string;
  warningText: string | null;
  blockMessage: string | null;
  overLimitMessage: string | null;
}

export function checkLimit(params: {
  tier?: string | null;
  resource: PlanResource;
  currentCount: number;
  incomingCount?: number;
}): LimitCheckResult {
  const tier = normalizePlanTier(params.tier);
  const plan = getPlanConfig(tier);
  const nextTier = getNextPlanTier(tier);
  const nextPlan = nextTier ? getPlanConfig(nextTier) : null;
  const limit = getResourceLimit(tier, params.resource);
  const current = Math.max(0, params.currentCount || 0);
  const incoming = Math.max(0, params.incomingCount ?? 1);
  const labels = RESOURCE_LABELS[params.resource];

  if (limit === null) {
    const meterText =
      params.resource === 'storageBytes'
        ? `${formatStorageBytes(current)} used (Unlimited)`
        : `${current} ${labels.plural} (Unlimited)`;
    return {
      tier,
      planName: plan.displayName,
      resource: params.resource,
      limit: null,
      current,
      incoming,
      remaining: null,
      allowed: true,
      allowedIncoming: incoming,
      isAtLimit: false,
      isOverLimit: false,
      isWarning: false,
      meterText,
      warningText: null,
      blockMessage: null,
      overLimitMessage: null,
    };
  }

  const remaining = Math.max(0, limit - current);
  const isOverLimit = current > limit;
  const isAtLimit = current >= limit;
  const allowedIncoming = Math.max(0, Math.min(incoming, remaining));
  const allowed = current + incoming <= limit;

  // Warning threshold: ~20% remaining (at least 1 item left so warning shows before block)
  const warningThreshold =
    params.resource === 'storageBytes'
      ? Math.floor(limit * 0.2)
      : Math.max(1, Math.floor(limit * 0.2));
  const isWarning = !isAtLimit && remaining > 0 && remaining <= warningThreshold;

  const meterText =
    params.resource === 'storageBytes'
      ? `${formatStorageBytes(current)} of ${formatStorageBytes(limit)}`
      : `${current} of ${limit} ${labels.plural}`;

  let warningText: string | null = null;
  if (isWarning) {
    if (!BILLING_ENABLED) {
      if (params.resource === 'storageBytes') {
        warningText = `${formatStorageBytes(remaining)} left`;
      } else {
        const unit = remaining === 1 ? labels.singular : labels.plural;
        warningText = `${remaining} ${unit} left`;
      }
    } else if (params.resource === 'storageBytes') {
      warningText = `${formatStorageBytes(remaining)} storage left on your ${plan.displayName} plan.`;
    } else {
      const unit = remaining === 1 ? labels.singular : labels.plural;
      warningText = `${remaining} ${unit} left on your ${plan.displayName} plan.`;
    }
  }

  let overLimitMessage: string | null = null;
  if (isOverLimit) {
    const overMeter =
      params.resource === 'storageBytes'
        ? `${formatStorageBytes(current)} of ${formatStorageBytes(limit)}`
        : `${current} of ${limit}`;
    overLimitMessage = !BILLING_ENABLED
      ? `${overMeter}. Over the limit: you can keep these, but ${labels.archiveAction || 'free up space'} before adding more.`
      : `${overMeter}. Over your plan limit: you can keep these but not add more.`;
  }

  let blockMessage: string | null = null;
  if (!allowed) {
    const action = labels.archiveAction || 'free up space';
    const limitDisplay =
      params.resource === 'storageBytes' ? formatStorageBytes(limit) : `${limit} ${labels.plural}`;

    if (!BILLING_ENABLED) {
      blockMessage = `Limit reached (${limitDisplay}). To add more, ${action}.`;
    } else if (limit === 0 && params.resource === 'circlesCreate') {
      blockMessage = `Your ${plan.displayName} plan does not allow creating study circles. Upgrade to ${nextPlan?.displayName || 'Plus'} to create circles.`;
    } else {
      const forward = nextPlan
        ? `${action}, or upgrade to ${nextPlan.displayName}`
        : `${action}, or contact support`;
      blockMessage = `You have reached your ${plan.displayName} plan limit (${limitDisplay}). To add more, ${forward}.`;
    }
  }

  return {
    tier,
    planName: plan.displayName,
    resource: params.resource,
    limit,
    current,
    incoming,
    remaining,
    allowed,
    allowedIncoming,
    isAtLimit,
    isOverLimit,
    isWarning,
    meterText,
    warningText,
    blockMessage,
    overLimitMessage,
  };
}

export const SUPPORT_CONTACT_EMAIL = 'support@korsiq.app';
