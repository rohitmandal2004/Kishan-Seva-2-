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
import { useClerk, useAuth } from '@clerk/react';
import { useSignIn } from '@clerk/react/legacy';
import { useSupabase } from '@/context/SupabaseContext';
import { KishanSevaLogo } from '@/components/brand/KishanSevaLogo';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const OTP_RESEND_COOLDOWN = 30; // seconds

export default function FarmerLogin() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const clerk = useClerk();
  const { isSignedIn } = useAuth();
  const { signIn, isLoaded, setActive } = useSignIn();
  const { user, farmer, isConfigured, isProfileLoading, refreshProfile, fetchFarmerProfile, signOut, setDemoRole, setFarmer, setUser } = useSupabase();
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'EMAIL' | 'OTP'>('EMAIL');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Set intended role so multi-role users resolve to the correct profile
  useEffect(() => {
    try {
      localStorage.setItem('kishan_intended_role', 'FARMER');
    } catch {}
  }, []);

  // Cooldown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Auto-redirect if already logged in with a valid session and farmer profile
  useEffect(() => {
    if (isConfigured && !isProfileLoading && isSignedIn && user && user.role === 'FARMER' && farmer) {
      navigate('/farmer/dashboard', { replace: true });
    }
  }, [user, farmer, isConfigured, isProfileLoading, isSignedIn, navigate]);

  /**
   * Farmer login flow:
   * 1. Normalize email: email.trim().toLowerCase()
   * 2. Check Supabase farmer_profiles first.
   *    If farmer not found -> Hard STOP: "Farmer account not found. Please register first."
   * 3. If farmer found -> Initiate Clerk Email OTP.
   */
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
      // Start the sign-in process with Clerk using normalized email identifier
      const result = await signIn.create({
        identifier: cleanEmail,
      });

      // Find the email_code first factor and prepare it
      const emailCodeFactor = result.supportedFirstFactors?.find(
        (f: any) => f.strategy === 'email_code'
      );

      if (!emailCodeFactor) {
        throw new Error('Email OTP is not available for this account. Please check your Clerk dashboard configuration.');
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
      console.error('[Kishan Seva] Login OTP send error:', err);
      const clerkError = err.errors?.[0];
      const isNotFound = 
        clerkError?.code === 'form_identifier_not_found' ||
        clerkError?.code === 'identifier_not_found' ||
        clerkError?.code?.includes('not_found') ||
        clerkError?.message?.toLowerCase().includes("couldn't find") ||
        clerkError?.message?.toLowerCase().includes("not found");

      if (isNotFound) {
        toast.error('Farmer account not found. Please register first.', {
          action: {
            label: 'Register now',
            onClick: () => navigate('/farmer/register'),
          },
        });
      } else if (clerkError?.code === 'session_exists') {
        // Active session detected
        toast.info('Active session detected. Checking profile...');
        const updatedProfile = await refreshProfile(clerk.user?.id || '', cleanEmail);
        if (updatedProfile) {
          navigate('/farmer/dashboard', { replace: true });
        } else {
          toast.error('Farmer account not found. Redirecting to registration...');
          navigate('/farmer/register', { replace: true, state: { email: cleanEmail } });
        }
      } else if (clerkError?.message?.toLowerCase().includes('failed security validations') || clerkError?.code?.includes('security')) {
        toast.error('Clerk Bot Protection blocked this request. In Clerk Dashboard: Configure → Attack protection → Disable Bot protection for local development.');
      } else {
        toast.error(clerkError?.message || "We couldn't connect to Kishan Seva right now. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [email, isLoaded, signIn, refreshProfile, farmer, navigate]);

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
    let success = false;
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code: otp,
      });

      if (result.status === 'complete') {
        success = true;
        // Finalize Clerk sign-in
        if (typeof (signIn as any).finalize === 'function') {
          try {
            await (signIn as any).finalize();
          } catch {}
        }

        // Activate the Clerk session
        if (setActive && result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
        }

        const clerkUserId = clerk.user?.id || clerk.session?.user?.id || (result as any).createdUserId || (result as any).userData?.id || '';
        const cleanEmail = email.trim().toLowerCase();

        // 1. Primary lookup using robust multi-tier resolution (RPCs bypass RLS)
        let effectiveProfile = await fetchFarmerProfile(clerkUserId, cleanEmail);

        // 2. If not found immediately, give the Clerk session a moment to settle and retry
        if (!effectiveProfile) {
          await new Promise(r => setTimeout(r, 400));
          const settledClerkId = clerk.user?.id || clerk.session?.user?.id || clerkUserId;
          effectiveProfile = await fetchFarmerProfile(settledClerkId, cleanEmail);
        }

        // 3. Fallback to localStorage if this farmer was previously cached on device
        if (!effectiveProfile) {
          try {
            const saved = localStorage.getItem('kishan_farmer_profile');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed && (
                (cleanEmail && parsed.email?.toLowerCase() === cleanEmail) ||
                (clerkUserId && parsed.clerk_user_id === clerkUserId)
              )) {
                effectiveProfile = parsed;
              }
            }
          } catch {}
        }

        if (!effectiveProfile) {
          setLoading(false);
          toast.error('Farmer account not found. Redirecting to registration...');
          navigate('/farmer/register', { replace: true, state: { email: cleanEmail } });
          return;
        }

        // Update application state
        setFarmer(effectiveProfile);
        setUser({
          id: clerkUserId || effectiveProfile.clerk_user_id || effectiveProfile.id,
          email: cleanEmail,
          role: 'FARMER',
        });

        try {
          localStorage.setItem('kishan_farmer_profile', JSON.stringify(effectiveProfile));
        } catch {}

        await refreshProfile(clerkUserId, cleanEmail).catch(() => {});
        toast.success('Welcome back to Kishan Seva!');
        
        // DO NOT navigate manually.
        // We wait for Clerk's `isSignedIn` to become true, which will trigger the `useEffect` above.
        // DO NOT set loading to false here, to keep the spinner visible until navigation.
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
      if (!success) {
        setLoading(false);
      }
    }
  };

  const handleChangeEmail = () => {
    setStep('EMAIL');
    setOtp('');
    setResendCooldown(0);
  };

  const isDemoModeEnabled = true; // Hardcoded for hackathon demo

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-slate-50 flex flex-col lg:flex-row font-sans">
      {/* LEFT SIDE: Value Proposition (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-[45%] bg-emerald-800 relative flex-col justify-between pt-8 px-10 xl:px-12 pb-12 overflow-hidden border-r border-emerald-700/50 shadow-2xl z-10">
        {/* Background Image / Pattern */}
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1625246333195-78d9c38ad449?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900/90 via-emerald-800/80 to-emerald-600/40"></div>
        
        <div className="relative z-10">
          <KishanSevaLogo size="lg" theme="light" animated={false} />
        </div>
        
        <div className="relative z-10 max-w-lg mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold tracking-widest text-white uppercase drop-shadow-sm">Government of India</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-4 drop-shadow-sm">
            Smart Agricultural Procurement
          </h1>
          <p className="text-lg text-emerald-50/90 leading-relaxed font-medium mb-0 drop-shadow-sm">
            Join the state-wide network of transparent procurement. 
            Book your slot, get instant quality checks, and receive direct bank transfers in real-time.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE: Login Form */}
      <div className="w-full lg:w-[55%] flex flex-col items-center p-4 sm:p-6 lg:p-8 relative bg-gradient-to-b from-slate-50 via-white to-emerald-50/40 lg:h-screen lg:overflow-y-auto custom-scrollbar">
        
        <div className="relative z-50 w-full flex items-center gap-3 justify-between lg:justify-end mb-auto pb-4">
          <Link to="/" className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 transition-colors px-4 py-2 rounded-full border border-slate-200 shadow-sm"><ChevronLeft className="w-3.5 h-3.5" /> {t('back_to_home')}</Link>
          <div className="flex items-center gap-2">
            <LanguageSelector variant="pill" className="shadow-xs text-xs" />
          </div>
        </div>

        {/* Mobile Logo (Visible only on small screens) */}
        <div className="lg:hidden flex items-center justify-center mb-8 w-full relative">
          <KishanSevaLogo size="xl" />
        </div>

        <Card className="w-full max-w-md p-5 sm:p-8 shadow-xl border border-slate-200/80 rounded-[2rem] bg-white relative my-auto">
          <div className="text-center mb-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              Secure Authentication
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-3 mb-1">
              Farmer Login
            </h2>
            <p className="text-slate-500 text-xs">
              Enter your email to receive a one-time verification code for secure access.
            </p>
          </div>

          {user && farmer ? (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-900 font-semibold mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">Active account: <strong>{user.email || user.id}</strong></span>
              </div>
              <p className="text-[11px] text-emerald-700/80 mb-3">
                Your profile is loaded and ready.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => navigate('/farmer/dashboard')}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8 px-3.5 rounded-xl font-bold shadow-xs"
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
          ) : step === 'EMAIL' ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-600" />
                  Email Address
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="farmer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  required
                  autoFocus
                  className="h-11 rounded-xl text-sm font-semibold tracking-wide"
                />
                <p className="text-[10px] text-slate-500">A 6-digit one-time code will be sent to this email.</p>
              </div>
              
              <div id="clerk-captcha" className="my-2 flex justify-center" />

              <Button 
                type="submit" 
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl h-11 text-xs font-bold shadow-md gap-2"
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
                    className="text-xs text-emerald-700 font-semibold hover:underline cursor-pointer"
                  >
                    Change email
                  </button>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
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
                    className="text-[11px] text-emerald-700 font-bold hover:underline disabled:text-slate-500 disabled:no-underline cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>
              
              <div id="clerk-captcha" className="my-2 flex justify-center" />

              <Button 
                type="submit" 
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl h-11 text-xs font-bold shadow-md gap-2"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Verify OTP
              </Button>
            </form>
          )}

          <div className="mt-5 pt-5 border-t border-slate-100 text-center space-y-3">
            <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-4 flex flex-col items-center gap-2 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-200 rounded-full blur-xl -mr-8 -mt-8 opacity-50 pointer-events-none"></div>
               <p className="text-xs text-emerald-950 font-bold relative z-10">
                 Don't have an account yet?
               </p>
               <Link to="/farmer/register" className="w-full flex items-center justify-center gap-2 bg-emerald-700 text-white hover:bg-emerald-800 h-10 rounded-lg text-xs font-bold transition-all shadow-md relative z-10">
                 Register as New Farmer
               </Link>
            </div>
            
            {isDemoModeEnabled && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDemoRole('FARMER');
                    toast.success('Logged in with Demo Farmer Profile');
                    navigate('/farmer/dashboard');
                  }}
                  className="w-full text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-bold px-3 py-2 rounded-xl transition-colors border border-emerald-200 cursor-pointer"
                >
                  ⚡ Quick Demo Access (Skip OTP)
                </button>
              </div>
            )}
          </div>
        </Card>
        
        <p className="text-[10px] text-slate-500 mt-4 pb-4 text-center max-w-sm">
          {t('login_gov_footer')}
        </p>
      </div>
    </div>
  );
}
