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
 FileSpreadsheet,
 Building,
 ShieldCheck,
 ArrowUpRight,
 TrendingUp,
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
 const bookings = store.bookings;
 const weighments = store.getWeighments();

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
 <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
 {/* Header Banner */}
 <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3">
 <div>
 <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
 Public Financial Management System (PFMS) & DBT
 </span>
 <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
 MSP Settlement & DBT Auditing Ledger
 </h2>
 <p className="text-xs text-slate-500 mt-0.5">
 Real-time tracking of direct bank transfers, RBI payment gateways, and failed disbursement reconciliation.
 </p>
 </div>

 <Button
 onClick={handleExportCSV}
 className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
 >
 <Download className="w-4 h-4" /> Export Audit CSV
 </Button>
 </div>

 {/* KPI Cards */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
 <Card className="p-4 sm:p-5 border border-slate-200 shadow-xs bg-white rounded-2xl">
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
 Settled DBT Today
 </span>
 <IndianRupee className="w-4 h-4 text-emerald-600" />
 </div>
 <div className="flex items-baseline gap-1.5 mt-2">
 <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
 ₹{(totalDisbursed / 100000).toFixed(2)}
 </h3>
 <span className="text-[11px] font-bold text-slate-500">Lakh</span>
 </div>
 <p className="text-[10px] text-emerald-600 font-semibold mt-1">100% Aadhaar-seeded accounts</p>
 </Card>

 <Card className="p-4 sm:p-5 border border-slate-200 shadow-xs bg-white rounded-2xl">
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
 In PFMS Transit
 </span>
 <Clock className="w-4 h-4 text-blue-600" />
 </div>
 <div className="flex items-baseline gap-1.5 mt-2">
 <h3 className="text-2xl sm:text-3xl font-black text-slate-900">{pendingCount}</h3>
 <span className="text-[11px] font-bold text-slate-500">Beneficiaries</span>
 </div>
 <p className="text-[10px] text-blue-600 font-semibold mt-1">Expected clearing &lt; 2 hrs</p>
 </Card>

 <Card className="p-4 sm:p-5 border border-slate-200 shadow-xs bg-white rounded-2xl">
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
 Failed Transfers
 </span>
 <AlertTriangle className="w-4 h-4 text-red-500" />
 </div>
 <div className="flex items-baseline gap-1.5 mt-2">
 <h3 className="text-2xl sm:text-3xl font-black text-slate-900">{failedCount}</h3>
 <span className="text-[11px] font-bold text-red-600">Requires Action</span>
 </div>
 <p className="text-[10px] text-red-500 font-semibold mt-1">One-click re-trigger available</p>
 </Card>

 <Card className="p-4 sm:p-5 border border-slate-200 shadow-xs bg-white rounded-2xl">
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
 Gateway SLA
 </span>
 <ShieldCheck className="w-4 h-4 text-emerald-600" />
 </div>
 <div className="flex items-baseline gap-1.5 mt-2">
 <h3 className="text-2xl sm:text-3xl font-black text-slate-900">99.4%</h3>
 <span className="text-[11px] font-bold text-emerald-600">Success Rate</span>
 </div>
 <p className="text-[10px] text-slate-500 mt-1">RBI RTGS / NEFT connected</p>
 </Card>
 </div>

 {/* Filter and Search Bar */}
 <Card className="p-4 border border-slate-200 shadow-xs bg-white rounded-2xl">
 <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
 <div className="relative w-full md:w-96">
 <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
 <Input
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 placeholder="Search by farmer name, token, DBT ref, ID..."
 className="pl-10 text-xs rounded-xl border-slate-200 focus-visible:ring-emerald-500"
 />
 </div>

 <div className="flex items-center gap-2 w-full md:w-auto">
 <Filter className="w-3.5 h-3.5 text-slate-500" />
 <span className="text-xs font-semibold text-slate-600">Status:</span>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 outline-hidden focus:border-emerald-500"
 >
 <option value="ALL">All Transactions</option>
 <option value="COMPLETED">Completed (Settled)</option>
 <option value="PROCESSING">Processing in RBI</option>
 <option value="FAILED">Failed / Rejected</option>
 <option value="PENDING">Pending Batch</option>
 </select>
 </div>
 </div>
 </Card>

 {/* Transaction Table */}
 <Card className="border border-slate-200 shadow-xs bg-white rounded-3xl overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
 <tr>
 <th className="py-3.5 px-4">DBT Ref / Token</th>
 <th className="py-3.5 px-4">Farmer Beneficiary</th>
 <th className="py-3.5 px-4">Bank & Account</th>
 <th className="py-3.5 px-4">Procurement Details</th>
 <th className="py-3.5 px-4 text-right">Net Payable</th>
 <th className="py-3.5 px-4 text-center">Status</th>
 <th className="py-3.5 px-4 text-right">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
 {filteredTransactions.map((t) => (
 <tr key={t.id} className="hover:bg-slate-50/80 transition">
 <td className="py-3.5 px-4">
 <span className="font-mono font-bold text-slate-900 block">{t.dbt_ref}</span>
 <span className="text-[10px] font-mono text-slate-500">Token: {t.token_id}</span>
 </td>

 <td className="py-3.5 px-4">
 <span className="font-extrabold text-slate-900 block">{t.farmer_name}</span>
 <span className="text-[10px] text-slate-500 font-mono">{t.farmer_id}</span>
 </td>

 <td className="py-3.5 px-4">
 <span className="text-slate-800 font-bold block flex items-center gap-1">
 <Building className="w-3 h-3 text-slate-500" />
 {t.bank_name}
 </span>
 <span className="text-[10px] text-slate-500 font-mono">
 A/C: •••• {t.account_last4} • {t.ifsc}
 </span>
 </td>

 <td className="py-3.5 px-4">
 <span className="font-bold text-slate-800 block">{t.crop_type}</span>
 <span className="text-[10px] text-slate-500">
 {t.net_weight_quintals} Q @ ₹{t.msp_rate_per_quintal}/Q
 </span>
 </td>

 <td className="py-3.5 px-4 text-right">
 <span className="font-black text-slate-900 text-sm block">
 ₹{t.net_payable.toLocaleString('en-IN')}
 </span>
 {t.deductions > 0 && (
 <span className="text-[10px] text-red-500">
 -₹{t.deductions.toLocaleString('en-IN')} ded.
 </span>
 )}
 </td>

 <td className="py-3.5 px-4 text-center">
 <Badge
 className={`text-[10px] font-bold border-0 px-2.5 py-0.5 ${
 t.status === 'COMPLETED'
 ? 'bg-emerald-100 text-emerald-800'
 : t.status === 'PROCESSING'
 ? 'bg-blue-100 text-blue-800 animate-pulse'
 : t.status === 'FAILED'
 ? 'bg-red-100 text-red-800'
 : 'bg-amber-100 text-amber-800'
 }`}
 >
 {t.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3 mr-1" />}
 {t.status === 'FAILED' && <AlertTriangle className="w-3 h-3 mr-1" />}
 {t.status === 'PROCESSING' && <Clock className="w-3 h-3 mr-1" />}
 {t.status}
 </Badge>

 {t.failure_reason && (
 <span className="text-[10px] text-red-600 block mt-1 max-w-[200px] mx-auto text-left leading-tight">
 {t.failure_reason}
 </span>
 )}
 </td>

 <td className="py-3.5 px-4 text-right">
 {t.status === 'FAILED' ? (
 <Button
 size="sm"
 onClick={() => handleRetryTransaction(t)}
 className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold h-7 rounded-lg shadow-xs flex items-center gap-1 ml-auto"
 >
 <RotateCcw className="w-3 h-3" /> Retry DBT
 </Button>
 ) : (
 <span className="text-[10px] text-slate-500 font-semibold block">
 {t.settled_at ? t.settled_at : t.created_at}
 </span>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </Card>
 </div>
 );
}
