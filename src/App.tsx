import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Menu,
  Plus,
} from 'lucide-react';
import { AuthGate } from './components/AuthGate';
import { BudgetPanel } from './components/BudgetPanel';
import { Sidebar, type WorkspaceTab } from './components/Sidebar';
import { TransactionModal } from './components/TransactionModal';
import { TransactionTable } from './components/TransactionTable';
import { CategoryDonutChart } from './components/charts/CategoryDonutChart';
import { DailyCashflowChart } from './components/charts/DailyCashflowChart';
import { MonthlyBarChart } from './components/charts/MonthlyBarChart';
import { FIREBASE_PROJECT_INFO, auth, googleProvider } from './firebase';
import {
  createTransaction,
  ensureUserProfile,
  removeTransaction,
  saveDefaultBudget,
  saveMonthlyBudget,
  subscribeBudgets,
  subscribeTransactions,
  subscribeUserProfile,
  updateTransaction,
} from './services/firestoreService';
import type {
  MonthlyBudget,
  Transaction,
  TransactionInput,
  TransactionType,
  UserProfile,
} from './types/finance';
import {
  computeCategoryBreakdown,
  computeDailyCashflow,
  computeMonthlySummary,
  computeSixMonthTrend,
  deriveMonthKey,
  filterTransactions,
  formatTHB,
  formatThaiMonth,
  getCurrentMonthKey,
  resolveMonthBudgetLimit,
  sanitizeTransactionInput,
  shiftMonthKey,
  transactionsToCSV,
} from './utils/finance';
import { buildDemoBudgets, buildDemoSeedTransactions } from './utils/seedData';

const DEMO_STORAGE_KEY = 'finance_69319100021db_demo_v1';

const TAB_TITLES: Record<WorkspaceTab, string> = {
  overview: 'ภาพรวมรายเดือน',
  transactions: 'รายการเดินบัญชี',
  analytics: 'วิเคราะห์กราฟเชิงลึก',
  budget: 'งบประมาณรายเดือน',
};

function readAutostartParam(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('autostart') === '1';
}

