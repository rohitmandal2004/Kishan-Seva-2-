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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">QC Disputes & Appeals</h1>
          <p className="text-slate-500 text-sm mt-1">Manage farmer quality check appeals and re-test requests.</p>
        </div>
      </div>

      <Card className="p-0 border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>Loading appeals...</p>
          </div>
        ) : appeals.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Scale className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="font-semibold text-slate-700">No disputes found</p>
            <p className="text-sm">There are currently no active QC appeals.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Farmer / Token</th>
                  <th className="px-6 py-4">Original Grade</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appeals.map((appeal) => (
                  <tr key={appeal.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{appeal.farmer_profiles?.full_name || 'Unknown'}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        Token: {appeal.bookings?.token_number || appeal.booking_id.substring(0,8)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{appeal.bookings?.centre_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="font-mono bg-white">
                        {appeal.original_grade}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-xs text-slate-700 line-clamp-2" title={appeal.appeal_reason}>
                        {appeal.appeal_reason}
                      </p>
                      <span className="text-[10px] text-slate-400">{new Date(appeal.created_at).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        className={
                          appeal.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                          appeal.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                          appeal.status === 'RE_TESTED' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-800'
                        }
                      >
                        {appeal.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {appeal.status === 'PENDING' && (
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                            onClick={() => handleUpdateStatus(appeal.id, 'APPROVED')}
                          >
                            Approve Re-test
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 hover:bg-red-50 text-xs"
                            onClick={() => handleUpdateStatus(appeal.id, 'REJECTED')}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
