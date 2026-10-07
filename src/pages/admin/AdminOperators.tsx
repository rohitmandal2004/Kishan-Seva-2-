import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { logAudit, sendNotification } from '@/lib/audit';
import { 
  Users, CheckCircle2, XCircle, Ban, 
  Search, Loader2, Building2, UserCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Copy } from 'lucide-react';

export default function AdminOperators() {
  const [operators, setOperators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [centres, setCentres] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [generatedCredentials, setGeneratedCredentials] = useState<{ id: string, setupUrl: string, email: string, password?: string } | null>(null);
  const [viewingOperator, setViewingOperator] = useState<any>(null);

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('admin-operators-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'operator_profiles' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [opsRes, centresRes] = await Promise.all([
        supabase
          .from('operator_profiles')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('procurement_centres')
          .select('id, name, district')
          .order('name')
      ]);

      if (opsRes.error) throw opsRes.error;
      if (centresRes.error) throw centresRes.error;

      const centresList = centresRes.data || [];
      const opsList = opsRes.data || [];

      // Manually join centre data since the foreign key relation might be missing in the DB
      const operatorsWithCentres = opsList.map(op => {
        const reqCentre = centresList.find(c => c.id === op.requested_centre_id);
        const assignedCentre = centresList.find(c => c.id === op.assigned_centre_id);
        return {
          ...op,
          requested_centre: reqCentre || null,
          assigned_centre: assignedCentre || null
        };
      });

      setOperators(operatorsWithCentres);
      setCentres(centresList);
    } catch (err) {
      console.error('Error fetching operators:', err);
      toast.error('Failed to load operator requests');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('operator_profiles')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`Operator status updated to ${status}`);
      fetchData();
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update operator status');
    }
  };

  const handleApproveOperator = async (op: any) => {
    setApprovingId(op.id);
    try {
      // Generate credentials
      const assignedCentre = op.assigned_centre_id || op.requested_centre_id;
      if (!assignedCentre) {
          toast.error('Please assign a centre before approving.');
          setApprovingId(null);
          return;
      }
      // Ensure assigned_centre_id is saved if the admin didn't manually change it
      if (!op.assigned_centre_id) {
          await supabase.from('operator_profiles').update({ assigned_centre_id: assignedCentre }).eq('id', op.id);
      }
      
      const { data, error } = await supabase.functions.invoke('approve-operator', {
        body: {
          operatorProfileId: op.id,
          email: op.email,
          assignedCentreId: assignedCentre,
          fullName: op.full_name
        }
      });

      if (error) throw error;
        if (data && data.success === false) {
          throw new Error(data.error || 'Unknown edge function error');
        }
      
      toast.success('Operator approved and provisioned successfully');
      setGeneratedCredentials({ id: data.operatorId, setupUrl: data.setupUrl, email: op.email, password: data.password });
      await sendNotification(undefined, 'SYSTEM', 'Account Provisioned', `Operator account credentials sent to ${op.phone}`, op.phone);
      fetchData();
    } catch (err: any) {
      console.error('Error provisioning operator:', err);
      toast.error(`Edge function failed: ${err.message || JSON.stringify(err)}`);
    } finally {
      setApprovingId(null);
    }
  };

  const handleUpdateCentre = async (id: string, centreId: string) => {
    try {
      const { error } = await supabase
        .from('operator_profiles')
        .update({ assigned_centre_id: centreId })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Operator centre updated successfully');
      fetchData();
    } catch (err) {
      console.error('Error updating centre:', err);
      toast.error('Failed to update operator centre');
    }
  };

  const filteredOperators = operators.filter(op => 
    op.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Operator Management
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Review, approve, and manage procurement centre operators.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, email, or employee ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 h-11 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Main List */}
      <Card className="rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/40 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Operator Info</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Assigned Centre</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Registration Date</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                    <p className="mt-2 text-sm text-slate-500 font-medium">Loading operators...</p>
                  </td>
                </tr>
              ) : filteredOperators.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No operators found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredOperators.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                          {op.full_name?.charAt(0) || <UserCircle className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{op.full_name}</div>
                          <div className="text-xs text-slate-500">{op.email} | {op.phone}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {op.employee_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <div className="flex flex-col text-slate-700 text-xs">
                          <span className="font-semibold text-slate-500">Requested:</span>
                          <span className="truncate max-w-[200px]" title={op.requested_centre?.name}>
                            {op.requested_centre?.name || 'Not assigned'}
                          </span>
                        </div>
                        <div className="flex flex-col text-slate-700 text-xs mt-1">
                          <span className="font-semibold text-slate-500">Assigned:</span>
                        </div>
                        <select
                          className="mt-1 text-xs border border-slate-200 rounded px-2 py-1 bg-white max-w-[200px]"
                          value={op.assigned_centre_id || op.requested_centre_id || ''}
                          onChange={(e) => handleUpdateCentre(op.id, e.target.value)}
                        >
                          <option value="">Select Centre...</option>
                          {centres.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {format(new Date(op.created_at), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={`
                        ${op.status === 'APPROVED' || op.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                        ${op.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                        ${op.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' : ''}
                        ${op.status === 'SUSPENDED' ? 'bg-slate-100 text-slate-700 border-slate-300' : ''}
                        font-bold
                      `}>
                        {op.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {op.status === 'PENDING' && (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => handleApproveOperator(op)} 
                              disabled={approvingId === op.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1"
                            >
                              {approvingId === op.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} 
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(op.id, 'REJECTED')} className="border-rose-200 text-rose-700 hover:bg-rose-50 h-8 text-xs gap-1">
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </Button>
                          </>
                        )}
                        {(op.status === 'APPROVED' || op.status === 'ACTIVE') && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setViewingOperator(op)} className="border-blue-200 text-blue-700 hover:bg-blue-50 h-8 text-xs gap-1">
                              <UserCircle className="w-3.5 h-3.5" /> Details
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(op.id, 'SUSPENDED')} className="border-amber-200 text-amber-700 hover:bg-amber-50 h-8 text-xs gap-1">
                              <Ban className="w-3.5 h-3.5" /> Suspend
                            </Button>
                          </>
                        )}
                        {op.status === 'SUSPENDED' && (
                          <Button size="sm" onClick={() => handleUpdateStatus(op.id, 'APPROVED')} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Reactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Generated Credentials Modal */}
      <Dialog open={!!generatedCredentials} onOpenChange={() => setGeneratedCredentials(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Operator Approved Successfully
            </DialogTitle>
            <DialogDescription>
              The Clerk account has been provisioned. Please securely share these credentials with the operator.
            </DialogDescription>
          </DialogHeader>
          {generatedCredentials && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Operator ID</label>
                <div className="flex items-center justify-between bg-white px-3 py-2 border border-slate-200 rounded-lg">
                  <span className="font-mono font-bold text-slate-900">{generatedCredentials.id}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { navigator.clipboard.writeText(generatedCredentials.id); toast.success('Copied ID'); }}>
                    <Copy className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Email (For Login)</label>
                <div className="flex items-center justify-between bg-white px-3 py-2 border border-slate-200 rounded-lg">
                  <span className="font-mono font-bold text-slate-900">{generatedCredentials.email}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { navigator.clipboard.writeText(generatedCredentials.email); toast.success('Copied Email'); }}>
                    <Copy className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                <div className="flex items-center justify-between bg-white px-3 py-2 border border-slate-200 rounded-lg">
                  <span className="font-mono font-bold text-slate-900">{generatedCredentials.password}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { navigator.clipboard.writeText(generatedCredentials.password); toast.success('Copied Password'); }}>
                    <Copy className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setGeneratedCredentials(null)} className="w-full">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Operator Details Modal */}
      <Dialog open={!!viewingOperator} onOpenChange={() => setViewingOperator(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-blue-600" />
              Operator Details & Credentials
            </DialogTitle>
          </DialogHeader>
          {viewingOperator && (
            <div className="space-y-6 py-4">
              {/* Login Credentials Section */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-4">
                <h3 className="text-sm font-bold text-blue-900 border-b border-blue-200/50 pb-2 mb-2">Login Credentials</h3>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Login Portal URL</label>
                  <div className="flex items-center justify-between bg-white px-3 py-2 border border-slate-200 rounded-lg">
                    <span className="font-mono text-xs font-bold text-slate-900 truncate">https://kishanseva.gov.in/operator/login</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Login ID (Email)</label>
                  <div className="flex items-center justify-between bg-white px-3 py-2 border border-slate-200 rounded-lg">
                    <span className="font-mono font-bold text-slate-900">{viewingOperator.email}</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { navigator.clipboard.writeText(viewingOperator.email); toast.success('Copied Login ID'); }}>
                      <Copy className="w-4 h-4 text-slate-400" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                  <div className="bg-white px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-500 font-medium italic">
                    Encrypted securely. Administrator must regenerate if lost.
                  </div>
                </div>
              </div>

              {/* Profile Details Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Full Name</span>
                  <span className="font-bold text-slate-900">{viewingOperator.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Employee ID</span>
                  <span className="font-mono font-bold text-slate-900">{viewingOperator.employee_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Phone Number</span>
                  <span className="font-bold text-slate-900">{viewingOperator.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Assigned Centre</span>
                  <span className="font-bold text-slate-900">{viewingOperator.assigned_centre?.name || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Account Status</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold uppercase">{viewingOperator.status}</Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewingOperator(null)} className="w-full">
              Close Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
