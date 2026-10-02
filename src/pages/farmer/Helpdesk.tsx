import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Headset, FileText, CheckCircle2, AlertCircle, Clock, Send, Ticket } from 'lucide-react';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'sonner';

export default function Helpdesk() {
  const { farmer } = useSupabase();
  const [activeTab, setActiveTab] = useState<'NEW' | 'HISTORY'>('NEW');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock previous tickets
  const [tickets, setTickets] = useState([
    { id: 'TKT-2026-0812', subject: 'Payment delayed for Booking #102', status: 'RESOLVED', date: 'Oct 01, 2026', response: 'Your payment was stuck at Treasury level. It has now been cleared and should reflect in your HDFC account ending in 4321 within 24 hours.' },
    { id: 'TKT-2026-0845', subject: 'Quality check disputed at Basirhat PC', status: 'IN_PROGRESS', date: 'Oct 02, 2026', response: null }
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !category || !description) {
      toast.error('Please fill all fields');
      return;
    }
    setIsSubmitting(true);
    
    setTimeout(() => {
      setTickets([{
        id: `TKT-2026-0${Math.floor(Math.random() * 1000 + 800)}`,
        subject,
        status: 'OPEN',
        date: 'Oct 02, 2026',
        response: null
      }, ...tickets]);
      setSubject('');
      setCategory('');
      setDescription('');
      setIsSubmitting(false);
      toast.success('Grievance ticket created successfully!');
      setActiveTab('HISTORY');
    }, 800);
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Headset className="w-6 h-6 text-emerald-600" /> Help & Grievance Redressal
        </h1>
        <p className="text-slate-500 text-sm mt-1">Raise support tickets for payments, quality disputes, or technical issues.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('NEW')}
          className={`pb-3 px-4 text-sm font-bold transition-colors relative ${activeTab === 'NEW' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Raise New Ticket
          {activeTab === 'NEW' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-3 px-4 text-sm font-bold transition-colors relative ${activeTab === 'HISTORY' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          My Tickets
          {activeTab === 'HISTORY' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full"></div>}
        </button>
      </div>

      {activeTab === 'NEW' ? (
        <Card className="p-6 border-slate-200 shadow-sm bg-white rounded-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase mb-1.5 block">Category</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="">Select Category...</option>
                  <option value="PAYMENT">DBT / Payment Issue</option>
                  <option value="QUALITY">Quality Check Dispute</option>
                  <option value="SLOT">Slot Booking / Queue</option>
                  <option value="BANK">Bank Account Linking</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase mb-1.5 block">Subject</label>
                <Input 
                  value={subject} 
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of the issue" 
                  className="h-11 bg-slate-50 border-slate-200 rounded-lg" 
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase mb-1.5 block">Detailed Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain your issue in detail. If related to a specific booking, mention the Token Number..." 
                className="w-full p-4 text-sm bg-slate-50 border border-slate-200 rounded-lg min-h-[150px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-6 rounded-lg gap-2 shadow-sm transition-transform active:scale-95">
                <Send className="w-4 h-4" /> {isSubmitting ? 'Submitting...' : 'Submit Grievance'}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map(ticket => (
            <Card key={ticket.id} className="p-5 border-slate-200 bg-white shadow-sm rounded-xl transition hover:shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${ticket.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' : ticket.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{ticket.subject}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{ticket.id} • {ticket.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:self-start">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${ticket.status === 'RESOLVED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : ticket.status === 'IN_PROGRESS' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                    {ticket.status}
                  </span>
                </div>
              </div>
              
              {ticket.response ? (
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex gap-3 text-sm">
                  <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block mb-1">Official Response:</span>
                    <p className="text-slate-600 leading-relaxed">{ticket.response}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  Our support team is reviewing your ticket and will respond shortly.
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
