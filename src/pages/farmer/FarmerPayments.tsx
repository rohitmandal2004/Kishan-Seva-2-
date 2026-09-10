import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  CheckCircle2, IndianRupee, History, Download, Edit,
  Building2, TrendingUp, ShieldCheck, Volume2, Calendar
} from 'lucide-react';
import { useKishanData } from '@/context/DataContext';
import { useSupabase } from '@/context/SupabaseContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, parseISO } from 'date-fns';
import { speakDBTDispatched } from '@/services/soundAndSpeech';
import { useLanguage } from '@/services/i18n';

const LS_KEY = 'kishan_bank_details';

export default function FarmerPayments() {
  const store = useKishanData();
  const { farmer, user } = useSupabase();
  const { t, lang } = useLanguage();

  const bookings = store.getFarmerBookingsForFarmer(farmer?.id, user?.email)
    .filter(b => b.status === 'COMPLETED' && b.weighment_data);

  // ─── Bank Details ──────────────────────────────────────────────────────────
  const getInitialDetails = () => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      bankName: farmer?.bank_name || 'State Bank of India',
      accountNumber: farmer?.account_number_masked || (farmer as any)?.account_number || 'XXXXX4567',
      ifsc: farmer?.ifsc_code || 'SBIN0001234',
      upiId: (farmer as any)?.upi_id || '',
    };
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(getInitialDetails);
  const [formData, setFormData] = useState(paymentDetails);

  // Sync from localStorage on mount
  useEffect(() => {
    const saved = getInitialDetails();
    setPaymentDetails(saved);
    setFormData(saved);
  }, [farmer?.id]);

  const handleSavePaymentDetails = async () => {
    setPaymentDetails(formData);
    setIsDialogOpen(false);
    // Persist to localStorage
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(formData));
    } catch {}
    // Persist to Supabase if configured
    if (isSupabaseConfigured() && farmer?.id) {
      try {
        await supabase
          .from('farmer_profiles')
          .update({
            bank_name: formData.bankName,
            ifsc_code: formData.ifsc,
            account_number_masked: formData.accountNumber,
          })
          .eq('id', farmer.id);
      } catch {}
    }
    toast.success(t('payment_details_saved'));
  };

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const totalReceived = bookings.reduce((sum, b) => sum + (b.weighment_data?.net_payable || 0), 0);
  const totalQuintals = bookings.reduce((sum, b) => sum + (b.weighment_data?.net_weight_q || 0), 0);
  const avgMspRate = totalQuintals > 0 ? Math.round(totalReceived / totalQuintals) : null;

  // ─── Monthly Chart Data ────────────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of bookings) {
      const dateStr = b.weighment_data?.timestamp || b.slot_date;
      if (!dateStr) continue;
      try {
        const key = format(parseISO(dateStr.split('T')[0]), 'MMM yy');
        map[key] = (map[key] || 0) + (b.weighment_data?.net_payable || 0);
      } catch {}
    }
    return Object.entries(map).map(([month, amount]) => ({ month, amount }));
  }, [bookings]);

  const stateLabel = farmer?.state || 'India';

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-zinc-50 z-0 pointer-events-none print:hidden" />

      <div className="relative z-10 p-4 md:p-8 max-w-5xl mx-auto space-y-8 print:p-0 print:m-0 print:absolute print:inset-0 print:bg-white pb-24">

        {/* Header */}
        <div className="print:hidden">
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">{t('payments_dbt')}</h1>
          <p className="text-zinc-500 text-sm mt-1 font-medium">{t('payments_subtitle')}</p>
        </div>

        <div className="print:hidden grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Primary DBT Account Card */}
          <Card className="col-span-1 md:col-span-3 p-0 border-0 bg-transparent rounded-md overflow-hidden shadow-sm relative">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 opacity-95" />
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />

            <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/10 rounded-lg border border-white/10 backdrop-blur-md shrink-0">
                  <Building2 className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('primary_dbt_account')}</p>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] px-2 py-0">{t('verified')} ✓</Badge>
                  </div>
                  <h3 className="font-semibold text-xl text-white tracking-tight">{paymentDetails.bankName}</h3>
                  <p className="text-emerald-100/70 font-mono mt-1 text-sm tracking-widest">
                    A/C <span className="text-white text-base">•••• {String(paymentDetails.accountNumber).slice(-4)}</span>
                  </p>
                  {paymentDetails.ifsc && (
                    <p className="text-xs text-zinc-500 mt-1 font-mono">IFSC: <span className="text-slate-300">{paymentDetails.ifsc}</span></p>
                  )}
                  {paymentDetails.upiId && (
                    <p className="text-xs text-zinc-500 mt-0.5 font-mono">UPI: <span className="text-slate-300">{paymentDetails.upiId}</span></p>
                  )}
                </div>
              </div>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white rounded-md h-12 px-6 font-bold backdrop-blur-md shadow-sm transition-all active:scale-[0.97]">
                    <Edit className="w-4 h-4 mr-2" /> {t('manage_details')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] rounded-md border-0 shadow-2xl">
                  <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl font-semibold text-zinc-900">{t('update_bank_details')}</DialogTitle>
                    <DialogDescription className="text-xs">
                      {t('update_bank_details_desc')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="bankName" className="font-bold text-zinc-700 text-xs uppercase tracking-wider">{t('bank_name')}</Label>
                      <Input id="bankName" value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} className="rounded-md border-zinc-200 h-12 bg-zinc-50 focus:bg-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="accountNumber" className="font-bold text-zinc-700 text-xs uppercase tracking-wider">{t('account_no')}</Label>
                        <Input id="accountNumber" value={formData.accountNumber} onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })} className="rounded-md border-zinc-200 h-12 bg-zinc-50 focus:bg-white" type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ifsc" className="font-bold text-zinc-700 text-xs uppercase tracking-wider">{t('ifsc_code')}</Label>
                        <Input id="ifsc" value={formData.ifsc} onChange={(e) => setFormData({ ...formData, ifsc: e.target.value })} className="rounded-md border-zinc-200 h-12 bg-zinc-50 focus:bg-white uppercase" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="upiId" className="font-bold text-zinc-700 text-xs uppercase tracking-wider">{t('upi_id_optional')}</Label>
                      <Input id="upiId" value={formData.upiId} onChange={(e) => setFormData({ ...formData, upiId: e.target.value })} placeholder="example@upi" className="rounded-md border-zinc-200 h-12 bg-zinc-50 focus:bg-white" />
                    </div>
                  </div>
                  <DialogFooter className="mt-6 gap-2">
                    <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-md font-bold h-12">{t('cancel')}</Button>
                    <Button onClick={handleSavePaymentDetails} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-bold h-12 px-8 shadow-md transition-transform active:scale-[0.97]">{t('save_changes')}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </Card>

          {/* Stat 1: Total Remitted */}
          <Card className="p-6 border border-white/60 bg-white/80 backdrop-blur-xl shadow-sm rounded-md flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-emerald-100/80 text-emerald-700 rounded-md">
                <IndianRupee className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm text-emerald-900 uppercase tracking-wider">{t('total_remitted')}</span>
            </div>
            <div>
              <h2 className="text-4xl font-semibold text-emerald-700 font-mono tracking-tighter">
                ₹{totalReceived.toLocaleString('en-IN')}
              </h2>
              <p className="text-xs text-zinc-500 font-medium mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-500" />{t('direct_to_bank')}</p>
            </div>
          </Card>

          {/* Stat 2: Transactions */}
          <Card className="p-6 border border-white/60 bg-white/80 backdrop-blur-xl shadow-sm rounded-md flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-md">
                <History className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm text-zinc-700 uppercase tracking-wider">{t('transactions')}</span>
            </div>
            <div>
              <h2 className="text-4xl font-semibold text-zinc-900 font-mono tracking-tighter">
                {bookings.length}
              </h2>
              <p className="text-xs text-zinc-500 font-medium mt-1">{t('completed_disbursals')}</p>
            </div>
          </Card>

          {/* Stat 3: Avg. MSP Rate (NEW) */}
          <Card className="p-6 border border-white/60 bg-white/80 backdrop-blur-xl shadow-sm rounded-md flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-md">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm text-zinc-700 uppercase tracking-wider">{t('avg_msp_rate')}</span>
            </div>
            <div>
              <h2 className="text-4xl font-semibold text-zinc-900 font-mono tracking-tighter">
                {avgMspRate ? `₹${avgMspRate.toLocaleString('en-IN')}` : '—'}
              </h2>
              <p className="text-xs text-zinc-500 font-medium mt-1">{t('per_quintal_avg')}</p>
            </div>
          </Card>
        </div>

        {/* Monthly Earnings Chart (NEW) */}
        {monthlyData.length > 0 && (
          <div className="print:hidden">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <h3 className="font-semibold text-zinc-900 text-lg">{t('seasonal_earnings')}</h3>
            </div>
            <Card className="p-5 border border-zinc-200/60 bg-white/90 rounded-lg shadow-sm">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#71717a' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, t('earnings') || 'Earnings']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e4e4e7', fontSize: 11 }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {monthlyData.map((_, i) => (
                      <Cell key={i} fill={i === monthlyData.length - 1 ? '#059669' : '#d1fae5'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-zinc-400 text-right mt-1">{t('earnings_chart_note')}</p>
            </Card>
          </div>
        )}

        {/* Transactions List */}
        <div className="print:hidden mt-8">
          <h3 className="font-semibold text-zinc-900 mb-4 text-lg">{t('recent_disbursements')}</h3>

          {bookings.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-md border border-zinc-200 border-dashed">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100">
                <IndianRupee className="w-9 h-9 text-emerald-300" />
              </div>
              <h3 className="font-semibold text-zinc-900 text-lg mb-2">{t('no_payments_yet')}</h3>
              <p className="text-sm text-zinc-500 max-w-xs mx-auto mb-2">{t('no_payments_desc')}</p>
              <p className="text-xs text-zinc-400 mb-8">{t('no_payments_note')}</p>
              <a href="/farmer/book">
                <button className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-md h-11 px-6 transition-transform active:scale-[0.97] shadow-sm">
                  <Building2 className="w-4 h-4" /> {t('book_slot')}
                </button>
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map(b => (
                <Card key={b.id} className="p-0 border border-zinc-200/60 bg-white/90 backdrop-blur-md shadow-sm rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">

                    {/* Left: Info */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-semibold text-zinc-900 text-base">{b.crop_name}</span>
                          <Badge className="bg-zinc-100 text-zinc-700 hover:bg-slate-200 border-0 text-[10px] font-bold px-2">
                            {b.weighment_data?.net_weight_q.toFixed(2)} {t('quintals')}
                          </Badge>
                        </div>
                        <div className="text-xs text-zinc-500 space-y-0.5">
                          <p>{t('token')}: <strong className="font-mono text-zinc-700">{b.token_number}</strong> • {t('date')}: <strong>{b.weighment_data?.timestamp?.split('T')?.[0] || 'N/A'}</strong></p>
                          <p className="flex items-center gap-1 font-mono text-[10px] text-zinc-500">
                            {t('ref')}: {b.weighment_data?.transaction_ref}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-zinc-100">
                      <div className="text-left md:text-right">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">{t('settled_amount')}</p>
                        <p className="text-2xl font-semibold text-emerald-700 font-mono tracking-tight">₹{b.weighment_data?.net_payable?.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] font-bold text-emerald-600 flex items-center md:justify-end gap-1 mt-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> {t('credited_to_bank')}
                        </p>
                      </div>

                      {/* Voice Readout Button (NEW - Item 12) */}
                      <button
                        onClick={() => speakDBTDispatched(b.weighment_data?.net_payable || 0, lang as 'en' | 'hi' | 'bn')}
                        className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-center hover:bg-emerald-100 text-emerald-600 transition-colors shrink-0"
                        title={t('listen_payment_audio')}
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>

                      {/* Download Receipt */}
                      <button
                        onClick={() => {
                          // Item 13: Dynamic state branding
                          const govtLabel = farmer?.state
                            ? `Government of ${farmer.state}`
                            : 'Government of India';
                          const receipt = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payment Receipt – ${b.token_number}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; color: #111; }
  .header { background: #0A2E1A; color: white; padding: 24px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { margin: 0; font-size: 20px; }
  .header p { margin: 4px 0 0; font-size: 11px; opacity: 0.7; }
  .badge { background: #10b981; font-size: 10px; font-weight: bold; padding: 3px 10px; border-radius: 20px; letter-spacing: 1px; }
  .body { border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 24px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
  .row:last-child { border-bottom: none; }
  .label { color: #6b7280; }
  .value { font-weight: bold; }
  .amount { font-size: 28px; font-weight: 900; color: #059669; margin: 20px 0 4px; }
  .footer { text-align: center; margin-top: 24px; font-size: 10px; color: #9ca3af; }
  @media print { body { margin: 0; } }
</style></head><body>
<div class="header">
  <div><h1>Kishan Seva</h1><p>Official Disbursement Receipt</p></div>
  <span class="badge">SETTLED</span>
</div>
<div class="body">
  <div class="row"><span class="label">Token Number</span><span class="value" style="font-family:monospace">${b.token_number}</span></div>
  <div class="row"><span class="label">Farmer Name</span><span class="value">${b.farmer_name}</span></div>
  <div class="row"><span class="label">Crop</span><span class="value">${b.crop_name}</span></div>
  <div class="row"><span class="label">Procurement Centre</span><span class="value">${b.centre_name}</span></div>
  <div class="row"><span class="label">Slot Date</span><span class="value">${b.slot_date}</span></div>
  <div class="row"><span class="label">Net Weight (Quintals)</span><span class="value">${b.weighment_data?.net_weight_q?.toFixed(2)} Q</span></div>
  <div class="row"><span class="label">MSP Rate</span><span class="value">₹${b.weighment_data?.msp_rate_per_q}/Q</span></div>
  <div class="row"><span class="label">Transaction Ref</span><span class="value" style="font-family:monospace">${b.weighment_data?.transaction_ref || 'N/A'}</span></div>
  <div class="row"><span class="label">Weighment Date</span><span class="value">${b.weighment_data?.timestamp?.split('T')?.[0] || 'N/A'}</span></div>
  <div style="margin-top:16px;padding-top:16px;border-top:2px solid #e5e7eb">
    <p style="margin:0;font-size:11px;color:#6b7280;font-weight:600">TOTAL AMOUNT DISBURSED (DBT)</p>
    <p class="amount">₹${b.weighment_data?.net_payable?.toLocaleString('en-IN')}</p>
    <p style="font-size:11px;color:#059669;font-weight:700">✓ Credited directly to registered bank account</p>
  </div>
</div>
<div class="footer">${govtLabel} — Kishan Seva Procurement Portal<br>This is a computer-generated receipt. No signature required.</div>
</body></html>`;
                          const w = window.open('', '_blank', 'width=700,height=900');
                          if (w) { w.document.write(receipt); w.document.close(); w.print(); }
                        }}
                        className="w-10 h-10 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-center hover:bg-zinc-100 hover:text-zinc-900 text-zinc-500 transition-colors shadow-sm shrink-0"
                        title={t('download_receipt')}
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>

                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Print-Only e-J-Form View */}
        <div className="hidden print:block absolute top-0 left-0 w-full h-full bg-white z-50 p-10 font-sans">
          {bookings.map((b, idx) => (
            <div key={b.id} className={idx > 0 ? 'mt-24 page-break-before' : ''}>
              <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                <h1 className="text-3xl font-semibold text-zinc-900 tracking-wider">KISHAN SEVA</h1>
                <p className="text-lg font-bold text-zinc-600 uppercase">Department of Food & Public Distribution</p>
                <p className="text-sm text-zinc-500">{farmer?.state ? `Government of ${farmer.state}` : 'Government of India'}</p>
              </div>

              <h2 className="text-xl font-bold text-center underline mb-8">e-J-Form / Procurement Receipt</h2>

              <div className="grid grid-cols-2 gap-8 mb-8 text-sm border p-6 rounded-lg">
                <div>
                  <p className="mb-2"><span className="text-zinc-500">Farmer Name:</span> <strong className="ml-2 text-base">{b.farmer_name}</strong></p>
                  <p className="mb-2"><span className="text-zinc-500">Farmer ID:</span> <strong className="ml-2 font-mono">{b.farmer_code}</strong></p>
                  <p className="mb-2"><span className="text-zinc-500">Phone:</span> <strong className="ml-2">{b.farmer_phone}</strong></p>
                </div>
                <div className="text-right">
                  <p className="mb-2"><span className="text-zinc-500">Date:</span> <strong className="ml-2">{b.weighment_data?.timestamp?.split('T')?.[0] || 'N/A'}</strong></p>
                  <p className="mb-2"><span className="text-zinc-500">Token No:</span> <strong className="ml-2 font-mono text-lg">{b.token_number}</strong></p>
                  <p className="mb-2"><span className="text-zinc-500">Slip No:</span> <strong className="ml-2 font-mono">{b.weighment_data?.slip_number}</strong></p>
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-400 mb-8 text-sm">
                <thead>
                  <tr className="bg-zinc-100">
                    <th className="border border-slate-400 p-3 text-left">Produce Details</th>
                    <th className="border border-slate-400 p-3 text-right">Gross Weight</th>
                    <th className="border border-slate-400 p-3 text-right">Tare Weight</th>
                    <th className="border border-slate-400 p-3 text-right">Net Weight</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-400 p-3 font-bold">{b.crop_name}</td>
                    <td className="border border-slate-400 p-3 text-right">{b.weighment_data?.gross_weight_q.toFixed(2)} Q</td>
                    <td className="border border-slate-400 p-3 text-right">{b.weighment_data?.tare_weight_q.toFixed(2)} Q</td>
                    <td className="border border-slate-400 p-3 text-right font-semibold text-lg">{b.weighment_data?.net_weight_q.toFixed(2)} Q</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-end mb-16">
                <div className="w-72 bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                  <div className="flex justify-between border-b border-zinc-200 py-2 text-sm">
                    <span className="text-zinc-600">MSP Rate:</span>
                    <span className="font-bold">₹{b.weighment_data?.msp_rate_per_q} / Q</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-200 py-2 text-sm">
                    <span className="text-zinc-600">Gross Amount:</span>
                    <span className="font-bold">₹{b.weighment_data?.gross_amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-300 py-2 text-sm text-red-600">
                    <span>Handling/Mandi Charge:</span>
                    <span className="font-bold">- ₹{b.weighment_data?.handling_charge}</span>
                  </div>
                  <div className="flex justify-between mt-3 py-2 font-semibold text-xl text-zinc-900 border-t border-slate-900">
                    <span>Net Payable:</span>
                    <span>₹{b.weighment_data?.net_payable.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="text-center text-xs text-zinc-500 mt-8 pt-8 border-t border-slate-300 space-y-1">
                <p>This is a computer generated document. DB Transfer Ref: <strong>{b.weighment_data?.transaction_ref}</strong></p>
                <p>Weighbridge Operator: {b.weighment_data?.weighbridge_operator}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
