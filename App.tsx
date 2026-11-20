import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Course, UserProfile, StudySession, AppState, StudyHubData, StudyGroup, AppNotification } from './types';
import { ICONS } from './constants';
import { BILLING_ENABLED, getPlanDisplayName } from './lib/plans';
import { GraduationCap, Menu, X, Lock, Sun, Moon, CheckCheck, Trash2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Dashboard from './components/Dashboard';
import { UserAvatar } from './components/UserAvatar';
import Auth, { type AuthMode } from './components/Auth';
import type { Session } from '@supabase/supabase-js';
import { supabase, toAuthUser, setCurrentUserId, getAccessToken, hasStoredSupabaseSession, type AuthUser } from './lib/supabase';
import { DBService } from './services/db';
import { cleanupLegacyApiKeyStorage, GeminiService } from './services/gemini';
import { applyPageSeo, CANONICAL_ORIGIN, PUBLIC_HOME_SEO } from './lib/seo';
import KorsIQLogo from './components/KorsIQLogo';
import LandingPage from './components/LandingPage';

const Onboarding = lazy(() => import('./components/Onboarding'));
const CourseManager = lazy(() => import('./components/CourseManager'));
const ScheduleView = lazy(() => import('./components/ScheduleView'));
const StudyHub = lazy(() => import('./components/StudyHub'));
const StudyGroups = lazy(() => import('./components/StudyGroups'));
const CGPACalculator = lazy(() => import('./components/CGPACalculator'));
const AcademicStudio = lazy(() => import('./components/AcademicStudio'));
const PomodoroTimer = lazy(() => import('./components/PomodoroTimer'));
const TimetableView = lazy(() => import('./components/TimetableView'));
const Profile = lazy(() => import('./components/Profile'));
const Tutorial = lazy(() => import('./components/Tutorial'));
const StudyPlannerView = lazy(() => import('./components/StudyPlannerView'));
const ResourcesView = lazy(() => import('./components/ResourcesView'));
const AdminApp = lazy(() => import('./components/AdminApp'));

const PageSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse p-2" aria-label="Loading view">
    <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-lg w-48" />
    <div className="h-4 bg-slate-100 dark:bg-slate-800/70 rounded w-72" />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
      <div className="h-32 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg" />
      <div className="h-32 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg" />
    </div>
  </div>
);

