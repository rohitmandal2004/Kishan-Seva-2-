import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2, ChevronLeft, Mail, CheckCircle2, Lock, Fingerprint } from 'lucide-react';
import { useLanguage } from '@/services/i18n';
import { LanguageSelector } from '@/components/ui/language-selector';
import { useClerk } from '@clerk/react';
import { useSignIn } from '@clerk/react/legacy';
import { useSupabase } from '@/context/SupabaseContext';
import { supabase } from '@/lib/supabase';
import { KishanSevaLogo } from '@/components/brand/KishanSevaLogo';

export default function OperatorLogin() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const clerk = useClerk();
  const { signIn, isLoaded, setActive } = useSignIn();
  const { user, isConfigured, isProfileLoading, refreshProfile, signOut, setDemoRole } = useSupabase();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('kishan_intended_role', 'OPERATOR');
    } catch {}
  }, []);

  useEffect(() => {
    if (isConfigured && !isProfileLoading && user && user.role === 'OPERATOR') {
      navigate('/operator/dashboard', { replace: true });
    }
  }, [user, isProfileLoading, isConfigured, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    
    setLoading(true);
    try {
      if (clerk.session) {
        await clerk.signOut();
        await signOut();
      }

      let signinEmail = email;
      if (email.toUpperCase().startsWith('KSO-')) {
          const { data: opData } = await supabase.from('operator_profiles').select('email').eq('operator_code', email.toUpperCase()).maybeSingle();
          if (opData?.email) {
              signinEmail = opData.email;
          }
      }

      const res = await signIn.create({
        identifier: signinEmail,
        password: password,
      });

      if (res.status === 'complete') {
        await setActive({ session: res.createdSessionId });
        const result = await refreshProfile(undefined, email);
        const profile = result?.profile;
        const resolvedRole = result?.role;
        
        if (resolvedRole === 'OPERATOR' && profile) {
            if (profile.status === 'PENDING') {
                await clerk.signOut();
                await signOut();
                toast.error('Your operator account is pending admin approval.');
            } else if (profile.status === 'REJECTED') {
                await clerk.signOut();
                await signOut();
                toast.error('Your operator registration has been rejected.');
            } else if (profile.status === 'SUSPENDED') {
                await clerk.signOut();
                await signOut();
                toast.error('Your operator account has been suspended.');
            } else if (!profile.assigned_centre_id) {
                await clerk.signOut();
                await signOut();
                toast.error('You have not been assigned to a procurement centre.');
            } else {
                toast.success('Successfully logged in as Operator');
                navigate('/operator/dashboard');
            }
        } else {
             await clerk.signOut();
             await signOut();
             toast.error('Operator profile not found. Please register.');
        }
      } else {
        toast.error('Unable to complete login. Further action required.');
      }
    } catch (err: any) {
      console.error('[Kishan Seva] Operator login error:', err);
      toast.error(err.errors?.[0]?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      if (clerk.session) {
        await clerk.signOut();
        await signOut();
      }

      const res = await signIn.authenticateWithPasskey();

      if (res.status === 'complete') {
        await setActive({ session: res.createdSessionId });
        const result = await refreshProfile(undefined, res.identifier || undefined);
        const profile = result?.profile;
        const resolvedRole = result?.role;
        
        if (resolvedRole === 'OPERATOR' && profile) {
            if (profile.status === 'PENDING') {
                await clerk.signOut();
                await signOut();
                toast.error('Your operator account is pending admin approval.');
            } else if (profile.status === 'REJECTED') {
                await clerk.signOut();
                await signOut();
                toast.error('Your operator registration has been rejected.');
            } else if (profile.status === 'SUSPENDED') {
                await clerk.signOut();
                await signOut();
                toast.error('Your operator account has been suspended.');
            } else if (!profile.assigned_centre_id) {
                await clerk.signOut();
                await signOut();
                toast.error('You have not been assigned to a procurement centre.');
            } else {
                toast.success('Successfully logged in via Biometrics');
                navigate('/operator/dashboard');
            }
        } else {
             await clerk.signOut();
             await signOut();
             toast.error('Operator profile not found. Please register.');
        }
      }
    } catch (err: any) {
      if (err.errors?.[0]?.code === 'passkey_not_supported') {
        toast.error('Passkeys are not supported on this device.');
      } else {
         toast.error(err.errors?.[0]?.longMessage || 'Biometric login failed or was cancelled.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isDemoModeEnabled = import.meta.env.VITE_ENABLE_DEMO_MODE === 'true';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/40 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <Link 
          to="/" 
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-700 font-semibold transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs"
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
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            Secure Authentication
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-3 mb-1">
            Operator Portal Login
          </h2>
          <p className="text-slate-500 text-xs">
            Enter your email and password to access the operator dashboard
          </p>
        </div>

        {user && user.role === 'OPERATOR' ? (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-900 font-semibold mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">Active operator: <strong>{user.email || user.id}</strong></span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              <Button
                type="button"
                size="sm"
                onClick={() => navigate('/operator/dashboard')}
                className="bg-blue-700 hover:bg-blue-800 text-white text-xs h-8 px-3.5 rounded-xl font-bold shadow-xs"
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
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                Email Address
              </Label>
              <Input 
                id="email" 
                type="text"
                placeholder="Email or Operator ID (e.g. KSO-BAS-0001)"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                required
                autoFocus
                className="h-11 rounded-xl text-sm font-semibold tracking-wide"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
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
            
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Button 
                type="submit" 
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white rounded-xl h-11 text-xs font-bold shadow-md gap-2"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Sign In
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={handlePasskeyLogin}
                className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl h-11 text-xs font-bold gap-2"
                disabled={loading}
              >
                <Fingerprint className="w-4 h-4" />
                Quick Login
              </Button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-slate-100 text-center space-y-3">
          {isDemoModeEnabled && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDemoRole('OPERATOR');
                toast.success('Signed in as Operator (Demo Mode)');
                navigate('/operator/dashboard');
              }}
              className="w-full h-10 rounded-xl text-xs font-bold border-blue-200 text-blue-800 bg-blue-50/50 hover:bg-blue-100 cursor-pointer"
            >
              🚀 Quick Demo Access
            </Button>
          )}

          <div className="flex flex-col gap-2 mt-2">
            <p className="text-xs text-slate-500 font-medium">
              New candidate?{' '}
              <Link to="/operator/register" className="font-bold text-blue-700 hover:text-blue-800 hover:underline">
                Register here
              </Link>
            </p>
            <p className="text-xs text-slate-500 font-medium">
              Not an operator?{' '}
              <Link to="/roles" className="font-bold text-blue-700 hover:text-blue-800 hover:underline">
                Back to Roles
              </Link>
            </p>
          </div>
        </div>
      </Card>
      
      <p className="text-[11px] text-slate-500 mt-6 text-center max-w-sm">
        {t('login_gov_footer')}
      </p>
    </div>
  );
}
