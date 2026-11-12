import { lazy, useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { GenesisAuth, signInToApp, signUpToApp } from '@/lib/genesis-auth';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { Activity, BriefcaseBusiness, FolderHeart, House, Target, Users } from 'lucide-react';
import { GenesisSection } from '@/lib/genesis';
import { Toaster } from '@/components/ui/sonner';
import { SalesAssistant } from '@/components/SalesAssistant';

const HomePage = lazy(() => import('@/pages/HomePage'));
const LeadsPage = lazy(() => import('@/pages/LeadsPage'));
const EstimatesPage = lazy(() => import('@/pages/EstimatesPage'));
const WorkLibraryPage = lazy(() => import('@/pages/WorkLibraryPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));

const navigation = [
  { to: '/', label: 'Overview', icon: House, end: true },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/estimates', label: 'Estimates & jobs', icon: BriefcaseBusiness },
  { to: '/library', label: 'Work library', icon: FolderHeart },
  { to: '/reports', label: 'Reports', icon: Target },
];

function AppFrame() {
  useEffect(() => {
    document.title = 'Lines & Logos | Lead to Job';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white relative">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="ambient-gradient" />
        <div className="ambient-orb" style={{ width: 560, height: 560, top: '-18%', left: '-12%', background: 'radial-gradient(circle, rgba(6,182,212,.13), transparent 70%)' }} />
        <div className="ambient-orb" style={{ width: 480, height: 480, bottom: '-18%', right: '-12%', background: 'radial-gradient(circle, rgba(245,158,11,.09), transparent 70%)' }} />
      </div>
      <header className="relative z-10 border-b border-white/10 bg-slate-950/55 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-300"><Activity className="h-5 w-5" /></div>
            <div className="min-w-0"><p className="truncate text-lg font-semibold tracking-tight">Lines &amp; Logos</p><p className="text-xs text-white/55">Lead to job workspace</p></div>
          </div>
          <nav aria-label="Main navigation" className="relative z-50 flex w-full gap-2 overflow-x-auto md:w-auto">
            {navigation.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm transition-all duration-200 ${isActive ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100 shadow-[0_8px_30px_-16px_rgba(34,211,238,.6)]' : 'border-transparent text-white/65 hover:border-white/10 hover:bg-white/5 hover:text-white'}`}>
                <Icon className="h-4 w-4" /><span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-7 pb-28 sm:px-6 sm:py-9">
        <Routes>
          <Route path="/" element={<GenesisSection name="Overview"><HomePage /></GenesisSection>} />
          <Route path="/leads" element={<GenesisSection name="Leads"><LeadsPage /></GenesisSection>} />
          <Route path="/estimates" element={<GenesisSection name="Estimates and jobs"><EstimatesPage /></GenesisSection>} />
          <Route path="/library" element={<GenesisSection name="Work library"><WorkLibraryPage /></GenesisSection>} />
          <Route path="/reports" element={<GenesisSection name="Reports"><ReportsPage /></GenesisSection>} />
          <Route path="*" element={<GenesisSection name="Overview"><HomePage /></GenesisSection>} />
        </Routes>
      </main>
      <footer className="relative z-10 mx-auto max-w-7xl px-4 pb-7 text-xs text-white/40 sm:px-6">A clearer path from first conversation to finished work.</footer>
      <SalesAssistant />
      <Toaster richColors position="top-right" />
    </div>
  );
}

function SignInGate() {
  const auth = useAuth();
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    document.title = 'Sign in | Lines & Logos';
  }, []);

  const startAuth = async (action: () => Promise<void>) => {
    setActionError('');
    try {
      await action();
    } catch {
      setActionError('We could not open the secure sign-in page. Please try again.');
    }
  };

  if (auth.isAuthenticated) {
    return <BrowserRouter><AppFrame /></BrowserRouter>;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12 text-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="ambient-gradient" />
        <div className="ambient-orb" style={{ width: 560, height: 560, top: '-18%', left: '-12%', background: 'radial-gradient(circle, rgba(6,182,212,.13), transparent 70%)' }} />
        <div className="ambient-orb" style={{ width: 480, height: 480, bottom: '-18%', right: '-12%', background: 'radial-gradient(circle, rgba(245,158,11,.09), transparent 70%)' }} />
      </div>
      <section aria-labelledby="signin-title" className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/65 p-7 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-9">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-300"><Activity className="h-5 w-5" /></div>
          <div><p className="font-semibold tracking-tight">Lines &amp; Logos</p><p className="text-xs text-white/55">Lead to job workspace</p></div>
        </div>
        <h1 id="signin-title" className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 leading-6 text-white/65">Sign in to continue, or create an account to get started.</p>
        {auth.isLoading ? (
          <p role="status" className="mt-7 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">Checking your sign-in…</p>
        ) : (
          <div className="mt-7 grid gap-3">
            <button type="button" onClick={() => void startAuth(signInToApp)} className="min-h-12 rounded-xl bg-cyan-300 px-5 font-semibold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.98]">Sign in</button>
            <button type="button" onClick={() => void startAuth(signUpToApp)} className="min-h-12 rounded-xl border border-white/15 bg-white/5 px-5 font-medium text-white transition hover:border-white/25 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.98]">Create an account</button>
          </div>
        )}
        {actionError && <p role="alert" className="mt-4 text-sm text-rose-200">{actionError}</p>}
      </section>
    </main>
  );
}

export default function App() {
  return <GenesisAuth><SignInGate /></GenesisAuth>;
}
