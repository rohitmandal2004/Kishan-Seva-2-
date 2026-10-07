const fs = require('fs');
let content = fs.readFileSync('src/pages/auth/OperatorRegistration.tsx', 'utf8');

// Add states for submitted
content = content.replace(
  /const \[centres, setCentres\] = useState<any\[\]>\(\[\]\);/,
  `const [centres, setCentres] = useState<any[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [appId, setAppId] = useState('');`
);

// Update submit handler
content = content.replace(
  /toast\.success\('Registration submitted successfully\. Your account is awaiting admin approval\.'\);\s*navigate\('\/operator\/login'\);/,
  `setAppId('APP-' + Math.floor(100000 + Math.random() * 900000));
      setIsSubmitted(true);`
);

// Add success screen in render
content = content.replace(
  /<Card className="w-full max-w-2xl p-6 sm:p-8 shadow-xl border border-slate-200\/80 rounded-3xl bg-white">/,
  `<Card className="w-full max-w-2xl p-6 sm:p-8 shadow-xl border border-slate-200/80 rounded-3xl bg-white">
        {isSubmitted ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Application Submitted</h2>
            <p className="text-slate-600 mb-8">Thank you, {formData.fullName}. Your operator registration has been submitted successfully.</p>
            
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left max-w-sm mx-auto space-y-4 mb-8">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Application Status</p>
                <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                  <Loader2 className="w-3 h-3 animate-spin" /> PENDING ADMIN APPROVAL
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Requested Centre</p>
                <p className="font-semibold text-slate-900">
                  {centres.find(c => c.id === formData.centreId)?.name || 'Unknown Centre'}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Application ID</p>
                <p className="font-mono font-bold text-slate-900">{appId}</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto">
              You will receive your login credentials after your application is approved.
            </p>
            
            <Button onClick={() => navigate('/operator/login')} className="w-full max-w-sm bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 text-sm font-bold shadow-md">
              Back to Login
            </Button>
          </div>
        ) : (`
);

content = content.replace(
  /<\/form>\s*<\/Card>/,
  `</form>
        )}
      </Card>`
);

content = content.replace(
  /import \{ Loader2, ChevronLeft, Building2, User, Phone, MapPin, Lock, FileText \} from 'lucide-react';/,
  `import { Loader2, ChevronLeft, Building2, User, Phone, MapPin, Lock, FileText, CheckCircle2 } from 'lucide-react';`
);

fs.writeFileSync('src/pages/auth/OperatorRegistration.tsx', content);
console.log('done');
