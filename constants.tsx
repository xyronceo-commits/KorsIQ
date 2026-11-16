
import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  BrainCircuit, 
  Calculator, 
  Crown, 
  Settings,
  LogOut,
  Plus,
  Zap,
  Link,
  ChevronRight,
  ChevronDown,
  GraduationCap,
  Sparkles,
  Search,
  BookMarked,
  Microscope,
  Play,
  RotateCcw,
  CheckCircle2,
  FileText,
  AudioWaveform,
  Trophy,
  Users,
  MessageSquare,
  Share2,
  UserPlus,
  User,
  CreditCard,
  Trash2,
  ShieldCheck,
  Download,
  Upload,
  Folder,
  Timer,
  Clock,
  LayoutGrid,
  AlertCircle,
  Info,
  PieChart,
  Brain,
  Library,
  Bell
} from 'lucide-react';

export const ICONS = {
  Dashboard: <LayoutGrid size={20} />,
  Studio: <FileText size={20} />,
  Courses: <BookOpen size={20} />,
  Schedule: <Calendar size={20} />,
  Timetable: <Calendar size={20} />,
  Calendar: <Calendar size={20} />,
  StudyHub: <BrainCircuit size={20} />,
  Brain: <Brain size={20} />,
  Calculator: <Calculator size={20} />,
  Pomodoro: <Timer size={20} />,
  Groups: <MessageSquare size={20} />,
  Pro: <Crown size={20} />,
  Settings: <Settings size={20} />,
  Logout: <LogOut size={20} />,
  Plus: <Plus size={20} />,
  Zap: <Zap size={16} />,
  Link: <Link size={20} />,
  ChevronRight: <ChevronRight size={20} />,
  ChevronDown: <ChevronDown size={20} />,
  GraduationCap: <GraduationCap size={48} />,
  Sparkles: <BrainCircuit size={20} />,
  Search: <Search size={20} />,
  BookMarked: <BookMarked size={20} />,
  Folder: <Folder size={20} />,
  Microscope: <Microscope size={20} />,
  Play: <Play size={20} />,
  RotateCcw: <RotateCcw size={20} />,
  CheckCircle: <CheckCircle2 size={20} />,
  FileText: <FileText size={20} />,
  Audio: <AudioWaveform size={20} />,
  Trophy: <Trophy size={20} />,
  Users: <Users size={20} />,
  Message: <MessageSquare size={20} />,
  Share: <Share2 size={16} />,
  UserPlus: <UserPlus size={16} />,
  User: <User size={20} />,
  CreditCard: <CreditCard size={20} />,
  Trash: <Trash2 size={20} />,
  Shield: <ShieldCheck size={20} />,
  Download: <Download size={20} />,
  Upload: <Upload size={20} />,
  Clock: <Clock size={20} />,
  Info: <Info size={20} />,
  Alert: <AlertCircle size={20} />,
  Analytics: <PieChart size={20} />,
  Library: <Library size={20} />,
  Bell: <Bell size={20} />
};

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DIFFICULTY_COLORS = {
  Easy: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Medium: 'bg-amber-50 text-amber-700 border-amber-100',
  Hard: 'bg-rose-50 text-rose-700 border-rose-100'
};

import { AI_CREDIT_ALLOWANCES, AI_CREDIT_COSTS } from './lib/aiCredits';
import { PLANS } from './lib/plans';
export { AI_CREDIT_ALLOWANCES, AI_CREDIT_COSTS };

// ==========================================
// Official Paystack Direct Payment Links
// ==========================================
export const PAYSTACK_PAYMENT_LINKS = {
  plus: 'https://paystack.shop/pay/c-mcwwacc8',
  premium: 'https://paystack.shop/pay/asaup43dpk',
  studio: 'https://paystack.shop/pay/asaup43dpk'
} as const;

// ==========================================
// Plan limits & feature allowances (delegated to lib/plans.ts)
// ==========================================
export const BETA_PLAN_LIMITS = {
  free: {
    name: PLANS.free.displayName,
    price: PLANS.free.priceFormatted,
    priceNumeric: PLANS.free.priceNaira,
    tagline: PLANS.free.tagline,
    maxCourses: PLANS.free.maxCourses,
    storageLimitBytes: PLANS.free.storageLimitBytes,
    storageLimitDisplay: PLANS.free.storageLabel,
    monthlyUploadsLimit: PLANS.free.monthlyUploadsLimit,
    aiCreditsAllowance: PLANS.free.aiCreditsAllowance,
    hasStudioAccess: PLANS.free.hasAcademicStudio,
    canCreateCircles: PLANS.free.canCreateCircles,
    canExportDocxPdf: PLANS.free.hasStudioExports,
    hasVersionHistory: PLANS.free.hasFullAcademicStudio,
  },
  plus: {
    name: PLANS.plus.displayName,
    price: `${PLANS.plus.priceFormatted} / ${PLANS.plus.periodLabel}`,
    priceNumeric: PLANS.plus.priceNaira,
    paymentLink: PAYSTACK_PAYMENT_LINKS.plus,
    tagline: PLANS.plus.tagline,
    maxCourses: PLANS.plus.maxCourses,
    storageLimitBytes: PLANS.plus.storageLimitBytes,
    storageLimitDisplay: PLANS.plus.storageLabel,
    monthlyUploadsLimit: PLANS.plus.monthlyUploadsLimit,
    aiCreditsAllowance: PLANS.plus.aiCreditsAllowance,
    hasStudioAccess: PLANS.plus.hasAcademicStudio,
    canCreateCircles: PLANS.plus.canCreateCircles,
    canExportDocxPdf: PLANS.plus.hasStudioExports,
    hasVersionHistory: PLANS.plus.hasFullAcademicStudio,
  },
  studio: {
    name: PLANS.studio.displayName,
    price: `${PLANS.studio.priceFormatted} / ${PLANS.studio.periodLabel}`,
    priceNumeric: PLANS.studio.priceNaira,
    paymentLink: PAYSTACK_PAYMENT_LINKS.studio,
    tagline: PLANS.studio.tagline,
    maxCourses: PLANS.studio.maxCourses,
    storageLimitBytes: PLANS.studio.storageLimitBytes,
    storageLimitDisplay: PLANS.studio.storageLabel,
    monthlyUploadsLimit: PLANS.studio.monthlyUploadsLimit,
    aiCreditsAllowance: PLANS.studio.aiCreditsAllowance,
    hasStudioAccess: PLANS.studio.hasAcademicStudio,
    canCreateCircles: PLANS.studio.canCreateCircles,
    canExportDocxPdf: PLANS.studio.hasStudioExports,
    hasVersionHistory: PLANS.studio.hasFullAcademicStudio,
  }
} as const;

