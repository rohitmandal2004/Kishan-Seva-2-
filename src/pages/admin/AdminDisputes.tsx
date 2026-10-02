import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scale, CheckCircle2, XCircle, Search, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { toast } from 'sonner';

export default function AdminDisputes() {
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppeals();
  }, []);

  const fetchAppeals = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('qc_appeals')
          .select('*, bookings(token_number, crop_name, centre_name), farmer_profiles(full_name, phone)')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setAppeals(data || []);
      }
    } catch (err) {
      console.error('Error fetching appeals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('qc_appeals')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', id);
          
        if (error) throw error;
        toast.success(`Appeal marked as ${status}`);
        fetchAppeals();
      }
    } catch (err) {
      toast.error('Failed to update appeal');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b-2 border-slate-900 pb-6">
        <div>
          <span className="text-[10px] uppercase font-black bg-slate-900 text-white px-2 py-0.5 tracking-widest inline-block mb-2">
            Dispute Management
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight uppercase">
            QC Disputes & Appeals
          </h1>
          <p className="text-xs font-bold text-slate-700 mt-2 uppercase tracking-widest">
            Manage farmer quality check appeals and re-test requests.
          </p>
        </div>
      </div>

      <div className="border-2 border-slate-900 shadow-[8px_8px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-900">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
            <p className="font-black uppercase tracking-widest">Loading appeals...</p>
          </div>
        ) : appeals.length === 0 ? (
          <div className="p-12 text-center text-slate-900">
            <Scale className="w-12 h-12 text-slate-900 mx-auto mb-4" />
            <p className="font-black text-lg uppercase tracking-widest">NO DISPUTES FOUND</p>
            <p className="text-[10px] font-bold text-slate-600 mt-2 uppercase tracking-widest">There are currently no active QC appeals.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-900 text-[10px] uppercase tracking-widest text-white font-black border-b-2 border-slate-900">
                <tr>
                  <th className="px-6 py-4">Farmer / Token</th>
                  <th className="px-6 py-4">Original Grade</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-900">
                {appeals.map((appeal) => (
                  <tr key={appeal.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-900 uppercase tracking-widest">{appeal.farmer_profiles?.full_name || 'Unknown'}</div>
                      <div className="text-[10px] text-slate-700 font-mono font-bold mt-1 border-2 border-slate-900 inline-block px-1">
                        TKN: {appeal.bookings?.token_number || appeal.booking_id.substring(0,8)}
                      </div>
                      <div className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-widest">{appeal.bookings?.centre_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono font-black text-slate-900 border-2 border-slate-900 px-2 py-1 text-xs">
                        {appeal.original_grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-[10px] font-bold text-slate-900 line-clamp-2 uppercase tracking-wider" title={appeal.appeal_reason}>
                        {appeal.appeal_reason}
                      </p>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mt-2 border-t-2 border-slate-900 pt-1 w-fit">
                        {new Date(appeal.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span 
                        className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 border-2 border-slate-900 ${
                          appeal.status === 'PENDING' ? 'bg-amber-400 text-slate-900' :
                          appeal.status === 'APPROVED' ? 'bg-emerald-400 text-slate-900' :
                          appeal.status === 'RE_TESTED' ? 'bg-blue-400 text-slate-900' :
                          'bg-slate-200 text-slate-900'
                        }`}
                      >
                        {appeal.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {appeal.status === 'PENDING' && (
                        <div className="flex justify-end gap-2">
                          <button 
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-[9px] font-black uppercase tracking-widest border-2 border-slate-900 px-3 py-2 shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] transition-all"
                            onClick={() => handleUpdateStatus(appeal.id, 'APPROVED')}
                          >
                            APPROVE
                          </button>
                          <button 
                            className="bg-red-500 hover:bg-red-400 text-white text-[9px] font-black uppercase tracking-widest border-2 border-slate-900 px-3 py-2 shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] transition-all"
                            onClick={() => handleUpdateStatus(appeal.id, 'REJECTED')}
                          >
                            REJECT
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
