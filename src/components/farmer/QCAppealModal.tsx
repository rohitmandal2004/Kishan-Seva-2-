import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Scale } from 'lucide-react';
import { Booking } from '@/types';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface QCAppealModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onSuccess: () => void;
}

export function QCAppealModal({ isOpen, onClose, booking, onSuccess }: QCAppealModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!booking) return;
    if (reason.trim().length < 10) {
      toast.error('Please provide a detailed reason for appeal (min 10 characters)');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.rpc('submit_qc_appeal', {
          p_booking_id: booking.id,
          p_reason: reason
        });
        
        if (error) throw error;
      }
      
      toast.success('Appeal submitted successfully. Our team will review this shortly.');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit appeal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-xl">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
            <Scale className="w-6 h-6 text-amber-600" />
          </div>
          <DialogTitle className="text-center text-lg font-semibold text-slate-900">
            Quality Check Appeal
          </DialogTitle>
          <DialogDescription className="text-center">
            Token: <span className="font-mono font-bold text-slate-900">{booking?.token_number}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
            <div className="flex justify-between mb-1">
              <span>Assigned Grade:</span>
              <span className="font-bold text-slate-900">{booking?.quality_data?.grade}</span>
            </div>
            <div className="flex justify-between">
              <span>Inspector:</span>
              <span className="font-medium">{booking?.quality_data?.inspector_name}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Reason for Dispute <span className="text-red-500">*</span></Label>
            <Textarea 
              placeholder="Explain why you disagree with the quality check results..."
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
              className="resize-none"
              rows={4}
            />
          </div>
          
          <p className="text-[11px] text-slate-500 leading-tight">
            Submitting a dispute will put this booking on hold. An automated re-test will be scheduled or a senior inspector will manually review your produce.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || reason.length < 10} className="bg-amber-600 hover:bg-amber-700 text-white">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit Appeal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
