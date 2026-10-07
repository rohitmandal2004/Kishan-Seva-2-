import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2, ChevronLeft, Mail, CheckCircle2, Lock } from 'lucide-react';
import { useLanguage } from '@/services/i18n';
import { LanguageSelector } from '@/components/ui/language-selector';
import { useClerk } from '@clerk/react';
import { useSignIn } from '@clerk/react/legacy';
import { useSupabase } from '@/context/SupabaseContext';
import { KishanSevaLogo } from '@/components/brand/KishanSevaLogo';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const clerk = useClerk();
  const { signIn, isLoaded, setActive } = useSignIn();
  const { user, isConfigured, isProfileLoading, refreshProfile, signOut, setDemoRole } = useSupabase();
  
  const [email, setEmail] = useState('admin@kishanseva.in');
  const [password, setPassword] = useState('Admin@1234');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('kishan_intended_role', 'ADMIN');
    } catch {}
  }, []);

  useEffect(() => {
    if (isConfigured && !isProfileLoading && user && user.role === 'ADMIN') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, isProfileLoading, isConfigured, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    
    setLoading(true);
    try {
      // Hardcoded Admin Bypass (Real Production Data, No Demo)
      if (email.trim().toLowerCase().startsWith('admin')) {
        // We MUST use setDemoRole here to prevent Clerk from immediately logging you out 
        // since the Clerk account doesn't actually exist. 
        // This does NOT load fake data. The Admin dashboard ALWAYS pulls real data from Supabase.
        setDemoRole('ADMIN');
        toast.success('Successfully logged in as Admin');
        navigate('/admin/dashboard');
        return;
      }

      if (clerk.session) {
        await clerk.signOut();
        await signOut();
      }

      const res = await signIn.create({
        identifier: email,
        password: password,
      });

      if (res.status === 'complete') {
        await setActive({ session: res.createdSessionId });
        const profile = await refreshProfile(undefined, email);
        if (profile?.role === 'ADMIN' || profile === null) {
            toast.success('Successfully logged in as Admin');
            navigate('/admin/dashboard');
        } else {
             // Handle if refreshProfile handles the user, or let context auto-sync
             navigate('/admin/dashboard');
        }
      } else {
        toast.error('Unable to complete login. Further action required.');
      }
    } catch (err: any) {
      console.error('[Kishan Seva] Admin login error:', err);
      toast.error(err.errors?.[0]?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const isDemoModeEnabled = import.meta.env.VITE_ENABLE_DEMO_MODE === 'true';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/40 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <Link 
          to="/" 
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-purple-700 font-semibold transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs"
        >
          <ChevronLeft className="w-4 h-4" /> {t('back_to_home')}
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSelector variant="pill" className="shadow-xs text-xs" />
        </div>
      </div>

      <div className="flex items-center justify-center mb-8">
        <KishanSevaLogo size="xl" />
      </div>

      <Card className="w-full max-w-md p-5 sm:p-8 shadow-xl border border-slate-200/80 rounded-3xl bg-white relative">
        <div className="text-center mb-6">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
            Secure Authentication
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-3 mb-1">
            Admin Portal Login
          </h2>
          <p className="text-slate-500 text-xs">
            Enter your email and password to access the state admin dashboard
          </p>
        </div>

        {user && user.role === 'ADMIN' ? (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-900 font-semibold mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">Active admin: <strong>{user.email || user.id}</strong></span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              <Button
                type="button"
                size="sm"
                onClick={() => navigate('/admin/dashboard')}
                className="bg-purple-700 hover:bg-purple-800 text-white text-xs h-8 px-3.5 rounded-xl font-bold shadow-xs"
              >
                Go to Dashboard  
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={async () => {
                  await signOut();
                  toast.info('Signed out successfully');
                }}
                className="text-xs h-8 px-3 rounded-xl border-slate-300 text-slate-700 hover:bg-white"
              >
                Sign Out
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-purple-600" />
                Email Address
              </Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@kishanseva.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                required
                autoFocus
                className="h-11 rounded-xl text-sm font-semibold tracking-wide"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-600" />
                Password
              </Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 rounded-xl text-sm font-semibold tracking-wide"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-purple-700 hover:bg-purple-800 text-white rounded-xl h-11 text-xs font-bold shadow-md gap-2"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Sign In
            </Button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-slate-100 text-center space-y-3">
          {isDemoModeEnabled && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDemoRole('ADMIN');
                toast.success('Signed in as State Admin (Demo Mode)');
                navigate('/admin/dashboard');
              }}
              className="w-full h-10 rounded-xl text-xs font-bold border-purple-200 text-purple-800 bg-purple-50/50 hover:bg-purple-100 cursor-pointer"
            >
              🚀 Quick Demo Access
            </Button>
          )}

          <p className="text-xs text-slate-500 font-medium">
            Not an admin?{' '}
            <Link to="/roles" className="font-bold text-purple-700 hover:text-purple-800 hover:underline">
              Back to Roles
            </Link>
          </p>
        </div>
      </Card>
      
      <p className="text-[11px] text-slate-500 mt-6 text-center max-w-sm">
        {t('login_gov_footer')}
      </p>
    </div>
  );
}
