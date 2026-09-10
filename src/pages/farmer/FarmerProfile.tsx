import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSupabase } from '@/context/SupabaseContext';
import { User, MapPin, Phone, ShieldCheck, Mail, LogOut, Edit, Check, X, Sprout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { getCoordinatesForVillage } from '@/services/locationNames';
import { OFFICIAL_MSP_RATES } from '@/services/mockStore';

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
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const coords = getCoordinatesForVillage(formData.village);
      const updated = {
        ...(farmer || {}),
        phone: formData.phone,
        village: coords.village,
        district: coords.district,
        latitude: coords.latitude,
        longitude: coords.longitude,
        crop_name: formData.crop_name,
        land_area_acres: parseFloat(formData.land_area_acres) || farmer?.land_area_acres,
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
            crop_name: formData.crop_name,
            land_area_acres: parseFloat(formData.land_area_acres) || undefined,
          }).eq('id', farmer.id);
        } catch (err) { console.warn('Profile DB update error:', err); }
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
          <h1 className="text-2xl font-semibold text-zinc-900">My Profile</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage your Kishan Seva account and Aadhaar linkage.</p>
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
      <Card className="p-6 border-zinc-200 bg-white shadow-sm rounded-lg">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-emerald-100 border-4 border-emerald-50 text-emerald-700 flex items-center justify-center shadow-inner">
            <User className="w-10 h-10" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-semibold text-zinc-900">{farmer?.full_name || 'Verified Farmer'}</h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2">
              <span className="text-sm text-zinc-500 font-mono">ID: {farmer?.farmer_code || 'KS-DEMO-999'}</span>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                <ShieldCheck className="w-3 h-3" /> Aadhaar Verified
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact Card */}
        <Card className="p-5 border-zinc-200 bg-white shadow-sm rounded-lg space-y-5">
          <h3 className="font-bold text-zinc-800 border-b border-zinc-100 pb-2">Contact Details</h3>

          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-zinc-500 mt-3 shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1.5">Mobile Number</p>
              {isEditing ? (
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 XXXXX XXXXX" className="h-10 text-sm rounded-md border-zinc-200 bg-zinc-50" />
              ) : (
                <p className="font-medium text-zinc-900">{farmer?.phone || '+91 99XXXXXX99'}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase">Email Address</p>
              <p className="font-medium text-zinc-900">{user?.email || 'farmer@example.com'}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">Linked via Aadhaar — cannot be changed</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-emerald-600 mt-3 shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1.5">Farm Village</p>
              {isEditing ? (
                <select value={formData.village} onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  className="w-full h-10 px-3 text-sm bg-zinc-50 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                  {VILLAGE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              ) : (
                <>
                  <p className="font-bold text-zinc-900 text-sm">{farmer?.village || 'Basirhat'}, {farmer?.district || 'North 24 Parganas'}</p>
                  {farmer?.latitude && (
                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{farmer.latitude.toFixed(4)}°N, {farmer.longitude?.toFixed(4)}°E</p>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Agricultural Card */}
        <Card className="p-5 border-zinc-200 bg-white shadow-sm rounded-lg space-y-5">
          <h3 className="font-bold text-zinc-800 border-b border-zinc-100 pb-2">Agricultural Details</h3>

          <div className="flex items-start gap-3">
            <Sprout className="w-4 h-4 text-zinc-500 mt-3 shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1.5">Total Verified Land</p>
              {isEditing ? (
                <div className="relative">
                  <Input type="number" value={formData.land_area_acres}
                    onChange={(e) => setFormData({ ...formData, land_area_acres: e.target.value })}
                    placeholder="e.g. 4" className="h-10 text-sm rounded-md border-zinc-200 bg-zinc-50 pr-14" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-medium pointer-events-none">acres</span>
                </div>
              ) : (
                <p className="font-bold text-zinc-900 text-lg">{farmer?.land_area_acres || '4'} Acres</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Sprout className="w-4 h-4 text-amber-500 mt-3 shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1.5">Primary Crop</p>
              {isEditing ? (
                <select value={formData.crop_name} onChange={(e) => setFormData({ ...formData, crop_name: e.target.value })}
                  className="w-full h-10 px-3 text-sm bg-zinc-50 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
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
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleLogout} variant="destructive" className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-bold border border-red-200 transition-transform active:scale-[0.97]">
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );
}
