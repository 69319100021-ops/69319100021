import { ArrowRight, BarChart3, Lock, ShieldCheck, Wallet } from 'lucide-react';
import { FIREBASE_PROJECT_INFO } from '../firebase';

interface AuthGateProps {
  onSignInWithGoogle: () => void;
  onEnterDemoMode: () => void;
  isSigningIn: boolean;
  errorMessage: string | null;
}

export function AuthGate({
  onSignInWithGoogle,
  onEnterDemoMode,
  isSigningIn,
  errorMessage,
}: AuthGateProps) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between px-4 py-8 sm:px-8">
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#0F766E] text-white flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" aria-hidden="true" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            69319100021db
          </span>
        </div>
        <span className="text-xs text-slate-500 font-mono-tabular whitespace-nowrap">
          Firebase: {FIREBASE_PROJECT_INFO.projectId}
        </span>
      </header>

      <main className="max-w-5xl w-full mx-auto my-auto py-10 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 items-center">
        <div className="space-y-6">
          <p className="text-xs font-medium text-[#0F766E] tracking-wide">
            ระบบบัญชีรายรับ-รายจ่ายส่วนบุคคล
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight text-balance">
            จัดการรายรับรายจ่าย สรุปรายเดือน และวิเคราะห์กระแสเงินสดในที่เดียว
          </h1>
          <p className="text-base text-slate-600 leading-relaxed max-w-xl">
            บันทึกทุกรายการอย่างเป็นระบบ ติดตามสัดส่วนค่าใช้จ่ายรายหมวดหมู่ เปรียบเทียบแนวโน้ม 6 เดือนย้อนหลัง พร้อมจัดเก็บข้อมูลอย่างปลอดภัยบน Firebase Firestore ของบัญชีคุณเอง
          </p>

          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-slate-200">
            <div>
              <dt className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <BarChart3 className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
                สรุปผลรายเดือน
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                กราฟแท่ง วงแหวน และรายวัน
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <ShieldCheck className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
                เข้าสู่ระบบ Gmail
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                ยืนยันตัวตนด้วย Google Auth
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Lock className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
                แยกสิทธิ์ข้อมูลส่วนตัว
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                Firestore Rules เฉพาะเจ้าของ
              </dd>
            </div>
          </dl>
        </div>

        <section
          aria-label="เข้าสู่ระบบ"
          className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6"
        >
          <div>
            <h2 className="text-xl font-bold text-slate-900">เข้าสู่ระบบเพื่อเริ่มต้นใช้งาน</h2>
            <p className="text-sm text-slate-500 mt-1">
              ใช้บัญชี Gmail ของคุณเพื่อซิงค์และบันทึกข้อมูลลง Cloud Firestore
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed"
            >
              {errorMessage}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={onSignInWithGoogle}
              disabled={isSigningIn}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81"
                />
              </svg>
              <span>{isSigningIn ? 'กำลังเชื่อมต่อบัญชี Gmail...' : 'เข้าสู่ระบบด้วย Gmail (Google)'}</span>
            </button>

            <div className="relative flex py-2 items-center">
              <div className="grow border-t border-slate-200" />
              <span className="shrink mx-3 text-xs text-slate-400">หรือ</span>
              <div className="grow border-t border-slate-200" />
            </div>

            <button
              type="button"
              onClick={onEnterDemoMode}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>ทดลองใช้งานโหมดตัวอย่าง (Demo)</span>
              <ArrowRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            ข้อมูลในโหมดบัญชี Gmail จะถูกจัดเก็บแยกตามรหัสผู้ใช้บนโครงการ{' '}
            <span className="font-mono-tabular text-slate-600">{FIREBASE_PROJECT_INFO.projectId}</span>
          </p>
        </section>
      </main>

      <footer className="max-w-5xl w-full mx-auto pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <span>69319100021db · ระบบบันทึกรายรับ-รายจ่ายรายเดือน</span>
        <span className="font-mono-tabular">THB (฿) · Cloud Firestore</span>
      </footer>
    </div>
  );
}
