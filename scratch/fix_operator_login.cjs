const fs = require('fs');

const path = 'src/pages/auth/OperatorLogin.tsx';
let content = fs.readFileSync(path, 'utf8');

// Find the start of the return block
const startPattern = `  return (\n    <div className="min-h-screen bg-gradient-to-b`;
const startIndex = content.indexOf(startPattern);

if (startIndex === -1) {
  console.error("Could not find start pattern in OperatorLogin!");
  process.exit(1);
}

const newReturnBlock = `  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      {/* LEFT SIDE: Value Proposition (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-[45%] bg-slate-900 relative flex-col justify-between p-12 overflow-hidden border-r border-slate-800 shadow-2xl z-10">
        {/* Background Image / Pattern */}
        <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8ed7c83a7f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/90 via-slate-900/80 to-blue-900/40"></div>
        
        <div className="relative z-10">
          <KishanSevaLogo size="lg" theme="light" animated={false} />
        </div>
        
        <div className="relative z-10 max-w-lg mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            <span className="text-xs font-bold tracking-widest text-white uppercase drop-shadow-sm">Mandi Operations Control</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6 drop-shadow-sm">
            Smart Procurement Logistics
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed font-medium mb-8 drop-shadow-sm">
            Manage daily queues, authenticate farmers, verify crop quality, and execute precision weighments. Your command center for seamless mandi operations.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE: Login Form */}
      <div className="w-full lg:w-[55%] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-12 relative bg-gradient-to-b from-slate-50 via-white to-blue-50/40 min-h-screen">
        
        <div className="w-full max-w-md flex items-center justify-between mb-8">
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

        {/* Mobile Logo (Visible only on small screens) */}
        <div className="lg:hidden flex items-center justify-center mb-8 w-full relative">
          <KishanSevaLogo size="xl" />
        </div>

        <Card className="w-full max-w-md p-6 sm:p-8 shadow-xl border border-slate-200/80 rounded-3xl bg-white relative">
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

          <div className="mt-6 pt-6 border-t border-slate-100 text-center space-y-4">
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

            <div className="flex flex-col gap-4 mt-2">
              <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-4 flex flex-col items-center gap-2 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-200 rounded-full blur-xl -mr-8 -mt-8 opacity-50 pointer-events-none"></div>
                <p className="text-xs text-indigo-950 font-bold relative z-10">
                  Want to become a Mandi Operator?
                </p>
                <Link to="/operator/register" className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 h-10 rounded-lg text-xs font-bold transition-all shadow-md relative z-10">
                  Register as New Candidate
                </Link>
              </div>
              
              <p className="text-xs text-slate-500 font-medium">
                Not an operator?{' '}
                <Link to="/roles" className="font-bold text-slate-700 hover:text-slate-900 hover:underline">
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
    </div>
  );
}
`;

const newContent = content.substring(0, startIndex) + newReturnBlock;
fs.writeFileSync(path, newContent);
console.log("Updated OperatorLogin layout.");