export default function App() {
  const initialMonth = useMemo(() => getCurrentMonthKey(), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth & Demo state
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => readAutostartParam());
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Data state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  // Demo persistent state
  const [demoDefaultBudget, setDemoDefaultBudget] = useState<number>(30000);

  // Filters & charts state
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [donutType, setDonutType] = useState<TransactionType>('expense');

  // Modals
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [pendingDeleteTx, setPendingDeleteTx] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Subscribe to Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        setIsDemoMode(false);
        setAuthError(null);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Load Demo mode data
  useEffect(() => {
    if (!isDemoMode || firebaseUser) return;

    try {
      const savedRaw = localStorage.getItem(DEMO_STORAGE_KEY);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw) as {
          transactions?: Transaction[];
          budgets?: MonthlyBudget[];
          defaultBudget?: number;
        };
        if (Array.isArray(parsed.transactions)) {
          setTransactions(parsed.transactions);
          setBudgets(Array.isArray(parsed.budgets) ? parsed.budgets : buildDemoBudgets(initialMonth));
          setDemoDefaultBudget(typeof parsed.defaultBudget === 'number' ? parsed.defaultBudget : 30000);
          return;
        }
      }
    } catch {
      // Fallback to fresh seed
    }

    setTransactions(buildDemoSeedTransactions(initialMonth));
    setBudgets(buildDemoBudgets(initialMonth));
    setDemoDefaultBudget(30000);
  }, [isDemoMode, firebaseUser, initialMonth]);

  // Persist Demo mode mutations
  useEffect(() => {
    if (!isDemoMode || firebaseUser) return;
    try {
      localStorage.setItem(
        DEMO_STORAGE_KEY,
        JSON.stringify({
          transactions,
          budgets,
          defaultBudget: demoDefaultBudget,
        })
      );
    } catch {
      // Ignore storage quota issues
    }
  }, [isDemoMode, firebaseUser, transactions, budgets, demoDefaultBudget]);

  // Subscribe to Firestore when authenticated
  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    let unsubProfile: (() => void) | undefined;
    let unsubTx: (() => void) | undefined;
    let unsubBudgets: (() => void) | undefined;
    let cancelled = false;

    setDataLoading(true);
    setAppError(null);

    const handleErr = (err: Error) => {
      if (cancelled) return;
      if (err.message.includes('Quota exceeded')) {
        setAppError(
          `ใช้งานเกินโควตาการอ่านข้อมูลรายวันของ Firebase ฟรี (Quota exceeded) กรุณารอรีเซ็ตในวันถัดไป หรือตรวจสอบที่คอนโซลโครงการ ${FIREBASE_PROJECT_INFO.projectId}`
        );
      } else {
        setAppError('ไม่สามารถซิงค์ข้อมูลกับ Firebase Firestore ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
      }
      setDataLoading(false);
    };

    ensureUserProfile(firebaseUser)
      .then((initialProfile) => {
        if (cancelled) return;
        setProfile(initialProfile);
        unsubProfile = subscribeUserProfile(
          firebaseUser.uid,
          (nextProfile) => {
            if (nextProfile) setProfile(nextProfile);
          },
          handleErr
        );
        unsubTx = subscribeTransactions(
          firebaseUser.uid,
          (items) => {
            setTransactions(items);
            setDataLoading(false);
          },
          handleErr
        );
        unsubBudgets = subscribeBudgets(
          firebaseUser.uid,
          (items) => {
            setBudgets(items);
          },
          handleErr
        );
      })
      .catch((err) => {
        handleErr(err instanceof Error ? err : new Error(String(err)));
      });

    return () => {
      cancelled = true;
      unsubProfile?.();
      unsubTx?.();
      unsubBudgets?.();
    };
  }, [authReady, firebaseUser]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setIsDemoMode(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('popup-closed-by-user')) {
        setAuthError('คุณปิดหน้าต่างเข้าสู่ระบบ Google ก่อนดำเนินการเสร็จสิ้น');
      } else if (msg.includes('popup-blocked')) {
        setAuthError('เบราว์เซอร์บล็อกป๊อปอัป กรุณาอนุญาตป๊อปอัปสำหรับเว็บไซต์นี้แล้วลองใหม่อีกครั้ง');
      } else if (msg.includes('unauthorized-domain')) {
        setAuthError(
          `โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase Auth ของโครงการ ${FIREBASE_PROJECT_INFO.projectId} คุณสามารถทดลองใช้งานผ่านโหมดตัวอย่างได้`
        );
      } else {
        setAuthError('เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Gmail กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    if (firebaseUser) {
      await signOut(auth);
      setProfile(null);
      setTransactions([]);
      setBudgets([]);
    }
    setIsDemoMode(false);
  };

  const defaultBudget = firebaseUser
    ? profile?.defaultMonthlyBudget ?? 30000
    : demoDefaultBudget;

  const activeBudgetLimit = useMemo(
    () => resolveMonthBudgetLimit(selectedMonth, budgets, defaultBudget),
    [selectedMonth, budgets, defaultBudget]
  );

  const monthlySummary = useMemo(
    () => computeMonthlySummary(transactions, selectedMonth, activeBudgetLimit),
    [transactions, selectedMonth, activeBudgetLimit]
  );

  const monthTransactions = useMemo(
    () => filterTransactions(transactions, { monthKey: selectedMonth }),
    [transactions, selectedMonth]
  );

  const filteredTransactions = useMemo(
    () =>
      filterTransactions(transactions, {
        monthKey: selectedMonth,
        type: typeFilter,
        category: categoryFilter,
        searchQuery,
      }),
    [transactions, selectedMonth, typeFilter, categoryFilter, searchQuery]
  );

  const expenseBreakdown = useMemo(
    () => computeCategoryBreakdown(monthTransactions, 'expense'),
    [monthTransactions]
  );

  const incomeBreakdown = useMemo(
    () => computeCategoryBreakdown(monthTransactions, 'income'),
    [monthTransactions]
  );

  const sixMonthTrend = useMemo(
    () => computeSixMonthTrend(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  const dailyCashflow = useMemo(
    () => computeDailyCashflow(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  const handleSaveTransaction = async (input: TransactionInput, existingId?: string) => {
    setAppError(null);
    const clean = sanitizeTransactionInput(input);
    const derivedMonth = deriveMonthKey(clean.date);

    if (firebaseUser) {
      if (existingId) {
        await updateTransaction(firebaseUser.uid, existingId, clean);
      } else {
        await createTransaction(firebaseUser.uid, clean);
      }
    } else if (isDemoMode) {
      if (existingId) {
        setTransactions((prev) =>
          prev.map((tx) =>
            tx.id === existingId
              ? { ...tx, ...clean, monthKey: derivedMonth }
              : tx
          )
        );
      } else {
        const newTx: Transaction = {
          id: `demo-${Date.now()}`,
          userId: 'demo-user',
          ...clean,
          monthKey: derivedMonth,
        };
        setTransactions((prev) => [newTx, ...prev]);
      }
    }

    if (derivedMonth && derivedMonth !== selectedMonth) {
      setSelectedMonth(derivedMonth);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteTx) return;
    setIsDeleting(true);
    setAppError(null);
    try {
      if (firebaseUser) {
        await removeTransaction(firebaseUser.uid, pendingDeleteTx.id);
      } else if (isDemoMode) {
        setTransactions((prev) => prev.filter((tx) => tx.id !== pendingDeleteTx.id));
      }
      setPendingDeleteTx(null);
    } catch {
      setAppError('ไม่สามารถลบรายการได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveMonthBudget = async (limitAmount: number) => {
    if (firebaseUser) {
      await saveMonthlyBudget(firebaseUser.uid, selectedMonth, limitAmount);
    } else if (isDemoMode) {
      setBudgets((prev) => {
        const exists = prev.some((b) => b.monthKey === selectedMonth);
        if (exists) {
          return prev.map((b) =>
            b.monthKey === selectedMonth ? { ...b, limitAmount } : b
          );
        }
        return [
          ...prev,
          {
            id: selectedMonth,
            userId: 'demo-user',
            monthKey: selectedMonth,
            limitAmount,
          },
        ];
      });
    }
  };

  const handleSaveDefaultBudget = async (limitAmount: number) => {
    if (firebaseUser) {
      await saveDefaultBudget(firebaseUser.uid, limitAmount);
    } else if (isDemoMode) {
      setDemoDefaultBudget(limitAmount);
    }
  };

  const handleExportCsv = () => {
    const csvContent = transactionsToCSV(filteredTransactions);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `69319100021db-${selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!authReady && !isDemoMode) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="text-sm text-slate-500">กำลังตรวจสอบสถานะบัญชี...</div>
      </div>
    );
  }

  if (!firebaseUser && !isDemoMode) {
    return (
      <AuthGate
        onSignInWithGoogle={handleGoogleSignIn}
        onEnterDemoMode={() => setIsDemoMode(true)}
        isSigningIn={isSigningIn}
        errorMessage={authError}
      />
    );
  }

  const displayName = firebaseUser
    ? profile?.displayName || firebaseUser.displayName || 'ผู้ใช้งาน Gmail'
    : 'บัญชีตัวอย่าง (Demo)';
  const displayEmail = firebaseUser
    ? profile?.email || firebaseUser.email || ''
    : 'demo@69319100021db.local';
  const displayPhoto = firebaseUser ? profile?.photoURL || firebaseUser.photoURL || undefined : undefined;

  const remainingBudget = monthlySummary.budgetLimit - monthlySummary.totalExpense;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <Sidebar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        userName={displayName}
        userEmail={displayEmail}
        userPhoto={displayPhoto}
        isDemoMode={!firebaseUser && isDemoMode}
        onSignOut={handleSignOut}
        onSwitchToGoogleLogin={handleGoogleSignIn}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="เปิดเมนูนำทาง"
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 shrink-0 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-slate-400 whitespace-nowrap">69319100021db</span>
              <span className="hidden sm:inline text-slate-300" aria-hidden="true">/</span>
              <h1 className="font-semibold text-slate-900 truncate">
                {TAB_TITLES[activeTab]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden sm:inline-flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setSelectedMonth((m) => shiftMonthKey(m, -1))}
                aria-label="เดือนก่อนหน้า"
                className="min-h-[38px] px-2.5 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="relative flex items-center border-x border-slate-200">
                <span className="px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap pointer-events-none select-none">
                  {formatThaiMonth(selectedMonth)}
                </span>
                <label htmlFor="header-month-picker" className="sr-only">
                  เลือกเดือนที่ต้องการดูสรุป
                </label>
                <input
                  id="header-month-picker"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    if (e.target.value) setSelectedMonth(e.target.value);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <button
                type="button"
                onClick={() => setSelectedMonth((m) => shiftMonthKey(m, 1))}
                aria-label="เดือนถัดไป"
                className="min-h-[38px] px-2.5 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingTx(null);
                setTxModalOpen(true);
              }}
              className="min-h-[40px] px-3.5 sm:px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>บันทึกรายการ</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {appError && (
            <div
              role="alert"
              className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-800 flex items-center gap-3"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" aria-hidden="true" />
              <span>{appError}</span>
            </div>
          )}

          {!firebaseUser && isDemoMode && (
            <div className="px-4 py-3 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
              <span>
                กำลังใช้งานใน <strong>โหมดตัวอย่าง (Demo)</strong> — ข้อมูลถูกจำลองไว้ในเครื่องของคุณ
              </span>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="font-semibold text-[#0F766E] hover:underline cursor-pointer whitespace-nowrap"
              >
                เข้าสู่ระบบด้วย Gmail เพื่อบันทึกลง Firebase จริง
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                สรุปการเงินประจำเดือน {formatThaiMonth(selectedMonth)}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                {monthlySummary.transactionCount} รายการในเดือนนี้ · รับ {monthlySummary.incomeCount} · จ่าย {monthlySummary.expenseCount}
              </p>
            </div>

            <div className="inline-flex sm:hidden items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setSelectedMonth((m) => shiftMonthKey(m, -1))}
                aria-label="เดือนก่อนหน้า (มือถือ)"
                className="min-h-[38px] px-2.5 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-semibold text-slate-900 border-x border-slate-200 whitespace-nowrap">
                {formatThaiMonth(selectedMonth)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedMonth((m) => shiftMonthKey(m, 1))}
                aria-label="เดือนถัดไป (มือถือ)"
                className="min-h-[38px] px-2.5 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 4-column KPI Strip */}
          <section
            aria-label="สรุปตัวเลขสำคัญประจำเดือน"
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
          >
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <span className="text-xs font-medium text-slate-500 block">
                รายรับรวมเดือนนี้
              </span>
              <p className="text-2xl font-bold text-[#16A34A] font-mono-tabular">
                {formatTHB(monthlySummary.totalIncome)}
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                {monthlySummary.incomeCount} รายการรายรับ
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <span className="text-xs font-medium text-slate-500 block">
                รายจ่ายรวมเดือนนี้
              </span>
              <p className="text-2xl font-bold text-[#DC2626] font-mono-tabular">
                {formatTHB(monthlySummary.totalExpense)}
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                {monthlySummary.expenseCount} รายการรายจ่าย
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <span className="text-xs font-medium text-slate-500 block">
                ยอดเงินคงเหลือสุทธิ
              </span>
              <p
                className={`text-2xl font-bold font-mono-tabular ${
                  monthlySummary.netBalance >= 0 ? 'text-slate-900' : 'text-[#DC2626]'
                }`}
              >
                {formatTHB(monthlySummary.netBalance, true)}
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                อัตราการออม{' '}
                <span className="font-semibold text-slate-700">
                  {monthlySummary.savingsRate.toFixed(1)}%
                </span>
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">
                  งบประมาณรายจ่ายคงเหลือ
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('budget')}
                  className="text-xs font-medium text-[#0F766E] hover:underline cursor-pointer whitespace-nowrap"
                >
                  ปรับงบ
                </button>
              </div>
              <p
                className={`text-2xl font-bold font-mono-tabular ${
                  remainingBudget < 0 ? 'text-[#DC2626]' : 'text-slate-900'
                }`}
              >
                {formatTHB(remainingBudget)}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      monthlySummary.isOverBudget
                        ? 'bg-[#DC2626]'
                        : monthlySummary.isNearBudget
                          ? 'bg-[#D97706]'
                          : 'bg-[#0F766E]'
                    }`}
                    style={{ width: `${Math.min(100, monthlySummary.budgetUsedPercent)}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 font-mono-tabular">
                  {monthlySummary.budgetUsedPercent.toFixed(0)}%
                </span>
              </div>
            </div>
          </section>

          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_1fr] gap-6 items-stretch">
                <MonthlyBarChart
                  data={sixMonthTrend}
                  selectedMonthKey={selectedMonth}
                  onSelectMonth={(mk) => {
                    setSelectedMonth(mk);
                    setCategoryFilter('all');
                  }}
                />

                <CategoryDonutChart
                  expenseItems={expenseBreakdown}
                  incomeItems={incomeBreakdown}
                  activeType={donutType}
                  onChangeType={setDonutType}
                  selectedCategory={categoryFilter}
                  onSelectCategory={(cat) => {
                    setCategoryFilter(cat);
                    if (cat !== 'all') {
                      setTypeFilter(donutType);
                    }
                  }}
                />
              </div>

              <TransactionTable
                transactions={filteredTransactions}
                loading={dataLoading}
                typeFilter={typeFilter}
                onChangeTypeFilter={setTypeFilter}
                categoryFilter={categoryFilter}
                onChangeCategoryFilter={setCategoryFilter}
                searchQuery={searchQuery}
                onChangeSearchQuery={setSearchQuery}
                onEdit={(tx) => {
                  setEditingTx(tx);
                  setTxModalOpen(true);
                }}
                onDelete={(tx) => setPendingDeleteTx(tx)}
                onAddNew={() => {
                  setEditingTx(null);
                  setTxModalOpen(true);
                }}
                onExportCsv={handleExportCsv}
                title={`รายการเดินบัญชี — ${formatThaiMonth(selectedMonth)}`}
              />
            </>
          )}

          {activeTab === 'transactions' && (
            <TransactionTable
              transactions={filteredTransactions}
              loading={dataLoading}
              typeFilter={typeFilter}
              onChangeTypeFilter={setTypeFilter}
              categoryFilter={categoryFilter}
              onChangeCategoryFilter={setCategoryFilter}
              searchQuery={searchQuery}
              onChangeSearchQuery={setSearchQuery}
              onEdit={(tx) => {
                setEditingTx(tx);
                setTxModalOpen(true);
              }}
              onDelete={(tx) => setPendingDeleteTx(tx)}
              onAddNew={() => {
                setEditingTx(null);
                setTxModalOpen(true);
              }}
              onExportCsv={handleExportCsv}
              title={`สมุดบัญชีทั้งหมด — ${formatThaiMonth(selectedMonth)}`}
            />
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <MonthlyBarChart
                  data={sixMonthTrend}
                  selectedMonthKey={selectedMonth}
                  onSelectMonth={setSelectedMonth}
                />
                <DailyCashflowChart data={dailyCashflow} />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <CategoryDonutChart
                  expenseItems={expenseBreakdown}
                  incomeItems={incomeBreakdown}
                  activeType="expense"
                  onChangeType={() => {}}
                  selectedCategory={categoryFilter}
                  onSelectCategory={(cat) => {
                    setCategoryFilter(cat);
                    setTypeFilter(cat === 'all' ? 'all' : 'expense');
                    setActiveTab('transactions');
                  }}
                  lockType
                />
                <CategoryDonutChart
                  expenseItems={expenseBreakdown}
                  incomeItems={incomeBreakdown}
                  activeType="income"
                  onChangeType={() => {}}
                  selectedCategory={categoryFilter}
                  onSelectCategory={(cat) => {
                    setCategoryFilter(cat);
                    setTypeFilter(cat === 'all' ? 'all' : 'income');
                    setActiveTab('transactions');
                  }}
                  lockType
                />
              </div>
            </div>
          )}

          {activeTab === 'budget' && (
            <BudgetPanel
              monthKey={selectedMonth}
              summary={monthlySummary}
              defaultMonthlyBudget={defaultBudget}
              onSaveMonthBudget={handleSaveMonthBudget}
              onSaveDefaultBudget={handleSaveDefaultBudget}
            />
          )}
        </main>
      </div>

      <TransactionModal
        open={txModalOpen}
        editingTransaction={editingTx}
        defaultMonthKey={selectedMonth}
        onClose={() => {
          setTxModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTransaction}
      />

      {pendingDeleteTx && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setPendingDeleteTx(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-lg p-6 space-y-4"
          >
            <h2 id="delete-confirm-title" className="text-base font-bold text-slate-900">
              ยืนยันการลบรายการ
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              คุณต้องการลบรายการ{' '}
              <strong className="text-slate-900">
                {pendingDeleteTx.note || pendingDeleteTx.category}
              </strong>{' '}
              จำนวน{' '}
              <strong className="font-mono-tabular text-slate-900">
                {formatTHB(pendingDeleteTx.amount)}
              </strong>{' '}
              ใช่หรือไม่? การลบนี้ไม่สามารถกู้คืนได้
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setPendingDeleteTx(null)}
                className="min-h-[40px] px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[#DC2626] hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
              >
                {isDeleting ? 'กำลังลบ...' : 'ลบรายการ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
