const fs = require('fs');

const path = 'src/pages/auth/FarmerLogin.tsx';
let content = fs.readFileSync(path, 'utf8');

// Find the start of the return block
const startPattern = `  return (\n    <div className="min-h-screen`;
const startIndex = content.indexOf(startPattern);

if (startIndex === -1) {
  console.error("Could not find start pattern!");
  process.exit(1);
}

const newReturnBlock = `  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      {/* LEFT SIDE: Value Proposition (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-[45%] bg-emerald-950 relative flex-col justify-between p-12 overflow-hidden border-r border-emerald-900/50 shadow-2xl z-10">
        {/* Background Image / Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1592982537447-6f2334237199?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950 via-emerald-900/80 to-transparent"></div>
        
        <div className="relative z-10">
          <KishanSevaLogo size="lg" theme="dark" />
        </div>
        
        <div className="relative z-10 max-w-lg mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-800/50 border border-emerald-700 backdrop-blur-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold tracking-widest text-emerald-100 uppercase">Government of India</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6">
            Smart Agricultural Procurement
          </h1>
          <p className="text-lg text-emerald-100/90 leading-relaxed font-medium mb-8">
            Join the state-wide network of transparent procurement. 
            Book your slot, get instant quality checks, and receive direct bank transfers in real-time.
          </p>
          
          <div className="flex items-center gap-6">
            <div className="flex -space-x-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={\`w-10 h-10 rounded-full border-2 border-emerald-950 bg-emerald-\${200 + i*100} flex items-center justify-center text-xs font-bold text-emerald-900 overflow-hidden\`}>
                   <img src={\`https://api.dicebear.com/7.x/notionists/svg?seed=Farmer\${i}&backgroundColor=transparent\`} alt="avatar" className="w-full h-full object-cover bg-emerald-200" />
                </div>
              ))}
            </div>
            <p className="text-sm font-semibold text-emerald-50">
              Trusted by <span className="text-white font-bold">100,000+</span> farmers
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Login Form */}
      <div className="w-full lg:w-[55%] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-12 relative bg-gradient-to-b from-slate-50 via-white to-emerald-50/40 min-h-screen">
        
        <div className="w-full max-w-md flex items-center justify-between mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-emerald-700 font-semibold transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" /> {t('back_to_home')}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSelector variant="pill" className="shadow-xs text-xs" />
          </div>
        </div>

        {/* Mobile Logo (Visible only on small screens) */}
        <div className="lg:hidden flex items-center justify-center mb-8 w-full relative">
          <KishanSevaLogo size="xl" />
        </div>

        <Card className="w-full max-w-md p-6 sm:p-8 shadow-xl border border-slate-200/80 rounded-3xl bg-white relative">
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
                  onChange={(e) => setOtp(e.target.value.replace(/\\D/g, ''))}
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
                    {resendCooldown > 0 ? \`Resend in \${resendCooldown}s\` : 'Resend OTP'}
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

          <div className="mt-6 pt-6 border-t border-slate-100 text-center space-y-4">
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
        
        <p className="text-[11px] text-slate-500 mt-6 text-center max-w-sm">
          {t('login_gov_footer')}
        </p>
      </div>
    </div>
  );
}
`;

const newContent = content.substring(0, startIndex) + newReturnBlock;
fs.writeFileSync(path, newContent);
console.log("Updated FarmerLogin layout.");
