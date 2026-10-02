import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useKishanData } from '@/context/DataContext';
import {
 IndianRupee,
 Search,
 Filter,
 Download,
 RotateCcw,
 CheckCircle2,
 Clock,
 AlertTriangle,
 Building,
 Shield,
} from 'lucide-react';
import { toast } from 'sonner';

interface TransactionRecord {
 id: string;
 dbt_ref: string;
 token_id: string;
 farmer_name: string;
 farmer_id: string;
 bank_name: string;
 account_last4: string;
 ifsc: string;
 crop_type: string;
 net_weight_quintals: number;
 msp_rate_per_quintal: number;
 gross_amount: number;
 deductions: number;
 net_payable: number;
 status: 'COMPLETED' | 'PROCESSING' | 'FAILED' | 'PENDING';
 created_at: string;
 settled_at?: string;
 failure_reason?: string;
}

export default function AdminTransactions() {
 const store = useKishanData();
 const _bookings = store.bookings;
 const _weighments = store.getWeighments();

 const [searchTerm, setSearchTerm] = useState('');
 const [statusFilter, setStatusFilter] = useState('ALL');

 // Simulated ledger derived from weighments & bookings
 const [transactions, setTransactions] = useState<TransactionRecord[]>([
 {
 id: 'TXN-WB-9901',
 dbt_ref: 'DBT/RBI/2026/89401',
 token_id: 'KSP-1040',
 farmer_name: 'Ananda Ghosh',
 farmer_id: 'WB-AGRI-2024-8841',
 bank_name: 'State Bank of India',
 account_last4: '4892',
 ifsc: 'SBIN0001234',
 crop_type: 'Paddy (Grade A)',
 net_weight_quintals: 50.0,
 msp_rate_per_quintal: 2320,
 gross_amount: 116000,
 deductions: 7300,
 net_payable: 108700,
 status: 'COMPLETED',
 created_at: '2026-09-06 09:30 AM',
 settled_at: '2026-09-06 10:15 AM',
 },
 {
 id: 'TXN-WB-9902',
 dbt_ref: 'DBT/RBI/2026/89402',
 token_id: 'KSP-1041',
 farmer_name: 'Subhash Mondal',
 farmer_id: 'WB-AGRI-2024-5512',
 bank_name: 'Punjab National Bank',
 account_last4: '1109',
 ifsc: 'PUNB0182700',
 crop_type: 'Paddy (Common)',
 net_weight_quintals: 32.5,
 msp_rate_per_quintal: 2300,
 gross_amount: 74750,
 deductions: 2150,
 net_payable: 72600,
 status: 'COMPLETED',
 created_at: '2026-09-06 10:05 AM',
 settled_at: '2026-09-06 10:48 AM',
 },
 {
 id: 'TXN-WB-9903',
 dbt_ref: 'DBT/RBI/2026/89403',
 token_id: 'KSP-1042',
 farmer_name: 'Tarun Bhowmik',
 farmer_id: 'WB-AGRI-2024-9102',
 bank_name: 'Bangiya Gramin Vikash Bank',
 account_last4: '7731',
 ifsc: 'BGVB0000412',
 crop_type: 'Mustard Seeds',
 net_weight_quintals: 18.0,
 msp_rate_per_quintal: 5650,
 gross_amount: 101700,
 deductions: 0,
 net_payable: 101700,
 status: 'PROCESSING',
 created_at: '2026-09-06 11:20 AM',
 },
 {
 id: 'TXN-WB-9904',
 dbt_ref: 'DBT/RBI/2026/89404',
 token_id: 'KSP-1043',
 farmer_name: 'Ramen Roy',
 farmer_id: 'WB-AGRI-2024-3329',
 bank_name: 'Bank of Baroda',
 account_last4: '6201',
 ifsc: 'BARB0HABRAX',
 crop_type: 'Paddy (Grade A)',
 net_weight_quintals: 42.0,
 msp_rate_per_quintal: 2320,
 gross_amount: 97440,
 deductions: 3100,
 net_payable: 94340,
 status: 'FAILED',
 created_at: '2026-09-06 11:45 AM',
 failure_reason: 'NPCI Aadhaar-Bank link mapping pending at beneficiary branch',
 },
 {
 id: 'TXN-WB-9905',
 dbt_ref: 'DBT/RBI/2026/89405',
 token_id: 'KSP-1044',
 farmer_name: 'Biren Santra',
 farmer_id: 'WB-AGRI-2024-6721',
 bank_name: 'UCO Bank',
 account_last4: '9045',
 ifsc: 'UCBA0000889',
 crop_type: 'Paddy (Common)',
 net_weight_quintals: 25.0,
 msp_rate_per_quintal: 2300,
 gross_amount: 57500,
 deductions: 1200,
 net_payable: 56300,
 status: 'PENDING',
 created_at: '2026-09-06 12:10 PM',
 },
 ]);

 // Aggregate stats
 const totalDisbursed = transactions
 .filter((t) => t.status === 'COMPLETED')
 .reduce((acc, t) => acc + t.net_payable, 0);

 const pendingCount = transactions.filter(
 (t) => t.status === 'PROCESSING' || t.status === 'PENDING'
 ).length;

 const failedCount = transactions.filter((t) => t.status === 'FAILED').length;

 const filteredTransactions = useMemo(() => {
 return transactions.filter((t) => {
 const matchesSearch =
 t.farmer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
 t.token_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
 t.dbt_ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
 t.farmer_id.toLowerCase().includes(searchTerm.toLowerCase());
 const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
 return matchesSearch && matchesStatus;
 });
 }, [transactions, searchTerm, statusFilter]);

 const handleRetryTransaction = (txn: TransactionRecord) => {
 const updatedRef = `DBT/RBI/2026/${Math.floor(10000 + Math.random() * 90000)}`;
 setTransactions((prev) =>
 prev.map((item) =>
 item.id === txn.id
 ? {
 ...item,
 status: 'PROCESSING',
 dbt_ref: updatedRef,
 failure_reason: undefined,
 created_at: 'Just now (Retried)',
 }
 : item
 )
 );

 toast.success(`DBT payout re-dispatched for ${txn.farmer_name}! Ref: ${updatedRef}`);

 // Simulate async settlement after 2 seconds
 setTimeout(() => {
 setTransactions((prev) =>
 prev.map((item) =>
 item.id === txn.id
 ? {
 ...item,
 status: 'COMPLETED',
 settled_at: 'Just now (Settled)',
 }
 : item
 )
 );
 toast.success(`Payment settled successfully via PFMS gateway for ${txn.farmer_name}!`);
 }, 2500);
 };

 const handleExportCSV = () => {
 const headers = [
 'Transaction ID',
 'DBT Ref',
 'Token',
 'Farmer Name',
 'Farmer ID',
 'Bank',
 'IFSC',
 'Crop',
 'Net Weight (Q)',
 'Net Payable (INR)',
 'Status',
 'Timestamp',
 ];

 const rows = filteredTransactions.map((t) => [
 t.id,
 t.dbt_ref,
 t.token_id,
 `"${t.farmer_name}"`,
 t.farmer_id,
 `"${t.bank_name}"`,
 t.ifsc,
 `"${t.crop_type}"`,
 t.net_weight_quintals,
 t.net_payable,
 t.status,
 `"${t.created_at}"`,
 ]);

 const csvContent =
 'data:text/csv;charset=utf-8,' +
 [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

 const encodedUri = encodeURI(csvContent);
 const link = document.createElement('a');
 link.setAttribute('href', encodedUri);
 link.setAttribute('download', `Kishan_Seva_DBT_Ledger_${Date.now()}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);

 toast.success('DBT Transaction audit ledger exported as CSV!');
 };

 return (
 <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 font-sans">
 {/* Header Banner */}
 <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b-2 border-slate-900 pb-6">
 <div>
 <span className="text-[10px] uppercase font-black bg-slate-900 text-white px-2 py-0.5 tracking-widest inline-block mb-2">
 Public Financial Management System (PFMS) & DBT
 </span>
 <h2 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight uppercase">
 MSP Settlement & DBT Auditing Ledger
 </h2>
 <p className="text-xs font-bold text-slate-700 mt-2 uppercase tracking-widest">
 Real-time tracking of direct bank transfers, RBI payment gateways, and failed disbursement reconciliation.
 </p>
 </div>

 <button
 onClick={handleExportCSV}
 className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-[10px] font-black uppercase tracking-widest border-2 border-slate-900 px-4 py-3 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] transition-all flex items-center gap-2"
 >
 <Download className="w-4 h-4" /> EXPORT AUDIT CSV
 </button>
 </div>

 {/* KPI Cards */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 bg-slate-900 border-2 border-slate-900 shadow-[8px_8px_0px_rgba(0,0,0,1)]">
 <div className="p-6 bg-white flex flex-col justify-between border-[1px] border-slate-900">
 <div className="flex items-center justify-between mb-6">
 <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Settled DBT Today</span>
 <IndianRupee className="w-4 h-4 text-emerald-600" />
 </div>
 <div>
 <div className="flex items-baseline gap-2">
 <h3 className="text-4xl sm:text-5xl font-mono font-black text-slate-900 tabular-nums tracking-tighter">
 {(totalDisbursed / 100000).toFixed(2)}
 </h3>
 <span className="text-xs font-black text-slate-500 uppercase tracking-widest">LAKH</span>
 </div>
 <p className="text-[10px] font-bold text-emerald-700 mt-4 uppercase tracking-widest block border-t-2 border-slate-900 pt-2">100% Aadhaar-seeded accounts</p>
 </div>
 </div>

 <div className="p-6 bg-white flex flex-col justify-between border-[1px] border-slate-900">
 <div className="flex items-center justify-between mb-6">
 <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">In PFMS Transit</span>
 <Clock className="w-4 h-4 text-blue-600" />
 </div>
 <div>
 <div className="flex items-baseline gap-2">
 <h3 className="text-4xl sm:text-5xl font-mono font-black text-slate-900 tabular-nums tracking-tighter">{pendingCount}</h3>
 <span className="text-xs font-black text-slate-500 uppercase tracking-widest">BENS</span>
 </div>
 <p className="text-[10px] font-bold text-blue-700 mt-4 uppercase tracking-widest block border-t-2 border-slate-900 pt-2">Expected clearing &lt; 2 hrs</p>
 </div>
 </div>

 <div className="p-6 bg-white flex flex-col justify-between border-[1px] border-slate-900">
 <div className="flex items-center justify-between mb-6">
 <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Failed Transfers</span>
 <AlertTriangle className="w-4 h-4 text-red-500" />
 </div>
 <div>
 <div className="flex items-baseline gap-2">
 <h3 className="text-4xl sm:text-5xl font-mono font-black text-red-600 tabular-nums tracking-tighter">{failedCount}</h3>
 <span className="text-xs font-black text-slate-500 uppercase tracking-widest">ACTN</span>
 </div>
 <p className="text-[10px] text-red-900 bg-red-100 font-mono font-black mt-3 uppercase tracking-widest px-2 py-1 inline-block border-2 border-red-900">
 ONE-CLICK RE-TRIGGER
 </p>
 </div>
 </div>

 <div className="p-6 bg-white flex flex-col justify-between border-[1px] border-slate-900">
 <div className="flex items-center justify-between mb-6">
 <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Gateway SLA</span>
 <Shield className="w-4 h-4 text-emerald-600" />
 </div>
 <div>
 <div className="flex items-baseline gap-2">
 <h3 className="text-4xl sm:text-5xl font-mono font-black text-slate-900 tabular-nums tracking-tighter">99.4%</h3>
 <span className="text-xs font-black text-slate-500 uppercase tracking-widest">SUCC</span>
 </div>
 <p className="text-[10px] font-bold text-slate-600 mt-4 uppercase tracking-widest block border-t-2 border-slate-900 pt-2">RBI RTGS / NEFT connected</p>
 </div>
 </div>
 </div>

 {/* Filter and Search Bar */}
 <div className="p-4 border-2 border-slate-900 bg-white shadow-[8px_8px_0px_rgba(0,0,0,1)]">
 <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
 <div className="relative w-full md:w-96">
 <Search className="w-4 h-4 text-slate-900 absolute left-4 top-1/2 -translate-y-1/2 font-black" />
 <input
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 placeholder="SEARCH BY NAME, TOKEN, REF..."
 className="pl-12 w-full text-xs font-black uppercase tracking-widest rounded-none border-2 border-slate-900 bg-slate-50 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 placeholder:text-slate-400"
 />
 </div>

 <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-900 px-3 py-2 w-full md:w-auto">
 <Filter className="w-4 h-4 text-slate-900" />
 <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">STATUS:</span>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="text-[10px] font-black uppercase tracking-widest bg-transparent text-slate-900 focus:outline-none cursor-pointer"
 >
 <option value="ALL">ALL TRANSACTIONS</option>
 <option value="COMPLETED">COMPLETED</option>
 <option value="PROCESSING">PROCESSING (RBI)</option>
 <option value="FAILED">FAILED / REJECTED</option>
 <option value="PENDING">PENDING BATCH</option>
 </select>
 </div>
 </div>
 </div>

 {/* Transaction Table */}
 <div className="border-2 border-slate-900 shadow-[8px_8px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] border-b-2 border-slate-900">
 <tr>
 <th className="py-4 px-4">DBT Ref / Token</th>
 <th className="py-4 px-4">Farmer Beneficiary</th>
 <th className="py-4 px-4">Bank & Account</th>
 <th className="py-4 px-4">Procurement Details</th>
 <th className="py-4 px-4 text-right">Net Payable</th>
 <th className="py-4 px-4 text-center">Status</th>
 <th className="py-4 px-4 text-right">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y-2 divide-slate-900 font-bold text-slate-900 uppercase tracking-widest">
 {filteredTransactions.map((t) => (
 <tr key={t.id} className="hover:bg-slate-50 transition-colors">
 <td className="py-4 px-4">
 <span className="font-mono font-black text-slate-900 block bg-slate-100 border-2 border-slate-900 px-1 py-0.5 w-fit">{t.dbt_ref}</span>
 <span className="text-[9px] font-mono font-bold text-slate-600 mt-1 block">TOKEN: {t.token_id}</span>
 </td>

 <td className="py-4 px-4">
 <span className="font-black text-slate-900 block text-sm">{t.farmer_name}</span>
 <span className="text-[9px] font-mono font-bold text-slate-600 mt-1 block">{t.farmer_id}</span>
 </td>

 <td className="py-4 px-4">
 <span className="text-slate-900 font-black block flex items-center gap-1">
 <Building className="w-3 h-3 text-slate-900" />
 {t.bank_name}
 </span>
 <span className="text-[9px] font-mono font-bold text-slate-600 mt-1 block">
 A/C: •••• {t.account_last4} • {t.ifsc}
 </span>
 </td>

 <td className="py-4 px-4">
 <span className="font-black text-slate-900 block">{t.crop_type}</span>
 <span className="text-[9px] font-bold text-slate-600 mt-1 block">
 {t.net_weight_quintals} Q @ ₹{t.msp_rate_per_quintal}/Q
 </span>
 </td>

 <td className="py-4 px-4 text-right">
 <span className="font-black text-slate-900 text-sm block">
 ₹{t.net_payable.toLocaleString('en-IN')}
 </span>
 {t.deductions > 0 && (
 <span className="text-[9px] font-black text-red-600 mt-1 block">
 -₹{t.deductions.toLocaleString('en-IN')} DED.
 </span>
 )}
 </td>

 <td className="py-4 px-4 text-center">
 <span
 className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 border-2 border-slate-900 inline-flex items-center gap-1 ${
 t.status === 'COMPLETED'
 ? 'bg-emerald-400 text-slate-900'
 : t.status === 'PROCESSING'
 ? 'bg-blue-400 text-slate-900 animate-pulse'
 : t.status === 'FAILED'
 ? 'bg-red-500 text-white'
 : 'bg-amber-400 text-slate-900'
 }`}
 >
 {t.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3" />}
 {t.status === 'FAILED' && <AlertTriangle className="w-3 h-3" />}
 {t.status === 'PROCESSING' && <Clock className="w-3 h-3" />}
 {t.status}
 </span>

 {t.failure_reason && (
 <span className="text-[9px] font-bold text-red-600 block mt-2 max-w-[200px] mx-auto text-left leading-tight">
 {t.failure_reason}
 </span>
 )}
 </td>

 <td className="py-4 px-4 text-right">
 {t.status === 'FAILED' ? (
 <button
 onClick={() => handleRetryTransaction(t)}
 className="bg-red-500 hover:bg-red-400 text-white text-[9px] font-black uppercase tracking-widest px-3 py-2 border-2 border-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] transition-all flex items-center gap-1 ml-auto"
 >
 <RotateCcw className="w-3 h-3" /> RETRY DBT
 </button>
 ) : (
 <span className="text-[9px] font-bold text-slate-600 block">
 {t.settled_at ? t.settled_at : t.created_at}
 </span>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}
