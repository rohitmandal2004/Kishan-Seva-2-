import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2, ChevronLeft, Building2, User, Phone, MapPin, Lock, FileText, CheckCircle2 } from 'lucide-react';
import { KishanSevaLogo } from '@/components/brand/KishanSevaLogo';
import { useClerk } from '@clerk/react';
import { supabase } from '@/lib/supabase';

export default function OperatorRegistration() {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [centres, setCentres] = useState<any[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [appId, setAppId] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    address: '',
    state: 'West Bengal',
    district: '',
    block: '',
    village: '',
    centreId: ''
  });

  useEffect(() => {
    const fetchCentres = async () => {
      try {
        const { data, error } = await supabase
          .from('procurement_centres')
          .select('id, centre_code, name, district, status')
          .eq('status', 'ACTIVE')
          .order('name');
        
        if (error) throw error;
        setCentres(data || []);
      } catch (err) {
        console.error('Error fetching centres:', err);
        toast.error('Failed to load procurement centres');
      }
    };
    fetchCentres();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.centreId) {
      toast.error('Please select a procurement centre');
      return;
    }

    setLoading(true);
    try {
      const { error: dbError } = await supabase.from('operator_profiles').insert({
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        address: `${formData.address}, ${formData.village ? formData.village + ', ' : ''}${formData.block}`,
        district: formData.district,
        state: formData.state,
        requested_centre_id: formData.centreId,
        role_designation: 'Operator',
        status: 'PENDING'
      });

      if (dbError) {
        console.error('Supabase error:', dbError);
        // If employee_id / email exists, it might throw unique constraint error
        if (dbError.code === '23505') {
            toast.error('Operator ID or Email is already registered.');
        } else {
            toast.error('Failed to save operator profile.');
        }
        return;
      }

      setAppId('APP-' + Math.floor(100000 + Math.random() * 900000));
      setIsSubmitted(true);

    } catch (err: any) {
      console.error('[Kishan Seva] Registration error:', err);
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/40 flex flex-col items-center py-10 px-4 font-sans">
      <div className="w-full max-w-2xl relative flex items-center justify-center mb-8 h-10">
        <Link 
          to="/roles" 
          className="absolute left-0 inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-700 font-semibold transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
        <KishanSevaLogo size="md" />
      </div>

      <Card className="w-full max-w-2xl p-6 sm:p-8 shadow-xl border border-slate-200/80 rounded-3xl bg-white">
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
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                Operator Registration
              </h2>
              <p className="text-slate-500 text-sm">
                Submit your details for state admin approval
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Details */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" /> Personal Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Full Name *</Label>
                <Input name="fullName" value={formData.fullName} onChange={handleChange} required className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Email Address *</Label>
                <Input name="email" type="email" value={formData.email} onChange={handleChange} required className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Phone Number *</Label>
                <Input name="phone" type="tel" value={formData.phone} onChange={handleChange} required className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Date of Birth</Label>
                <Input name="dob" type="date" value={formData.dob} onChange={handleChange} className="h-10 rounded-xl" />
              </div>
            </div>
          </section>

          {/* Address Details */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" /> Address Details
            </h3>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Full Address *</Label>
              <Input name="address" value={formData.address} onChange={handleChange} required className="h-10 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">State *</Label>
                <Input name="state" value={formData.state} disabled className="h-10 rounded-xl bg-slate-50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">District *</Label>
                <Input name="district" value={formData.district} onChange={handleChange} required className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Block *</Label>
                <Input name="block" value={formData.block} onChange={handleChange} required className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Village</Label>
                <Input name="village" value={formData.village} onChange={handleChange} className="h-10 rounded-xl" />
              </div>
            </div>
          </section>

          {/* Staff Details */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" /> Professional Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Requested Procurement Centre *</Label>
                <select
                  name="centreId"
                  value={formData.centreId}
                  onChange={handleChange}
                  required
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a centre...</option>
                  {centres.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.district})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <Button 
            type="submit" 
            className="w-full bg-blue-700 hover:bg-blue-800 text-white rounded-xl h-12 text-sm font-bold shadow-md gap-2 mt-4"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Submit Registration
          </Button>

          <div className="text-center mt-6">
            <p className="text-xs text-slate-500 font-medium">
              Already have an account?{' '}
              <Link to="/operator/login" className="font-bold text-blue-700 hover:text-blue-800 hover:underline">
                Log in here
              </Link>
            </p>
          </div>
        </form>
          </>
        )}
      </Card>
    </div>
  );
}
