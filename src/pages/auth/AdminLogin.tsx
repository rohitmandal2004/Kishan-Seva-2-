import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2, ChevronLeft, Mail, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/services/i18n';
import { LanguageSelector } from '@/components/ui/language-selector';
import { useClerk } from '@clerk/react';
import { useSignIn } from '@clerk/react/legacy';
import { useSupabase } from '@/context/SupabaseContext';
import { KishanSevaLogo } from '@/components/brand/KishanSevaLogo';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const OTP_RESEND_COOLDOWN = 30; // seconds

export default function AdminLogin() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const clerk = useClerk();
  const { signIn, isLoaded, setActive } = useSignIn();
  const { user, isConfigured, isProfileLoading, refreshProfile, signOut, resolveRole, setDemoRole } = useSupabase();
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'EMAIL' | 'OTP'>('EMAIL');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Auto-redirect if already logged in with a valid admin session
  useEffect(() => {
    if (isConfigured && !isProfileLoading && user && user.role === 'ADMIN') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, isConfigured, isProfileLoading, navigate]);

  const handleSendOtp = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail.length < 5) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (!isLoaded || !signIn) {
      toast.error('Authentication is still loading. Please wait.');
      return;
    }

    setLoading(true);
    try {
      // Pre-auth verification: Admin profile must exist in Supabase
      if (isSupabaseConfigured()) {
        try {
          const { data: adminProfile, error: dbError } = await supabase
            .from('admin_profiles')
            .select('id, full_name, jurisdiction_state')
            .ilike('email', cleanEmail)
            .maybeSingle();

          if (dbError) {
            console.error('[Kishan Seva] Admin check error:', dbError);
            toast.error("We couldn't connect to Kishan Seva right now. Please try again.");
            return;
          }

          if (!adminProfile) {
            toast.error('Admin profile not found. Contact administrator.');
            return;
          }
        } catch (dbErr) {
          console.error('[Kishan Seva] DB connection error:', dbErr);
          toast.error("We couldn't connect to Kishan Seva right now. Please try again.");
          return;
        }
      }

      // Start sign-in process with Clerk using normalized email
      const result = await signIn.create({
        identifier: cleanEmail,
      });

      const emailCodeFactor = result.supportedFirstFactors?.find(
        (f: any) => f.strategy === 'email_code'
      );

      if (!emailCodeFactor) {
        throw new Error('Email OTP is not available for this account. Please check your Clerk configuration.');
      }

      await signIn.prepareFirstFactor({
        strategy: 'email_code',
        emailAddressId: (emailCodeFactor as any).emailAddressId,
      });
      
      toast.success(`OTP sent to ${cleanEmail}`);
      setStep('OTP');
      setOtp('');
      setResendCooldown(OTP_RESEND_COOLDOWN);
    } catch (err: any) {
      console.error('[Kishan Seva] Admin login OTP send error:', err);
      const clerkError = err.errors?.[0];
      const isNotFound = 
        clerkError?.code === 'form_identifier_not_found' ||
        clerkError?.code === 'identifier_not_found' ||
        clerkError?.code?.includes('not_found') ||
        clerkError?.message?.toLowerCase().includes("couldn't find") ||
        clerkError?.message?.toLowerCase().includes("not found");

      if (isNotFound) {
        toast.error('Admin profile not found. Contact administrator.');
      } else if (clerkError?.code === 'session_exists') {
        toast.info('Active session detected. Checking profile...');
        await refreshProfile();
        if (user && user.role === 'ADMIN') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          toast.error('You do not have admin privileges.');
        }
      } else {
        toast.error(clerkError?.message || "We couldn't connect to Kishan Seva right now. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [email, isLoaded, signIn, refreshProfile, user, navigate]);

  const handleResendOtp = useCallback(async () => {
    if (resendCooldown > 0) {
      toast.info('Please wait before requesting another OTP.');
      return;
    }
    if (!isLoaded || !signIn) return;
    
    setLoading(true);
    try {
      const emailCodeFactor = signIn.supportedFirstFactors?.find(
        (f: any) => f.strategy === 'email_code'
      );
      if (!emailCodeFactor) {
        throw new Error('Email code factor not available');
      }
      await signIn.prepareFirstFactor({
        strategy: 'email_code',
        emailAddressId: (emailCodeFactor as any).emailAddressId,
      });
      setOtp('');
      setResendCooldown(OTP_RESEND_COOLDOWN);
      toast.success('New verification code sent');
    } catch (err: any) {
      console.error('[Kishan Seva] Resend OTP error:', err);
      toast.error(err.errors?.[0]?.message || 'Unable to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [resendCooldown, isLoaded, signIn]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    
    if (!isLoaded || !signIn) {
      toast.error('Authentication is still loading. Please wait.');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code: otp,
      });

      if (result.status === 'complete') {
        if (typeof (signIn as any).finalize === 'function') {
          try {
            await (signIn as any).finalize();
          } catch {}
        }

        if (setActive && result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
        }

        const clerkUserId = clerk.user?.id || clerk.session?.user?.id || '';
        const cleanEmail = email.trim().toLowerCase();

        // Query Supabase for role strictly from database tables
        const { role } = await resolveRole(clerkUserId, cleanEmail);

        if (role === 'ADMIN') {
          await refreshProfile();
          toast.success('Admin Authentication Successful');
          navigate('/admin/dashboard', { replace: true });
        } else if (role === 'FARMER') {
          toast.info('You are registered as a Farmer. Redirecting to your dashboard...');
          navigate('/farmer/dashboard', { replace: true });
        } else if (role === 'OPERATOR') {
          toast.info('You are registered as an Operator. Redirecting to your dashboard...');
          navigate('/operator/dashboard', { replace: true });
        } else {
          toast.error('Account does not have admin privileges.');
        }
      } else {
        throw new Error('Verification could not be completed. Please try again.');
      }
    } catch (err: any) {
      console.error('[Kishan Seva] OTP verification error:', err);
      const clerkError = err.errors?.[0];
      if (clerkError?.code === 'form_code_incorrect') {
        toast.error('Invalid OTP. Please check the code and try again.');
      } else if (clerkError?.code === 'verification_expired') {
        toast.error('This OTP has expired. Please request a new code.');
        setOtp('');
      } else {
        toast.error(clerkError?.message || 'Invalid OTP. Please check the code and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = () => {
    setStep('EMAIL');
    setOtp('');
    setResendCooldown(0);
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
            Enter your email to access the state admin dashboard
          </p>
        </div>

        {user && user.role === 'ADMIN' && (
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
                Go to Dashboard →
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
        )}

        {step === 'EMAIL' ? (
          <form onSubmit={handleSendOtp} className="space-y-5">
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
              <p className="text-[10px] text-slate-500">A 6-digit one-time code will be sent to this email inbox.</p>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-purple-700 hover:bg-purple-800 text-white rounded-xl h-11 text-xs font-bold shadow-md gap-2"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Send OTP
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="otp" className="text-xs font-bold text-slate-700">
                  Enter OTP
                </Label>
                <button 
                  type="button" 
                  onClick={handleChangeEmail}
                  className="text-xs text-purple-700 font-semibold hover:underline cursor-pointer"
                >
                  Change email
                </button>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="truncate">Sent to <strong className="text-slate-900">{email}</strong></span>
              </div>
              <Input 
                id="otp" 
                type="text" 
                placeholder="● ● ● ● ● ●" 
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                autoFocus
                className="h-12 rounded-xl text-center text-xl font-bold tracking-[0.3em]"
              />
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-500 font-semibold">
                  Check your email inbox for the 6-digit code
                </p>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  className="text-[11px] text-purple-700 font-bold hover:underline disabled:text-slate-500 disabled:no-underline cursor-pointer"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-purple-700 hover:bg-purple-800 text-white rounded-xl h-11 text-xs font-bold shadow-md gap-2"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Verify OTP
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
              ⚡ Quick Demo Access (Skip OTP)
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