const App: React.FC = () => {
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.location.pathname === '/admin' ||
      window.location.pathname.startsWith('/admin/') ||
      window.location.hash === '#/admin' ||
      window.location.hash.startsWith('#/admin/')
    );
  });

  useEffect(() => {
    const handleRouteChange = () => {
      setIsAdminRoute(
        window.location.pathname === '/admin' ||
        window.location.pathname.startsWith('/admin/') ||
        window.location.hash === '#/admin' ||
        window.location.hash.startsWith('#/admin/')
      );
    };
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  const [activeTab, setActiveTab] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('korsiq_active_tab') as AppState | null;
      const validTabs: AppState[] = [
        'overview', 'dashboard', 'planner', 'studio', 'circles', 'groups',
        'resources', 'settings', 'courses', 'hub', 'schedule', 'timetable',
        'calculator', 'pomodoro', 'profile', 'analytics', 'library', 'admin'
      ];
      if (saved && validTabs.includes(saved)) {
        return saved;
      }
    } catch {}
    return 'dashboard';
  });

  useEffect(() => {
    try {
      localStorage.setItem('korsiq_active_tab', activeTab);
    } catch {}
  }, [activeTab]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [schedule, setSchedule] = useState<StudySession[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hubs, setHubs] = useState<Record<string, StudyHubData>>({});
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNotifPermissionBanner, setShowNotifPermissionBanner] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) return false;
      if (Notification.permission !== 'default') return false;
      return !localStorage.getItem('korsiq_notif_prompt_dismissed');
    } catch {
      return false;
    }
  });
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isStudioFocusMode, setIsStudioFocusMode] = useState(false);
  const [sidebarManualOverride, setSidebarManualOverride] = useState<'collapsed' | 'expanded' | null>(null);

  // Reset Studio focus mode when navigating away from Academic Studio
  useEffect(() => {
    if (activeTab !== 'studio' && isStudioFocusMode) {
      setIsStudioFocusMode(false);
    }
  }, [activeTab, isStudioFocusMode]);

  const isDesktopSidebarCollapsed =
    sidebarManualOverride === 'collapsed'
      ? true
      : sidebarManualOverride === 'expanded'
      ? false
      : activeTab === 'studio' && isStudioFocusMode;

  const isEdgeToEdgeStudio = activeTab === 'studio' && isStudioFocusMode;
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('scolaris_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('scolaris_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('scolaris_theme', 'light');
      }
    } catch {
      // Storage unavailable (e.g. restricted crawler or private browsing)
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  // Safe one-time legacy API key cleanup from browser storage
  useEffect(() => {
    cleanupLegacyApiKeyStorage();
  }, []);
  
  // Auth State Management — start unblocked on public `/` when no stored session exists
  const [authLoading, setAuthLoading] = useState<boolean>(() => hasStoredSupabaseSession());
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery');
  });

  // Dynamic SEO metadata: keep public landing page indexable, mark auth/admin/private workspace noindex
  useEffect(() => {
    if (isAdminRoute) {
      applyPageSeo({
        title: 'Admin Portal — KorsIQ',
        description: 'KorsIQ administration console.',
        canonical: `${CANONICAL_ORIGIN}/admin`,
        robots: 'noindex, nofollow',
      });
      return;
    }

    if (isPasswordRecovery || (!authUser && showAuth)) {
      applyPageSeo({
        title: isPasswordRecovery ? 'Reset Password — KorsIQ' : authMode === 'signup' ? 'Create Account — KorsIQ' : 'Sign In — KorsIQ',
        description: PUBLIC_HOME_SEO.description,
        canonical: PUBLIC_HOME_SEO.canonical,
        robots: 'noindex, nofollow',
      });
      return;
    }

    if (!authUser) {
      applyPageSeo(PUBLIC_HOME_SEO);
      return;
    }

    const tabTitles: Partial<Record<AppState, string>> = {
      overview: 'Overview — KorsIQ',
      dashboard: 'Overview — KorsIQ',
      planner: 'Study Planner — KorsIQ',
      courses: 'Courses — KorsIQ',
      calculator: 'CGPA Calculator — KorsIQ',
      timetable: 'Timetable — KorsIQ',
      schedule: 'Revision Plan — KorsIQ',
      hub: 'Study Hub — KorsIQ',
      circles: 'Study Circles — KorsIQ',
      groups: 'Study Circles — KorsIQ',
      studio: 'Academic Studio — KorsIQ',
      resources: 'Resource Library — KorsIQ',
      library: 'Resource Library — KorsIQ',
      settings: 'Settings — KorsIQ',
      profile: 'Profile — KorsIQ',
    };

    applyPageSeo({
      title: profile && !profile.onboarded ? 'Onboarding — KorsIQ' : (tabTitles[activeTab] || 'Workspace — KorsIQ'),
      description: PUBLIC_HOME_SEO.description,
      canonical: PUBLIC_HOME_SEO.canonical,
      robots: 'noindex, nofollow',
    });
  }, [isAdminRoute, isPasswordRecovery, authUser, showAuth, authMode, activeTab, profile?.onboarded]);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [paymentReturnBanner, setPaymentReturnBanner] = useState<{
    status: 'verifying' | 'success' | 'error';
    message: string;
  } | null>(null);

  // Paystack Callback Return Handler: detects ?payment=return, ?reference=..., ?trxref=..., or #/settings?reference=...
  useEffect(() => {
    if (!authUser?.uid || typeof window === 'undefined') return;

    const searchParams = new URLSearchParams(window.location.search);
    const hashQueryIdx = window.location.hash.indexOf('?');
    const hashParams = hashQueryIdx !== -1
      ? new URLSearchParams(window.location.hash.slice(hashQueryIdx + 1))
      : new URLSearchParams();

    const refFromUrl =
      searchParams.get('reference') ||
      searchParams.get('trxref') ||
      hashParams.get('reference') ||
      hashParams.get('trxref') ||
      '';
    const isPaymentReturn =
      Boolean(refFromUrl) ||
      searchParams.get('payment') === 'return' ||
      hashParams.get('payment') === 'return';

    if (!isPaymentReturn) return;

    const pendingRefKey = `scolaris_pending_payment_ref_${authUser.uid}`;
    let refToVerify = refFromUrl.trim();
    if (!refToVerify) {
      try {
        refToVerify = (localStorage.getItem(pendingRefKey) || '').trim();
      } catch {}
    }

    // Clean the URL immediately so refreshes do not re-trigger
    try {
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch {}

    setActiveTab('settings');
    if (!BILLING_ENABLED) return;
    setPaymentReturnBanner({
      status: 'verifying',
      message: 'Verifying your payment with Paystack...'
    });

    let cancelled = false;
    const runVerificationWithRetry = async () => {
      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (cancelled) return;
        try {
          const token = await getAccessToken();
          const res = await fetch('/api/subscription/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              reference: refToVerify || undefined,
              email: authUser.email || profile?.email
            })
          });
          const data = await res.json().catch(() => ({}));

          if (res.ok && data.success) {
            try {
              localStorage.removeItem(pendingRefKey);
              localStorage.removeItem(`scolaris_pending_payment_plan_${authUser.uid}`);
            } catch {}

            const freshProfile = await DBService.getProfile(authUser.uid);
            const resolvedTier = data.tier || freshProfile?.tier || 'plus';
            const resolvedEnd = data.currentPeriodEnd || freshProfile?.subscriptionEnd || '';
            if (freshProfile) {
              setProfile({
                ...freshProfile,
                tier: resolvedTier,
                subscriptionTier: resolvedTier,
                isPro: true,
                subscriptionStatus: 'active',
                paymentStatus: 'paid',
                subscriptionEnd: resolvedEnd
              });
            } else if (profile) {
              setProfile({
                ...profile,
                tier: resolvedTier,
                subscriptionTier: resolvedTier,
                isPro: true,
                subscriptionStatus: 'active',
                paymentStatus: 'paid',
                subscriptionEnd: resolvedEnd
              });
            }

            const planLabel = getPlanDisplayName(resolvedTier);
            const renewLabel = resolvedEnd
              ? ` (renews ${new Date(resolvedEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })})`
              : '';

            if (!cancelled) {
              setPaymentReturnBanner({
                status: 'success',
                message: `Payment verified! Your account is now active on ${planLabel}${renewLabel}.`
              });
            }
            return;
          }

          // If pending and we have retries left, wait 2 seconds and retry
          if (attempt < maxAttempts && (data.status === 'pending' || res.status >= 500)) {
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }

          if (!cancelled) {
            setPaymentReturnBanner({
              status: 'error',
              message:
                data.error ||
                data.message ||
                'We could not verify your payment automatically yet. Paste your Paystack receipt reference in the "Have a receipt? Verify payment" box below.'
            });
          }
          return;
        } catch (err: any) {
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          if (!cancelled) {
            setPaymentReturnBanner({
              status: 'error',
              message: 'Could not reach the payment verification server. Use the "Have a receipt? Verify payment" box below to retry.'
            });
          }
        }
      }
    };

    runVerificationWithRetry();
    return () => {
      cancelled = true;
    };
  }, [authUser?.uid]);

  // Re-kick any stalled Academic Studio v2 background jobs when the app loads
  useEffect(() => {
    if (!authUser?.uid) return;
    GeminiService.reKickStudioV2Jobs().catch(() => {});
  }, [authUser?.uid]);

  // Update Page Title and Robots Metadata based on Active State
  useEffect(() => {
    let robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      document.head.appendChild(robotsMeta);
    }

    if (!authUser && showAuth) {
      document.title = authMode === 'signup' ? 'Create Account | KorsIQ' : 'Sign In | KorsIQ';
      robotsMeta.content = 'noindex, nofollow';
      return;
    }
    if (!authUser) {
      document.title = 'KorsIQ — Outsmart Your Syllabus.';
      robotsMeta.content = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
      return;
    }

    // Authenticated private workspace views are strictly marked noindex
    robotsMeta.content = 'noindex, nofollow';

    const tabTitles: Record<string, string> = {
      dashboard: 'Dashboard | KorsIQ',
      courses: 'My Courses | KorsIQ',
      hub: 'Study | KorsIQ',
      tools: 'AI Study Tools | KorsIQ',
      podcast: 'AI Podcast | KorsIQ',
      profile: 'Profile | KorsIQ',
      schedule: 'Schedule | KorsIQ',
      groups: 'Study Circles | KorsIQ',
      analytics: 'Analytics | KorsIQ',
      paid: 'Pro Access | KorsIQ'
    };
    if (tabTitles[activeTab]) {
      document.title = tabTitles[activeTab];
    } else {
      const formatted = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
      document.title = `${formatted} | KorsIQ`;
    }
  }, [activeTab, authUser, showAuth, authMode]);

  // Load User Data & Profile from Supabase (with instant cache hydration + no redundant startup write-back)
  const isInitialDataLoadedRef = useRef(false);
  const skipProfileSyncRef = useRef(false);
  const skipCoursesSyncRef = useRef(false);
  const skipScheduleSyncRef = useRef(false);

  const loadUserData = async (user: AuthUser, hasCachedProfile = false) => {
    isInitialDataLoadedRef.current = false;
    try {
      const uid = user.uid;
      const [dbProfile, dbCourses, dbSchedule] = await Promise.all([
        DBService.getProfile(uid),
        DBService.getCourses(uid),
        DBService.getSchedule(uid),
      ]);

      if (dbProfile) {
        if ((!dbProfile.name || dbProfile.name === 'Scholar') && user.displayName) {
          dbProfile.name = user.displayName;
        }
        skipProfileSyncRef.current = true;
        setProfile(dbProfile);
      } else if (!hasCachedProfile) {
        const newProfile: UserProfile = {
          name: user.displayName || user.email?.split('@')[0] || 'Scholar',
          email: user.email || '',
          university: '',
          level: 'Undergraduate',
          age: 20,
          onboarded: false,
          tutorialSeen: false,
          tier: 'free',
          isPro: false,
          subscriptionTier: 'free',
          subscriptionStatus: 'inactive',
          paymentStatus: 'none',
          targetCGPA: 0.00,
          notifications: { messages: true, sessions: true, aiContent: true },
          semesterEnd: ''
        };
        skipProfileSyncRef.current = true;
        await DBService.saveProfile(uid, newProfile);
        setProfile(newProfile);
      }

      skipCoursesSyncRef.current = true;
      setCourses(dbCourses);
      skipScheduleSyncRef.current = true;
      setSchedule(dbSchedule);
      isInitialDataLoadedRef.current = true;

      // Load heavier secondary collections in the background without blocking Dashboard render
      Promise.all([
        DBService.getHubs(uid),
        DBService.getGroups(uid),
      ]).then(([dbHubs, dbGroups]) => {
        setHubs(dbHubs);
        setGroups(dbGroups);
      }).catch(() => {});
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  // Supabase Auth Observer
  const loadedUidRef = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;

    const applySession = async (session: Session | null) => {
      const user = session?.user ? toAuthUser(session.user) : null;

      if (!user || !user.emailVerified) {
        loadedUidRef.current = null;
        setCurrentUserId(undefined);
        setAuthUser(null);
        setProfile(null);
        setAuthLoading(false);
        return;
      }

      setCurrentUserId(user.uid);
      setAuthUser(user);
      setSessionExpiredMsg(null);

      // Token refreshes re-fire this handler: only load data once per signed-in user
      if (loadedUidRef.current === user.uid) {
        setAuthLoading(false);
        return;
      }
      loadedUidRef.current = user.uid;

      // Instant cold-start hydration from local cache for APK / slow mobile networks
      const cached = DBService.readUserCacheSnapshot(user.uid);
      const hasCachedProfile = Boolean(cached.profile);
      if (hasCachedProfile && cached.profile) {
        skipProfileSyncRef.current = true;
        setProfile(cached.profile);
        if (cached.courses.length > 0) {
          skipCoursesSyncRef.current = true;
          setCourses(cached.courses);
        }
        if (cached.schedule.length > 0) {
          skipScheduleSyncRef.current = true;
          setSchedule(cached.schedule);
        }
        if (Object.keys(cached.hubs).length > 0) setHubs(cached.hubs);
        if (cached.groups.length > 0) setGroups(cached.groups);
        setAuthLoading(false);
      } else {
        setAuthLoading(true);
      }

      await loadUserData(user, hasCachedProfile);
      if (!cancelled) setAuthLoading(false);
    };

    let unsubscribe: (() => void) | null = null;
    const fallbackTimer = window.setTimeout(() => {
      if (!cancelled) setAuthLoading(false);
    }, 4000);

    try {
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
          setShowAuth(true);
        }
        // Defer: calling Supabase APIs synchronously inside this callback can deadlock the client
        setTimeout(() => {
          if (!cancelled) {
            applySession(session).catch(() => {
              if (!cancelled) setAuthLoading(false);
            });
          }
        }, 0);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    } catch (err) {
      console.warn('Supabase auth observer unavailable:', err);
      setAuthLoading(false);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
      try {
        unsubscribe?.();
      } catch {}
    };
  }, []);

  // DB Connection Health Checker (authenticated workspace only — zero background Supabase calls on public `/`)
  useEffect(() => {
    if (!authUser) return;
    const checkDb = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setDbConnected(false);
        return;
      }
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        const isConnected = await DBService.checkConnection();
        setDbConnected(isConnected);
      } catch {
        setDbConnected(false);
      }
    };
    const handleOnline = () => { checkDb(); };
    const handleOffline = () => { setDbConnected(false); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    checkDb();
    const interval = setInterval(checkDb, 60000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [authUser]);

  // Sync state changes to DB (skip hydration writes on startup)
  useEffect(() => {
    if (skipProfileSyncRef.current) {
      skipProfileSyncRef.current = false;
      return;
    }
    if (authUser?.uid && profile?.onboarded) {
      DBService.saveProfile(authUser.uid, profile);
    }
  }, [profile, authUser?.uid]);

  useEffect(() => {
    if (skipCoursesSyncRef.current) {
      skipCoursesSyncRef.current = false;
      return;
    }
    if (authUser?.uid && profile?.onboarded && (isInitialDataLoadedRef.current || courses.length > 0)) {
      DBService.saveCourses(authUser.uid, courses);
    }
  }, [courses, profile?.onboarded, authUser?.uid]);

  useEffect(() => {
    if (skipScheduleSyncRef.current) {
      skipScheduleSyncRef.current = false;
      return;
    }
    if (authUser?.uid && profile?.onboarded && (isInitialDataLoadedRef.current || schedule.length > 0)) {
      DBService.saveSchedule(authUser.uid, schedule);
    }
  }, [schedule, profile?.onboarded, authUser?.uid]);

  // Mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Notifications for Upcoming Sessions
  useEffect(() => {
    if (!profile || !profile.onboarded || schedule.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
      const todaySessions = schedule.filter(s => s.day === currentDay);
      
      todaySessions.forEach(session => {
        const lastNotifiedKey = `last_notified_session_${session.id}`;
        let lastNotified: string | null = null;
        try {
          lastNotified = localStorage.getItem(lastNotifiedKey);
        } catch {}
        
        if (!lastNotified || (Date.now() - parseInt(lastNotified, 10)) > 86400000) {
          const course = courses.find(c => c.id === session.courseId);
          const topicInfo = session.topic ? ` Today's focus: ${session.topic}.` : '';
          const techniqueInfo = session.technique ? ` Recommended technique: ${session.technique}.` : '';
          addNotification('session', 'Upcoming Study Session', `Your ${session.mode} session for ${course?.code || 'your course'} is scheduled today.${topicInfo}${techniqueInfo}`, 'schedule');
          try {
            localStorage.setItem(lastNotifiedKey, Date.now().toString());
          } catch {}

          // Trigger native browser notification if permitted
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && profile.notifications?.browserPush !== false) {
            try {
              new Notification(`KorsIQ Reminder: ${course?.code || 'Study Session'}`, {
                body: `Your ${session.mode} session is scheduled today.${topicInfo}`,
                icon: '/korsiq-logo-192.png'
              });
            } catch (err) {
              console.warn('Native notification dispatch error:', err);
            }
          }
        }
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [profile, schedule, courses]);

  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    if (authUser) {
      await DBService.saveProfile(authUser.uid, updatedProfile);
    }
  };

  const [openAddCourseSignal, setOpenAddCourseSignal] = useState(0);

  const handleQuickAddCourse = (newCourse: Course) => {
    // Persisted by the courses effect above (DBService.saveCourses)
    setCourses(prev => [...prev, newCourse]);
  };

  const handleOpenAddCourseFlow = () => {
    setOpenAddCourseSignal(s => s + 1);
    setActiveTab('courses');
  };

  const handleOnboardingComplete = async (newProfile: UserProfile) => {
    if (authUser) {
      await DBService.saveProfile(authUser.uid, newProfile);
    }
    setProfile(newProfile);
    setActiveTab('dashboard');
  };

  const handleTutorialComplete = () => {
    if (profile) {
      setProfile({ ...profile, tutorialSeen: true });
    }
  };

  const handleSignOut = async () => {
    const prevUid = authUser?.uid;
    await supabase.auth.signOut().catch(() => {});
    loadedUidRef.current = null;
    setCurrentUserId(undefined);
    setAuthUser(null);
    setProfile(null);
    setCourses([]);
    setSchedule([]);
    setHubs({});
    setGroups([]);
    setActiveTab('dashboard');
    try {
      localStorage.removeItem('korsiq_active_tab');
    } catch {}
    setShowAuth(true);
    setAuthMode('signin');
    setSessionExpiredMsg(null);
    if (prevUid) {
      DBService.clearUserCache(prevUid);
    }
  };

  const deleteAccount = () => {
    if (window.confirm("Are you absolutely sure you want to delete your account? This action is irreversible.")) {
      handleSignOut();
    }
  };

  const addNotification = async (type: AppNotification['type'], title: string, message: string, link?: AppState) => {
    if (!profile) return;
    if (type === 'message' && !profile.notifications?.messages) return;
    if (type === 'session' && !profile.notifications?.sessions) return;
    if (type === 'content' && !profile.notifications?.aiContent) return;

    if (authUser) {
      const persisted = await DBService.createNotification(authUser.uid, {
        type,
        title,
        message,
        read: false,
        link
      });
      setNotifications(prev => [persisted, ...prev.filter(p => p.id !== persisted.id)]);
    } else {
      const fallbackNotif: AppNotification = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        title,
        message,
        timestamp: Date.now(),
        read: false,
        link
      };
      setNotifications(prev => [fallbackNotif, ...prev]);
    }
  };

  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [isClearingNotifications, setIsClearingNotifications] = useState(false);
  const notificationScrollRef = useRef<HTMLDivElement>(null);

  // Load real persistent notifications from database
  useEffect(() => {
    if (!authUser) return;
    const loadDbNotifications = async () => {
      try {
        const dbNotifs = await DBService.getNotifications(authUser.uid);
        if (dbNotifs && dbNotifs.length > 0) {
          setNotifications(dbNotifs);
        } else {
          // If brand new user with no notifications in DB, create initial welcome notif
          const welcome = await DBService.createNotification(authUser.uid, {
            type: 'content',
            title: 'Welcome to KorsIQ',
            message: 'Your AI Academic Studio is active. Explore your dashboard and generate study plans!',
            read: false,
            link: 'dashboard'
          });
          setNotifications([welcome]);
        }
      } catch (err) {
        console.warn('Failed to load database notifications:', err);
      }
    };
    loadDbNotifications();
  }, [authUser]);

  // Mark single notification as read in DB and state
  const handleMarkNotificationRead = async (notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    if (authUser) {
      await DBService.markNotificationAsRead(authUser.uid, notifId);
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (authUser) {
      await DBService.markAllNotificationsAsRead(authUser.uid);
    }
  };

  const handleMarkAllAsReadAnimated = () => {
    if (isMarkingAllRead) return;
    setIsMarkingAllRead(true);
    markAllAsRead();
    setTimeout(() => {
      setIsMarkingAllRead(false);
    }, 400);
  };

  const clearNotifications = async () => {
    setNotifications([]);
    if (authUser) {
      await DBService.clearAllNotifications(authUser.uid);
    }
  };

  const handleClearAllAnimated = () => {
    if (isClearingNotifications) return;
    setIsClearingNotifications(true);
    clearNotifications();
    setTimeout(() => {
      setIsClearingNotifications(false);
    }, 300);
  };

  const handleEnableBrowserNotifs = async () => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted' && profile && authUser) {
          const updated: UserProfile = {
            ...profile,
            notifications: { ...profile.notifications, browserPush: true }
          };
          setProfile(updated);
          await DBService.saveProfile(authUser.uid, updated);
          addNotification('content', 'Browser Notifications Enabled', 'You will now receive timely reminders for deadlines and study sessions.');
        }
      }
    } catch (err) {
      console.warn('Notification permission error:', err);
    } finally {
      setShowNotifPermissionBanner(false);
      try {
        localStorage.setItem('korsiq_notif_prompt_dismissed', 'true');
      } catch {}
    }
  };

  const handleDismissNotifBanner = () => {
    setShowNotifPermissionBanner(false);
    try {
      localStorage.setItem('korsiq_notif_prompt_dismissed', 'true');
    } catch {}
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // 0. Admin Portal Route Handling (/admin) — independent of student auth loading
  if (isAdminRoute) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <AdminApp 
          onExit={() => {
            window.history.pushState({}, '', '/');
            setIsAdminRoute(false);
          }} 
        />
      </Suspense>
    );
  }

  // 1. Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl shadow-xl mb-4">
          <KorsIQLogo variant="icon" size={32} onDark />
        </div>
        <p className="text-xs font-medium text-slate-500">
          Loading session...
        </p>
      </div>
    );
  }

  // 1.5 Password Recovery Flow
  if (isPasswordRecovery) {
    return (
      <Auth 
        onAuthSuccess={() => {
          setIsPasswordRecovery(false);
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', window.location.pathname);
          }
          setSessionExpiredMsg(null);
        }} 
        initialMode="reset_password"
        isDirectRecovery={true}
        onRecoveryComplete={() => {
          setIsPasswordRecovery(false);
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }}
      />
    );
  }

  // 2. Unauthenticated State
  if (!authUser) {
    if (showAuth) {
      return (
        <Auth 
          onAuthSuccess={() => setSessionExpiredMsg(null)} 
          onCancel={() => {
            setShowAuth(false);
            setSessionExpiredMsg(null);
          }}
          initialMode={authMode} 
          sessionExpiredMsg={sessionExpiredMsg}
        />
      );
    }
    return (
      <Suspense fallback={<PageSkeleton />}>
        <LandingPage 
          onStart={() => {
            setAuthMode('signup');
            setShowAuth(true);
          }} 
          onSignIn={() => {
            setAuthMode('signin');
            setShowAuth(true);
          }} 
        />
      </Suspense>
    );
  }

  // 4. Loading User Data / Profile State
  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl mb-4 animate-spin">
          <GraduationCap size={24} />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
          Loading Academic Records...
        </p>
      </div>
    );
  }

  // 5. Onboarding View
  if (profile && !profile.onboarded) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <Onboarding userEmail={profile.email} initialProfile={profile} onComplete={handleOnboardingComplete} />
      </Suspense>
    );
  }

  // 6. Main Protected Application View
  const renderDashboard = () => (
    <Dashboard 
      profile={profile} 
      courses={courses} 
      schedule={schedule} 
      onOpenHub={(id) => { setSelectedCourseId(id); setActiveTab('hub'); }}
      onNavigate={(tab) => { setActiveTab(tab); }}
      onUpdateProfile={(updated) => setProfile(updated)}
      onAddCourse={handleQuickAddCourse}
      onOpenAddCourse={handleOpenAddCourseFlow}
    />
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
      case 'dashboard':
        return renderDashboard();
      case 'planner':
        return <StudyPlannerView 
          initialTab={openAddCourseSignal > 0 ? 'courses' : 'today'}
          openAddCourseSignal={openAddCourseSignal}
          courses={courses}
          setCourses={setCourses}
          schedule={schedule}
          setSchedule={setSchedule}
          profile={profile}
          onUpdateProfile={handleSaveProfile}
          addNotification={addNotification}
          onOpenHub={(id) => { setSelectedCourseId(id); setActiveTab('hub'); }}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          hubs={hubs}
        />;
      case 'courses':
        return <StudyPlannerView 
          initialTab="courses"
          openAddCourseSignal={openAddCourseSignal}
          courses={courses}
          setCourses={setCourses}
          schedule={schedule}
          setSchedule={setSchedule}
          profile={profile}
          onUpdateProfile={handleSaveProfile}
          addNotification={addNotification}
          onOpenHub={(id) => { setSelectedCourseId(id); setActiveTab('hub'); }}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          hubs={hubs}
        />;
      case 'calculator':
        return <StudyPlannerView 
          initialTab="cgpa"
          courses={courses}
          setCourses={setCourses}
          schedule={schedule}
          setSchedule={setSchedule}
          profile={profile}
          onUpdateProfile={handleSaveProfile}
          addNotification={addNotification}
          onOpenHub={(id) => { setSelectedCourseId(id); setActiveTab('hub'); }}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          hubs={hubs}
        />;
      case 'timetable':
        return <StudyPlannerView 
          initialTab="timetable"
          courses={courses}
          setCourses={setCourses}
          schedule={schedule}
          setSchedule={setSchedule}
          profile={profile}
          onUpdateProfile={handleSaveProfile}
          addNotification={addNotification}
          onOpenHub={(id) => { setSelectedCourseId(id); setActiveTab('hub'); }}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          hubs={hubs}
        />;
      case 'schedule':
        return <StudyPlannerView 
          initialTab="revision"
          courses={courses}
          setCourses={setCourses}
          schedule={schedule}
          setSchedule={setSchedule}
          profile={profile}
          onUpdateProfile={handleSaveProfile}
          addNotification={addNotification}
          onOpenHub={(id) => { setSelectedCourseId(id); setActiveTab('hub'); }}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          hubs={hubs}
        />;
      case 'analytics':
        return <StudyPlannerView 
          initialTab="today"
          courses={courses}
          setCourses={setCourses}
          schedule={schedule}
          setSchedule={setSchedule}
          profile={profile}
          onUpdateProfile={handleSaveProfile}
          addNotification={addNotification}
          onOpenHub={(id) => { setSelectedCourseId(id); setActiveTab('hub'); }}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          hubs={hubs}
        />;
      case 'resources':
      case 'library':
        return <ResourcesView 
          courses={courses}
          groups={groups}
          profile={profile}
          onOpenHub={(id) => { setSelectedCourseId(id); setActiveTab('hub'); }}
        />;
      case 'hub':
        return <StudyHub 
          courses={courses} 
          selectedCourseId={selectedCourseId} 
          hubs={hubs} 
          setHubs={setHubs}
          groups={groups}
          setGroups={setGroups}
          profile={profile}
          addNotification={addNotification}
          onCourseIdChange={setSelectedCourseId}
          onNavigate={(tab) => { setActiveTab(tab as AppState); }}
        />;
      case 'circles':
      case 'groups':
        return <StudyGroups 
          profile={profile} 
          userId={authUser?.uid}
          groups={groups} 
          setGroups={setGroups} 
          hubs={hubs}
          addNotification={addNotification}
        />;
      case 'studio':
        return <AcademicStudio 
          userId={authUser.uid} 
          profile={profile} 
          courses={courses}
          addNotification={addNotification}
          setProfile={handleSaveProfile} 
          onNavigateTab={(tab) => setActiveTab(tab as AppState)}
          onFocusModeChange={(focused) => {
            setIsStudioFocusMode(focused);
            if (focused) setSidebarManualOverride(null);
          }}
        />;
      case 'pomodoro':
        return <PomodoroTimer />;
      case 'settings':
      case 'profile':
        return <Profile profile={profile} setProfile={handleSaveProfile} onSignOut={handleSignOut} onDelete={deleteAccount} />;
      default:
        return renderDashboard();
    }
  };

  // Desktop Sidebar Navigation Items
  const desktopNavItems = [
    { id: 'overview', label: 'Overview', icon: ICONS.Dashboard },
    { id: 'planner', label: 'Study Planner', icon: ICONS.Courses },
    { id: 'hub', label: 'Study Hub', icon: ICONS.StudyHub },
    { id: 'circles', label: 'Study Circles', icon: ICONS.Groups },
    { id: 'studio', label: 'Academic Studio', icon: ICONS.Studio },
    { id: 'resources', label: 'Library', icon: ICONS.Library },
    { id: 'settings', label: 'Settings', icon: ICONS.Settings },
  ];

  // Mobile Bottom Bar (Exactly 5 destinations per spec: Home, Planner, Study Hub, Circles, Studio)
  const mobileNavItems = [
    { id: 'overview', label: 'Home', icon: ICONS.Dashboard },
    { id: 'planner', label: 'Planner', icon: ICONS.Courses },
    { id: 'hub', label: 'Study Hub', icon: ICONS.StudyHub },
    { id: 'circles', label: 'Circles', icon: ICONS.Groups },
    { id: 'studio', label: 'Studio', icon: ICONS.Studio },
  ];

  const isNavActive = (id: string) => {
    if (id === 'overview') return activeTab === 'overview' || activeTab === 'dashboard';
    if (id === 'planner') return ['planner', 'courses', 'schedule', 'timetable', 'calculator'].includes(activeTab);
    if (id === 'hub') return activeTab === 'hub';
    if (id === 'studio') return activeTab === 'studio';
    if (id === 'circles') return activeTab === 'circles' || activeTab === 'groups';
    if (id === 'resources') return activeTab === 'resources' || activeTab === 'library';
    if (id === 'settings') return activeTab === 'settings' || activeTab === 'profile';
    return activeTab === id;
  };

  const currentNavTitle = desktopNavItems.find(item => isNavActive(item.id))?.label || 'Overview';

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans text-[#111827] dark:text-slate-100 overflow-hidden relative">
      {/* Mobile Top Header Bar per Spec (Logo, Bell, Theme, Initials Avatar) */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-slate-900 border-b border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <KorsIQLogo variant="full" size={28} />
        </div>

        <div className="flex items-center gap-1">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            className="p-2 text-[#5B6472] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-colors"
          >
            {isDarkMode ? <Sun size={17} className="text-amber-500" /> : <Moon size={17} className="text-[#5B6472]" />}
          </button>

          {/* Notifications Trigger */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
            className={`p-2 rounded-lg transition-colors relative min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer ${
              showNotifications 
                ? 'bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-950 dark:text-blue-400' 
                : 'text-[#5B6472] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {ICONS.Bell}
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#2563EB] rounded-full" />
            )}
          </button>

          {/* Avatar Profile Trigger */}
          <button
            onClick={() => setActiveTab('settings')}
            aria-label="Account Settings"
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          >
            <UserAvatar 
              name={profile?.name || 'User'}
              size="xs"
              useInitials
            />
          </button>
        </div>
      </header>

      {/* Desktop and Tablet Fixed Sidebar (Collapsible to icon-only rail in Studio Focus Mode) */}
      <aside
        data-desktop-sidebar-collapsed={isDesktopSidebarCollapsed ? 'true' : 'false'}
        className={`hidden md:flex flex-col bg-white dark:bg-slate-900 border-r border-[#E5E7EB] dark:border-slate-800 shrink-0 z-30 transition-[width] duration-200 ${
          isDesktopSidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className={`h-16 flex items-center border-b border-[#E5E7EB] dark:border-slate-800 ${isDesktopSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          {!isDesktopSidebarCollapsed && <KorsIQLogo variant="full" size={30} showSubtitle />}
          <button
            type="button"
            onClick={() =>
              setSidebarManualOverride(isDesktopSidebarCollapsed ? 'expanded' : 'collapsed')
            }
            title={isDesktopSidebarCollapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
            aria-label={isDesktopSidebarCollapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
            className="p-2 rounded-lg text-[#5B6472] hover:text-[#111827] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
          >
            {isDesktopSidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
        
        {/* Navigation Items: Light blue bg with Primary blue text/icon when active */}
        <nav className={`flex-1 py-4 space-y-1.5 overflow-y-auto ${isDesktopSidebarCollapsed ? 'px-2' : 'px-3'}`}>
          {desktopNavItems.map((item) => {
            const isActive = isNavActive(item.id);
            return (
              <button
                key={item.id}
                title={isDesktopSidebarCollapsed ? item.label : undefined}
                aria-label={item.label}
                onClick={() => {
                  setActiveTab(item.id as AppState);
                }}
                className={`w-full flex items-center rounded-lg text-xs font-medium transition-colors min-h-[44px] cursor-pointer ${
                  isDesktopSidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3 py-2.5'
                } ${
                  isActive 
                    ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold dark:bg-blue-950/60 dark:text-blue-400' 
                    : 'text-[#5B6472] dark:text-slate-400 hover:text-[#111827] dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className={isActive ? 'text-[#2563EB] dark:text-blue-400' : 'text-[#5B6472] dark:text-slate-400'}>
                  {item.icon}
                </div>
                {!isDesktopSidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className={`border-t border-[#E5E7EB] dark:border-slate-800 space-y-2 ${isDesktopSidebarCollapsed ? 'p-2' : 'p-3'}`}>
          <button
            onClick={toggleTheme}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            className={`w-full flex items-center rounded-lg text-xs font-medium text-[#5B6472] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px] ${
              isDesktopSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3 py-2'
            }`}
          >
            <span className="flex items-center gap-2">
              {isDarkMode ? <Sun size={15} className="text-amber-500" /> : <Moon size={15} className="text-[#5B6472]" />}
              {!isDesktopSidebarCollapsed && <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
            </span>
            {!isDesktopSidebarCollapsed && (
              <span className="text-[10px] font-mono uppercase text-slate-400">
                {isDarkMode ? 'DARK' : 'LIGHT'}
              </span>
            )}
          </button>

          <div className="flex items-center justify-between pt-1">
            <button 
              title={isDesktopSidebarCollapsed ? (profile?.name || 'Profile') : undefined}
              onClick={() => {
                setActiveTab('settings');
              }}
              className={`flex-1 flex items-center rounded-lg text-left transition-colors min-h-[44px] cursor-pointer ${
                isDesktopSidebarCollapsed ? 'justify-center px-1 py-2' : 'gap-2.5 px-2.5 py-2'
              } ${
                isNavActive('settings') 
                  ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold dark:bg-blue-950/60 dark:text-blue-400' 
                  : 'text-[#111827] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <UserAvatar 
                name={profile?.name || 'Profile'}
                size="xs"
                useInitials
                showStatus
                isOnline={dbConnected ?? true}
              />
              {!isDesktopSidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[#111827] dark:text-white truncate">
                    {profile?.name || 'Profile'}
                  </p>
                  <p className="text-[10px] text-[#5B6472] truncate">
                    {profile?.university || 'Student'}
                  </p>
                </div>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop & Tablet Top Header Bar (hidden in Studio Focus Mode to avoid stacked headers) */}
        {!isEdgeToEdgeStudio && (
        <header className="hidden md:flex h-16 bg-white dark:bg-slate-900 border-b border-[#E5E7EB] dark:border-slate-800 items-center justify-between px-8 z-20 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#5B6472] font-medium">KorsIQ</span>
            <span className="text-[#E5E7EB] dark:text-slate-700">/</span>
            <span className="text-[#111827] dark:text-slate-100 font-semibold">{currentNavTitle}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications Trigger */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2.5 rounded-lg transition-colors relative min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer ${
                showNotifications 
                  ? 'bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-950 dark:text-blue-400' 
                  : 'text-[#5B6472] hover:text-[#111827] dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Notifications"
              aria-label="Notifications"
            >
              {ICONS.Bell}
              {unreadCount > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#2563EB] rounded-full" />
              )}
            </button>

            {/* Profile Avatar Pill */}
            <button
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-2 p-1 pl-2 pr-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer min-h-[44px]"
              aria-label="Open Settings"
            >
              <UserAvatar 
                name={profile?.name || 'Profile'}
                size="xs"
                useInitials
              />
              <span className="text-xs font-medium text-[#111827] dark:text-slate-200">
                {profile?.name ? profile.name.split(' ')[0] : 'Settings'}
              </span>
            </button>
          </div>
        </header>
        )}

        {/* Scrollable Main Area */}
        <main className={`flex-1 bg-[#F8FAFC] dark:bg-slate-950 text-[#111827] dark:text-slate-100 relative pt-14 md:pt-0 ${isEdgeToEdgeStudio ? 'overflow-hidden pb-14 md:pb-0' : 'overflow-y-auto pb-24 md:pb-8'}`}>
          {showNotifications && (
            <div className="absolute top-4 right-4 sm:right-8 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-xl rounded-lg z-50 overflow-hidden">
              <div className="p-4 border-b border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-[#111827] dark:text-slate-100">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-[#EFF6FF] text-[#2563EB] text-[10px] font-bold rounded-full border border-blue-200">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAllAsReadAnimated}
                      disabled={isMarkingAllRead}
                      className="text-[11px] font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 min-h-[44px] px-2"
                      title="Mark all notifications as read"
                    >
                      <CheckCheck size={13} />
                      <span>{isMarkingAllRead ? 'Marking...' : 'Mark all read'}</span>
                    </button>
                  )}
                  <button 
                    onClick={() => setShowNotifications(false)} 
                    className="text-[#5B6472] hover:text-[#111827] transition-colors p-2 rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                    aria-label="Close notifications"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div 
                ref={notificationScrollRef}
                className="max-h-[380px] overflow-y-auto divide-y divide-[#E5E7EB] dark:divide-slate-800"
              >
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#5B6472] font-medium">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map(n => {
                    const isUnread = !n.read;
                    return (
                      <div 
                        key={n.id} 
                        onClick={() => {
                          if (n.link) setActiveTab(n.link);
                          setShowNotifications(false);
                          handleMarkNotificationRead(n.id);
                        }}
                        className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer flex items-start gap-3 ${
                          isUnread ? 'bg-[#EFF6FF]/50 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isUnread ? 'bg-[#2563EB]' : 'bg-transparent'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className={`text-xs ${isUnread ? 'font-semibold text-[#111827] dark:text-slate-100' : 'font-medium text-slate-700 dark:text-slate-300'} truncate`}>
                              {n.title}
                            </h4>
                            <span className="text-[10px] text-[#5B6472] shrink-0">
                              {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-[#5B6472] dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {notifications.length > 0 && (
                <button 
                  onClick={handleClearAllAnimated}
                  disabled={isClearingNotifications}
                  className="w-full p-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 border-t border-[#E5E7EB] dark:border-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  <Trash2 size={12} />
                  <span>{isClearingNotifications ? 'Clearing...' : 'Clear all'}</span>
                </button>
              )}
            </div>
          )}

          <div className={isEdgeToEdgeStudio ? 'h-full w-full' : 'container mx-auto px-4 py-6 sm:px-6 sm:py-8 max-w-6xl'}>
            {/* Paystack Return Verification Banner */}
            {paymentReturnBanner && (
              <div
                role="status"
                className={`mb-6 p-4 rounded-lg border flex items-center justify-between gap-3 text-xs font-medium ${
                  paymentReturnBanner.status === 'verifying'
                    ? 'bg-[#EFF6FF] dark:bg-blue-950/60 border-blue-200 dark:border-blue-900 text-[#1D4ED8] dark:text-blue-200'
                    : paymentReturnBanner.status === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
                }`}
              >
                <span>{paymentReturnBanner.message}</span>
                {paymentReturnBanner.status !== 'verifying' && (
                  <button
                    type="button"
                    onClick={() => setPaymentReturnBanner(null)}
                    className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer shrink-0"
                    aria-label="Dismiss payment status banner"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Notification Permission Pre-Prompt Banner */}
            {showNotifPermissionBanner && (
              <div className="mb-6 p-4 bg-[#EFF6FF] dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-[#2563EB] text-white rounded-lg shrink-0 mt-0.5">
                    {ICONS.Bell}
                  </div>
                  <div>
                    <p className="font-semibold text-[#111827] dark:text-white">Enable study &amp; deadline reminders</p>
                    <p className="text-[#5B6472] dark:text-slate-300 mt-0.5 leading-relaxed">
                      KorsIQ can send browser reminders before assignments are due, when revisions start, and when exam dates approach.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    onClick={handleDismissNotifBanner}
                    className="px-3 py-1.5 text-[#5B6472] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white font-medium min-h-[44px] cursor-pointer"
                  >
                    Not now
                  </button>
                  <button
                    onClick={handleEnableBrowserNotifs}
                    className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-lg shadow-sm min-h-[44px] cursor-pointer"
                  >
                    Enable alerts
                  </button>
                </div>
              </div>
            )}

            <Suspense fallback={<PageSkeleton />}>
              {renderContent()}
            </Suspense>
          </div>
        </main>

        {/* Mobile Pinned Bottom Navigation Bar (Visible ONLY on mobile devices) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-t border-[#E5E7EB] dark:border-slate-800 grid grid-cols-5 z-40 px-1">
          {mobileNavItems.map((item) => {
            const isActive = isNavActive(item.id);
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as AppState)}
                className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] cursor-pointer ${
                  isActive ? 'text-[#2563EB] dark:text-blue-400 font-semibold' : 'text-[#5B6472] dark:text-slate-400'
                }`}
              >
                <div className="scale-90">{item.icon}</div>
                <span className="text-[10px] mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {profile && profile.onboarded && !profile.tutorialSeen && (
        <Suspense fallback={null}>
          <Tutorial onComplete={handleTutorialComplete} />
        </Suspense>
      )}
    </div>
  );
};

export default App;
