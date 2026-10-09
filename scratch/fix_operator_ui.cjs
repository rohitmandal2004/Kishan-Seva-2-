const fs = require('fs');

const path = 'src/pages/auth/OperatorLogin.tsx';
let content = fs.readFileSync(path, 'utf8');

const startPattern = `  return (\n    <div className="min-h-screen flex flex-col`;
const startIndex = content.indexOf(startPattern);

if (startIndex === -1) {
  console.error("Could not find start pattern!");
  process.exit(1);
}

const newReturnBlock = `  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans bg-slate-50">
      
      {/* LEFT SIDE: Content & Illustration (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between pt-12 px-16 bg-white overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
        
        {/* Top Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2">
            <img src="/logo.svg" alt="Logo" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
              Kishan <span className="text-blue-600">Seva</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
              Government of India
            </p>
          </div>
        </div>

        {/* Decorative corner element */}
        <div className="absolute top-0 left-0 w-48 h-48 bg-blue-50 rounded-br-full opacity-50 pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute top-12 left-12 w-8 h-8 rounded-full bg-blue-100 opacity-50 pointer-events-none"></div>
        <div className="absolute top-24 left-4 w-12 h-12 rounded-full bg-blue-100 opacity-30 pointer-events-none"></div>

        <div className="relative z-10 mt-16 max-w-lg flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-50 text-blue-700 mb-6 border border-blue-100/50">
            <Building2 className="w-3.5 h-3.5" />
            <span className="text-[10px] font-extrabold tracking-widest uppercase">
              Mandi Operations Control
            </span>
          </div>
          
          <h2 className="text-4xl lg:text-[42px] font-black text-slate-900 leading-[1.1] mb-5 tracking-tight">
            Smart Procurement <br />
            <span className="text-blue-600">Logistics</span>
          </h2>
          
          <p className="text-slate-600 text-[15px] leading-relaxed font-medium mb-12 max-w-md">
            Manage daily queues, authenticate farmers, verify crop quality, and execute precision weighments. Your command center for seamless mandi operations.
          </p>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 max-w-[420px]">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 shadow-sm border border-blue-100/50">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex flex-col justify-center">
                <h4 className="text-sm font-bold text-slate-900 mb-0.5">Queue Management</h4>
                <p className="text-[11px] text-slate-500 font-medium">Real-time token tracking</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 shadow-sm border border-blue-100/50">
                <Leaf className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex flex-col justify-center">
                <h4 className="text-sm font-bold text-slate-900 mb-0.5">Quality Verification</h4>
                <p className="text-[11px] text-slate-500 font-medium">Transparent grading</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 shadow-sm border border-blue-100/50">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex flex-col justify-center">
                <h4 className="text-sm font-bold text-slate-900 mb-0.5">Procurement Reports</h4>
                <p className="text-[11px] text-slate-500 font-medium">Live mandi statistics</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 shadow-sm border border-blue-100/50">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex flex-col justify-center">
                <h4 className="text-sm font-bold text-slate-900 mb-0.5">Secure & Reliable</h4>
                <p className="text-[11px] text-slate-500 font-medium">Government backed system</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Illustration Placeholder using CSS for vector look */}
        <div className="relative w-full h-[220px] mt-10 shrink-0 mx-[-4rem]">
          {/* Simple Vector Landscape created with pure CSS/HTML */}
          <div className="absolute bottom-0 w-full h-full overflow-hidden">
            {/* Sky */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-emerald-50/50"></div>
            {/* Background Mountains */}
            <div className="absolute bottom-16 left-[-10%] w-[60%] h-32 bg-blue-200/50 rounded-t-full blur-[2px]"></div>
            <div className="absolute bottom-12 right-[-5%] w-[70%] h-40 bg-blue-200/60 rounded-t-full blur-[1px]"></div>
            {/* Hills Layer 1 */}
            <div className="absolute bottom-8 left-[-20%] w-[80%] h-32 bg-emerald-200/70 rounded-t-[100%]"></div>
            <div className="absolute bottom-6 right-[-10%] w-[80%] h-24 bg-emerald-300/80 rounded-t-[100%]"></div>
            {/* Front Field */}
            <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-b from-emerald-400 to-emerald-500 border-t-2 border-emerald-300"></div>
            {/* Barn */}
            <div className="absolute bottom-12 left-16 w-32 h-20 bg-white border-2 border-slate-200 flex items-end justify-center">
               <div className="w-0 h-0 border-l-[64px] border-l-transparent border-r-[64px] border-r-transparent border-b-[32px] border-b-blue-500 absolute top-[-32px]"></div>
               <div className="w-8 h-10 bg-slate-800 rounded-t-md"></div>
               <div className="absolute top-2 w-16 h-6 flex justify-around">
                  <div className="w-4 h-4 bg-blue-100 rounded-sm"></div>
                  <div className="w-4 h-4 bg-blue-100 rounded-sm"></div>
               </div>
            </div>
            {/* Tractor */}
            <div className="absolute bottom-10 left-44 w-16 h-10 bg-red-600 rounded-tl-lg rounded-tr-sm flex items-end">
               <div className="w-8 h-8 bg-slate-900 rounded-full border-4 border-slate-300 -ml-2 -mb-2 z-10 flex items-center justify-center"><div className="w-2 h-2 bg-slate-400 rounded-full"></div></div>
               <div className="w-6 h-6 bg-slate-900 rounded-full border-2 border-slate-300 ml-auto mr-1 -mb-2 z-10 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div></div>
               <div className="absolute top-[-16px] right-2 w-8 h-4 bg-slate-200 border-b-4 border-slate-300"></div>
               <div className="absolute top-[-24px] right-4 w-1 h-8 bg-slate-800"></div>
            </div>
            {/* Trees */}
            <div className="absolute bottom-16 right-32 w-10 h-14 bg-emerald-700 rounded-full"></div>
            <div className="absolute bottom-14 right-24 w-12 h-16 bg-emerald-800 rounded-full"></div>
            <div className="absolute bottom-12 right-12 w-8 h-12 bg-emerald-600 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative min-h-screen">
        
        {/* Top Right Controls */}
        <div className="absolute top-6 right-6 lg:top-8 lg:right-8 flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end px-6 lg:px-0">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 transition-colors px-4 py-2 rounded-full border border-slate-200 shadow-sm"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Kishan Seva Home
          </Link>
          <LanguageSelector variant="pill" className="shadow-sm text-[11px] font-bold py-2 bg-white" />
        </div>

        {/* Mobile Logo (Visible only on small screens) */}
        <div className="lg:hidden flex items-center justify-center mb-8 w-full relative">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 mr-3">
            <img src="/logo.svg" alt="Logo" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
              Kishan <span className="text-blue-600">Seva</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
              Government of India
            </p>
          </div>
        </div>

        <Card className="w-full max-w-[420px] p-8 lg:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-none rounded-[2rem] bg-white relative">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-5 text-blue-600">
               <Building2 className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">
              Operator Portal Login
            </h2>
            <p className="text-slate-500 text-xs font-medium">
              Enter your credentials to access the operator dashboard
            </p>
          </div>

          {user && user.role === 'OPERATOR' ? (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-900 font-bold mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">Active operator: <strong>{user.email || user.id}</strong></span>
              </div>
              <div className="flex flex-col gap-2 mt-4">
                <Button
                  type="button"
                  onClick={() => navigate('/operator/dashboard')}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-xl font-bold w-full"
                >
                  Go to Dashboard →
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={async () => {
                    await signOut();
                    toast.info('Signed out successfully');
                  }}
                  className="h-10 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold w-full"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input 
                    id="email" 
                    type="text"
                    placeholder="Email or Operator ID (e.g. KSO-BAS-0001)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    required
                    autoFocus
                    className="h-11 rounded-xl text-sm font-semibold pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  Password
                </Label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 rounded-xl text-sm font-semibold pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm"
                  />
                </div>
              </div>
              
              <div className="pt-2 flex flex-col gap-3">
                <Button 
                  type="submit" 
                  className="w-full bg-[#0F62FE] hover:bg-blue-700 text-white rounded-xl h-11 text-sm font-bold shadow-sm"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Sign In →
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handlePasskeyLogin}
                  className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl h-11 text-xs font-bold shadow-sm flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  <Fingerprint className="w-4 h-4 text-blue-600" />
                  Quick Login
                </Button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 text-center relative">
            <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 bg-white px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">OR</div>
            
            <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-5 flex flex-col items-center gap-3 shadow-sm">
              <p className="text-[11px] text-slate-700 font-bold">
                Want to become a Mandi Operator?
              </p>
              <Link to="/operator/register" className="w-full flex items-center justify-center gap-2 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 h-10 rounded-lg text-[11px] font-bold transition-all shadow-sm">
                <Users className="w-3.5 h-3.5" /> Register as New Candidate
              </Link>
            </div>
            
            {isDemoModeEnabled && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDemoRole('OPERATOR');
                  toast.success('Signed in as Operator (Demo Mode)');
                  navigate('/operator/dashboard');
                }}
                className="w-full h-10 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 cursor-pointer mt-2"
              >
                🚀 Quick Demo Access
              </Button>
            )}
          </div>
        </Card>
        
        <div className="mt-8 text-center space-y-1">
          <p className="text-[11px] text-slate-500 font-medium">
            Not an operator?{' '}
            <Link to="/roles" className="font-bold text-blue-600 hover:text-blue-800 hover:underline">
              Back to Roles
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
`;

const newContent = content.substring(0, startIndex) + newReturnBlock;
fs.writeFileSync(path, newContent);
console.log("Updated OperatorLogin to new light-themed layout with vector illustration placeholder.");
