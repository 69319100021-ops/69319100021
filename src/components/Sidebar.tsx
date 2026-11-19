import {
  BarChart2,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  PiggyBank,
  Wallet,
  X,
} from 'lucide-react';
import { FIREBASE_PROJECT_INFO } from '../firebase';

export type WorkspaceTab = 'overview' | 'transactions' | 'analytics' | 'budget';

interface SidebarProps {
  activeTab: WorkspaceTab;
  onChangeTab: (tab: WorkspaceTab) => void;
  userEmail: string;
  userName: string;
  userPhoto?: string;
  isDemoMode: boolean;
  onSignOut: () => void;
  onSwitchToGoogleLogin: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { id: WorkspaceTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'ภาพรวมรายเดือน', icon: LayoutDashboard },
  { id: 'transactions', label: 'รายการเดินบัญชี', icon: ListOrdered },
  { id: 'analytics', label: 'วิเคราะห์กราฟเชิงลึก', icon: BarChart2 },
  { id: 'budget', label: 'งบประมาณรายเดือน', icon: PiggyBank },
];

export function Sidebar({
  activeTab,
  onChangeTab,
  userEmail,
  userName,
  userPhoto,
  isDemoMode,
  onSignOut,
  onSwitchToGoogleLogin,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navContent = (
    <div className="flex flex-col h-full justify-between bg-white border-r border-slate-200 w-[260px]">
      <div>
        <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#0F766E] text-white flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" aria-hidden="true" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900 truncate">
              69319100021db
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="ปิดเมนูนำทาง"
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="p-3 space-y-1" aria-label="เมนูหลัก">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChangeTab(item.id);
                  onCloseMobile();
                }}
                aria-current={active ? 'page' : undefined}
                className={`w-full min-h-[42px] px-3 py-2 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-teal-50 text-[#0F766E]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${active ? 'text-[#0F766E]' : 'text-slate-400'}`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-200 space-y-3">
        <div className="flex items-center gap-3 min-w-0">
          {userPhoto ? (
            <img
              src={userPhoto}
              alt={userName}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
              {userName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{userName}</p>
            <p className="text-xs text-slate-500 truncate">{userEmail}</p>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-mono-tabular flex items-center justify-between">
          <span>{isDemoMode ? 'โหมดทดลองใช้งาน' : 'ซิงค์กับ Firebase'}</span>
          <span>{FIREBASE_PROJECT_INFO.projectId}</span>
        </div>

        {isDemoMode ? (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={onSwitchToGoogleLogin}
              className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              เข้าสู่ระบบด้วย Gmail จริง
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="w-full min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>ออกจากโหมดตัวอย่าง</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSignOut}
            className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>ออกจากระบบ</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0">{navContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-50 h-full">{navContent}</div>
        </div>
      )}
    </>
  );
}
