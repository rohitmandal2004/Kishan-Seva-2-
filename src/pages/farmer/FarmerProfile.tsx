import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSupabase } from '@/context/SupabaseContext';
import { User, MapPin, Phone, ShieldCheck, Mail, LogOut, Edit, Check, X, Sprout, Banknote, CreditCard, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { getCoordinatesForVillage } from '@/services/locationNames';
import { OFFICIAL_MSP_RATES } from '@/lib/constants';

const VILLAGE_OPTIONS = ['Basirhat', 'Diamond Harbour', 'Barasat', 'Habra', 'Baruipur', 'Canning', 'Singur', 'Bongaon'];

export default function FarmerProfile() {
  const { farmer, user, signOut, setFarmer } = useSupabase();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    phone: farmer?.phone || '',
    village: farmer?.village || 'Basirhat',
    crop_name: farmer?.crop_name || 'Paddy (Grade A)',
    land_area_acres: String(farmer?.land_area_acres || ''),
    bank_name: farmer?.bank_name || '',
    account_number: farmer?.account_number_masked || '',
    ifsc_code: farmer?.ifsc_code || '',
  });

  const handleLogout = async () => {
    try { await signOut(); } catch (err) { console.error(err); }
    navigate('/farmer/login', { replace: true });
  };

  const handleEdit = () => {
    setFormData({
      phone: farmer?.phone || '',
      village: farmer?.village || 'Basirhat',
      crop_name: farmer?.crop_name || 'Paddy (Grade A)',
      land_area_acres: String(farmer?.land_area_acres || ''),
      bank_name: farmer?.bank_name || '',
      account_number: farmer?.account_number_masked || '',
      ifsc_code: farmer?.ifsc_code || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const coords = getCoordinatesForVillage(formData.village);
      let newMaskedAccount = formData.account_number || undefined;
      if (newMaskedAccount && !newMaskedAccount.includes('X') && newMaskedAccount.length >= 4) {
        newMaskedAccount = 'XXXX-XXXX-' + newMaskedAccount.slice(-4);
      }

      const updated = {
        ...(farmer || {}),
        phone: formData.phone,
        village: coords.village,
        district: coords.district,
        latitude: coords.latitude,
        longitude: coords.longitude,
        crop_name: formData.crop_name,
        land_area_acres: parseFloat(formData.land_area_acres) || farmer?.land_area_acres,
        bank_name: formData.bank_name || undefined,
        account_number_masked: newMaskedAccount,
        ifsc_code: formData.ifsc_code || undefined,
      };
      setFarmer(updated as any);

      if (farmer?.id) {
        try {
          await supabase.from('farmer_profiles').update({
            phone: formData.phone,
            village: coords.village,
            district: coords.district,
            latitude: coords.latitude,
            longitude: coords.longitude,
            land_area_acres: parseFloat(formData.land_area_acres) || undefined,
            bank_name: formData.bank_name || undefined,
            account_number_masked: newMaskedAccount,
            ifsc_code: formData.ifsc_code || undefined,
          }).eq('id', farmer.id);

          // Update or insert primary crop in farmer_crops
          const { data: cropsList } = await supabase.from('crops').select('id, name');
          const matchedCrop = cropsList?.find(c => 
            c.name.toLowerCase().includes(formData.crop_name.toLowerCase()) || 
            formData.crop_name.toLowerCase().includes(c.name.toLowerCase())
          );
          if (matchedCrop) {
            const { data: existingFarmerCrops } = await supabase
              .from('farmer_crops')
              .select('id')
              .eq('farmer_id', farmer.id)
              .maybeSingle();

            if (existingFarmerCrops?.id) {
              await supabase.from('farmer_crops').update({
                crop_id: matchedCrop.id,
                area_acres: parseFloat(formData.land_area_acres) || undefined,
              }).eq('id', existingFarmerCrops.id);
            } else {
              await supabase.from('farmer_crops').insert({
                farmer_id: farmer.id,
                crop_id: matchedCrop.id,
                season: 'Rabi 2026',
                area_acres: parseFloat(formData.land_area_acres) || 1,
                expected_quantity: (parseFloat(formData.land_area_acres) || 1) * 18,
                unit: 'Quintal',
                status: 'READY_FOR_HARVEST'
              });
            }
          }
        } catch (err) { console.warn('[Kishan Seva] Profile DB update error:', err); }
      }
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Profile</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your Kishan Seva account and Aadhaar linkage.</p>
        </div>
        {!isEditing ? (
          <Button variant="outline" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-2 font-bold shadow-sm" onClick={handleEdit}>
            <Edit className="w-4 h-4" /> Update Profile
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)} className="gap-2 rounded-md" disabled={isSaving}>
              <X className="w-4 h-4" /> Cancel
            </Button>
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 rounded-md font-bold" disabled={isSaving}>
              <Check className="w-4 h-4" /> {isSaving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      {/* Identity */}
      <Card className="p-6 border-slate-200 bg-white shadow-sm rounded-lg">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-emerald-100 border-4 border-emerald-50 text-emerald-700 flex items-center justify-center shadow-inner">
            <User className="w-10 h-10" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-semibold text-slate-900">{farmer?.full_name || 'Verified Farmer'}</h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2">
              <span className="text-sm text-slate-500 font-mono">ID: {farmer?.farmer_code || 'KS-DEMO-999'}</span>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                <ShieldCheck className="w-3 h-3" /> Aadhaar Verified
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact Card */}
        <Card className="p-5 border-slate-200 bg-white shadow-sm rounded-lg space-y-5">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Contact Details</h3>

          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-slate-500 mt-3 shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Mobile Number</p>
              {isEditing ? (
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 XXXXX XXXXX" className="h-10 text-sm rounded-md border-slate-200 bg-slate-50" />
              ) : (
                <p className="font-medium text-slate-900">{farmer?.phone || '+91 99XXXXXX99'}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Email Address</p>
              <p className="font-medium text-slate-900">{user?.email || 'farmer@example.com'}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Linked via Aadhaar — cannot be changed</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-emerald-600 mt-3 shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Farm Village</p>
              {isEditing ? (
                <select value={formData.village} onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                  {VILLAGE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              ) : (
                <>
                  <p className="font-bold text-slate-900 text-sm">{farmer?.village || 'Basirhat'}, {farmer?.district || 'North 24 Parganas'}</p>
                  {farmer?.latitude && (
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{farmer.latitude.toFixed(4)}°N, {farmer.longitude?.toFixed(4)}°E</p>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Agricultural Card */}
        <Card className="p-5 border-slate-200 bg-white shadow-sm rounded-lg space-y-5">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Agricultural Details</h3>

          <div className="flex items-start gap-3">
            <Sprout className="w-4 h-4 text-slate-500 mt-3 shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Total Verified Land</p>
              {isEditing ? (
                <div className="relative">
                  <Input type="number" value={formData.land_area_acres}
                    onChange={(e) => setFormData({ ...formData, land_area_acres: e.target.value })}
                    placeholder="e.g. 4" className="h-10 text-sm rounded-md border-slate-200 bg-slate-50 pr-14" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">acres</span>
                </div>
              ) : (
                <p className="font-bold text-slate-900 text-lg">{farmer?.land_area_acres || '4'} Acres</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Sprout className="w-4 h-4 text-amber-500 mt-3 shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Primary Crop</p>
              {isEditing ? (
                <select value={formData.crop_name} onChange={(e) => setFormData({ ...formData, crop_name: e.target.value })}
                  className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                  {OFFICIAL_MSP_RATES.map(m => <option key={m.crop} value={m.crop}>{m.crop}</option>)}
                </select>
              ) : (
                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded border border-amber-200">
                  {farmer?.crop_name || 'Paddy (Grade A)'}
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Preferences Card */}
        <Card className="p-5 border-slate-200 bg-white shadow-sm rounded-lg space-y-5 md:col-span-2">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Preferences & Notifications</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">WhatsApp Updates</p>
                  <p className="text-[10px] text-slate-500 mt-1">Receive slot reminders and payment alerts on WhatsApp.</p>
                </div>
              </div>
              <div className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">SMS Alerts</p>
                  <p className="text-[10px] text-slate-500 mt-1">Receive critical OTPs and weighment slips via SMS.</p>
                </div>
              </div>
              <div className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked disabled />
                <div className="w-9 h-5 bg-blue-500 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all opacity-70"></div>
              </div>
            </div>
          </div>
        </Card>

        {/* Banking Card */}
        <Card className="p-5 border-slate-200 bg-white shadow-sm rounded-lg space-y-5 md:col-span-2">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Banking Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <Banknote className="w-4 h-4 text-emerald-600 mt-3 shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Bank Name</p>
                {isEditing ? (
                  <select 
                    value={formData.bank_name} 
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">Select Bank</option>
                    {['State Bank of India', 'Punjab National Bank', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank of India', 'Bank of India', 'Indian Bank', 'Central Bank of India', 'Indian Overseas Bank', 'UCO Bank', 'Bank of Maharashtra', 'Kotak Mahindra Bank', 'IndusInd Bank', 'Yes Bank', 'IDBI Bank'].map(bank => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                ) : (
                  <p className="font-bold text-slate-900 text-sm">{farmer?.bank_name || 'Not Provided'}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CreditCard className="w-4 h-4 text-emerald-600 mt-3 shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Account Number</p>
                {isEditing ? (
                  <Input 
                    type="text" 
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    placeholder="Enter Account Number" 
                    className="h-10 text-sm rounded-md border-slate-200 bg-slate-50" 
                  />
                ) : (
                  <p className="font-mono text-slate-900 text-sm tracking-widest">{farmer?.account_number_masked || 'XXXXXXXXX'}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building className="w-4 h-4 text-emerald-600 mt-3 shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">IFSC Code</p>
                {isEditing ? (
                  <Input 
                    type="text" 
                    value={formData.ifsc_code}
                    onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                    placeholder="Enter IFSC Code" 
                    className="h-10 text-sm rounded-md border-slate-200 bg-slate-50 uppercase" 
                  />
                ) : (
                  <p className="font-mono text-slate-900 text-sm">{farmer?.ifsc_code || 'SBIN0000000'}</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleLogout} variant="destructive" className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-bold border border-red-200 transition-transform active:scale-[0.97]">
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );
}
