import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle2, IndianRupee, History, Download, CreditCard, Edit, Building2, TrendingUp, ShieldCheck } from 'lucide-react';
import { useMockStore } from '@/services/useMockStore';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'sonner';

export default function FarmerPayments() {
  const store = useMockStore();
  const { farmer, user } = useSupabase();
  const bookings = store.getFarmerBookingsForFarmer(farmer, user?.email, user?.id)
    .filter(b => b.status === 'COMPLETED' && b.weighment_data);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    bankName: farmer?.bank_name || 'State Bank of India',
    accountNumber: farmer?.account_number_masked || (farmer as any)?.account_number || 'XXXXX4567',
    ifsc: farmer?.ifsc_code || 'SBIN0001234',
    upiId: (farmer as any)?.upi_id || ''
  });

  const [formData, setFormData] = useState(paymentDetails);

  const handleSavePaymentDetails = () => {
    setPaymentDetails(formData);
    setIsDialogOpen(false);
    toast.success('Payment details updated successfully.');
  };

  const totalReceived = bookings.reduce((sum, b) => sum + (b.weighment_data?.net_payable || 0), 0);

  return (
    <div className="relative min-h-screen">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/20 z-0 pointer-events-none print:hidden"></div>

      <div className="relative z-10 p-4 md:p-8 max-w-5xl mx-auto space-y-8 print:p-0 print:m-0 print:absolute print:inset-0 print:bg-white pb-24">
        
        {/* Header */}
        <div className="print:hidden">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payments & DBT</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Track your Direct Benefit Transfers for all official procurements.</p>
        </div>

        <div className="print:hidden grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Primary DBT Account Card (Glassmorphism Credit Card Style) */}
          <Card className="col-span-1 md:col-span-3 p-0 border-0 bg-transparent rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 opacity-95"></div>
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md shrink-0">
                  <Building2 className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary DBT Account</p>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] px-2 py-0">Verified ✓</Badge>
                  </div>
                  <h3 className="font-extrabold text-xl text-white tracking-tight">{paymentDetails.bankName}</h3>
                  <p className="text-emerald-100/70 font-mono mt-1 text-sm tracking-widest">
                    A/C <span className="text-white text-base">•••• {paymentDetails.accountNumber.slice(-4)}</span>
                  </p>
                  {paymentDetails.upiId && (
                    <p className="text-xs text-slate-400 mt-2 font-mono">UPI: <span className="text-slate-300">{paymentDetails.upiId}</span></p>
                  )}
                </div>
              </div>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white rounded-xl h-12 px-6 font-bold backdrop-blur-md shadow-sm transition-all">
                    <Edit className="w-4 h-4 mr-2" /> Manage Details
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] rounded-3xl border-0 shadow-2xl">
                  <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl font-black text-slate-900">Update Bank Details</DialogTitle>
                    <DialogDescription className="text-xs">
                      Update your account for receiving Direct Benefit Transfers (DBT).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="bankName" className="font-bold text-slate-700 text-xs uppercase tracking-wider">Bank Name</Label>
                      <Input 
                        id="bankName" 
                        value={formData.bankName} 
                        onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                        className="rounded-xl border-slate-200 h-12 bg-slate-50 focus:bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="accountNumber" className="font-bold text-slate-700 text-xs uppercase tracking-wider">Account No.</Label>
                        <Input 
                          id="accountNumber" 
                          value={formData.accountNumber}
                          onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
                          className="rounded-xl border-slate-200 h-12 bg-slate-50 focus:bg-white"
                          type="password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ifsc" className="font-bold text-slate-700 text-xs uppercase tracking-wider">IFSC Code</Label>
                        <Input 
                          id="ifsc" 
                          value={formData.ifsc}
                          onChange={(e) => setFormData({...formData, ifsc: e.target.value})}
                          className="rounded-xl border-slate-200 h-12 bg-slate-50 focus:bg-white uppercase"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="upiId" className="font-bold text-slate-700 text-xs uppercase tracking-wider">UPI ID (Optional)</Label>
                      <Input 
                        id="upiId" 
                        value={formData.upiId}
                        onChange={(e) => setFormData({...formData, upiId: e.target.value})}
                        placeholder="example@upi"
                        className="rounded-xl border-slate-200 h-12 bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </div>
                  <DialogFooter className="mt-6 gap-2">
                    <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold h-12">Cancel</Button>
                    <Button onClick={handleSavePaymentDetails} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold h-12 px-8 shadow-md">Save Changes</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </Card>

          {/* Stats Cards */}
          <Card className="p-6 border border-white/60 bg-white/80 backdrop-blur-xl shadow-sm rounded-3xl flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-emerald-100/80 text-emerald-700 rounded-xl">
                <IndianRupee className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm text-emerald-900 uppercase tracking-wider">Total Remitted</span>
            </div>
            <div>
              <h2 className="text-4xl font-black text-emerald-700 font-mono tracking-tighter">
                ₹{totalReceived.toLocaleString('en-IN')}
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-500"/> Direct to Bank</p>
            </div>
          </Card>
          
          <Card className="p-6 border border-white/60 bg-white/80 backdrop-blur-xl shadow-sm rounded-3xl flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <History className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm text-slate-700 uppercase tracking-wider">Transactions</span>
            </div>
            <div>
              <h2 className="text-4xl font-black text-slate-900 font-mono tracking-tighter">
                {bookings.length}
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-1">Completed Disbursals</p>
            </div>
          </Card>
        </div>

        {/* Transactions List */}
        <div className="print:hidden mt-8">
          <h3 className="font-extrabold text-slate-900 mb-4 text-lg">Recent Disbursements</h3>
          
          {bookings.length === 0 ? (
            <div className="p-16 text-center text-slate-400 bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-200 border-dashed">
              <IndianRupee className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="font-bold text-lg text-slate-600 mb-1">No Payments Yet</p>
              <p className="text-sm">Completed procurements will appear here once disbursed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map(b => (
                <Card key={b.id} className="p-0 border border-slate-200/60 bg-white/90 backdrop-blur-md shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    
                    {/* Left: Info */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-extrabold text-slate-900 text-base">{b.crop_name}</span>
                          <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-0 text-[10px] font-bold px-2">
                            {b.weighment_data?.net_weight_q.toFixed(2)} Quintals
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 space-y-0.5">
                          <p>Token: <strong className="font-mono text-slate-700">{b.token_number}</strong> • Date: <strong>{b.weighment_data?.timestamp?.split('T')?.[0] || 'N/A'}</strong></p>
                          <p className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                            Ref: {b.weighment_data?.transaction_ref}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right: Amount & Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-6 md:gap-8 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                      <div className="text-left md:text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Settled Amount</p>
                        <p className="text-2xl font-black text-emerald-700 font-mono tracking-tight">₹{b.weighment_data?.net_payable?.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] font-bold text-emerald-600 flex items-center md:justify-end gap-1 mt-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Credited to Bank
                        </p>
                      </div>
                      
                      <button 
                        onClick={() => setTimeout(() => window.print(), 100)}
                        className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center hover:bg-slate-100 hover:text-slate-900 text-slate-500 transition-colors shadow-sm shrink-0" 
                        title="Download official e-J-Form receipt"
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

        {/* Print-Only e-J-Form View (Hidden in normal UI) */}
        <div className="hidden print:block absolute top-0 left-0 w-full h-full bg-white z-50 p-10 font-sans">
          {bookings.map((b, idx) => (
            <div key={b.id} className={idx > 0 ? 'mt-24 page-break-before' : ''}>
              <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                <h1 className="text-3xl font-black text-slate-900 tracking-wider">KISHAN SEVA</h1>
                <p className="text-lg font-bold text-slate-600 uppercase">Department of Food & Public Distribution</p>
                <p className="text-sm text-slate-500">Government of West Bengal</p>
              </div>
              
              <h2 className="text-xl font-bold text-center underline mb-8">e-J-Form / Procurement Receipt</h2>
              
              <div className="grid grid-cols-2 gap-8 mb-8 text-sm border p-6 rounded-lg">
                <div>
                  <p className="mb-2"><span className="text-slate-500">Farmer Name:</span> <strong className="ml-2 text-base">{b.farmer_name}</strong></p>
                  <p className="mb-2"><span className="text-slate-500">Farmer ID:</span> <strong className="ml-2 font-mono">{b.farmer_code}</strong></p>
                  <p className="mb-2"><span className="text-slate-500">Phone:</span> <strong className="ml-2">{b.farmer_phone}</strong></p>
                </div>
                <div className="text-right">
                  <p className="mb-2"><span className="text-slate-500">Date:</span> <strong className="ml-2">{b.weighment_data?.timestamp?.split('T')?.[0] || 'N/A'}</strong></p>
                  <p className="mb-2"><span className="text-slate-500">Token No:</span> <strong className="ml-2 font-mono text-lg">{b.token_number}</strong></p>
                  <p className="mb-2"><span className="text-slate-500">Slip No:</span> <strong className="ml-2 font-mono">{b.weighment_data?.slip_number}</strong></p>
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-400 mb-8 text-sm">
                <thead>
                  <tr className="bg-slate-100">
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
                    <td className="border border-slate-400 p-3 text-right font-black text-lg">{b.weighment_data?.net_weight_q.toFixed(2)} Q</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-end mb-16">
                <div className="w-72 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex justify-between border-b border-slate-200 py-2 text-sm">
                    <span className="text-slate-600">MSP Rate:</span>
                    <span className="font-bold">₹{b.weighment_data?.msp_rate_per_q} / Q</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 py-2 text-sm">
                    <span className="text-slate-600">Gross Amount:</span>
                    <span className="font-bold">₹{b.weighment_data?.gross_amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-300 py-2 text-sm text-red-600">
                    <span>Handling/Mandi Charge:</span>
                    <span className="font-bold">- ₹{b.weighment_data?.handling_charge}</span>
                  </div>
                  <div className="flex justify-between mt-3 py-2 font-black text-xl text-slate-900 border-t border-slate-900">
                    <span>Net Payable:</span>
                    <span>₹{b.weighment_data?.net_payable.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="text-center text-xs text-slate-500 mt-8 pt-8 border-t border-slate-300 space-y-1">
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
