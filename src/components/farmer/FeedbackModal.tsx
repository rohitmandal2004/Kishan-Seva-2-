import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import { Booking } from '@/types';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export function FeedbackModal({ isOpen, onClose, booking }: FeedbackModalProps) {
  const [waitRating, setWaitRating] = useState(0);
  const [staffRating, setStaffRating] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen && booking && isSupabaseConfigured()) {
      // Check if feedback already exists
      supabase
        .from('centre_feedback')
        .select('id')
        .eq('booking_id', booking.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setHasSubmitted(true);
          } else {
            setHasSubmitted(false);
          }
        });
    }
  }, [isOpen, booking]);

  const handleSubmit = async () => {
    if (!booking) return;
    if (overallRating === 0) {
      toast.error('Please provide an overall rating');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.rpc('submit_centre_feedback', {
          p_booking_id: booking.id,
          p_wait_rating: waitRating,
          p_staff_rating: staffRating,
          p_overall_rating: overallRating,
          p_comment: comment
        });
        
        if (error) throw error;
      }
      
      toast.success('Thank you for your feedback!');
      setHasSubmitted(true);
      setTimeout(onClose, 1500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({ rating, setRating }: { rating: number, setRating: (val: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setRating(star)}
          className="focus:outline-hidden transition-transform hover:scale-110"
        >
          <Star
            className={`w-6 h-6 ${
              star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
            }`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle>Rate Your Experience</DialogTitle>
          <DialogDescription>
            Help us improve {booking?.centre_name} by sharing your feedback.
          </DialogDescription>
        </DialogHeader>

        {hasSubmitted ? (
          <div className="py-8 text-center text-emerald-600 font-medium">
            Feedback already submitted. Thank you!
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Overall Experience <span className="text-red-500">*</span></Label>
              <StarRating rating={overallRating} setRating={setOverallRating} />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Wait Time</Label>
              <StarRating rating={waitRating} setRating={setWaitRating} />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Staff Behavior</Label>
              <StarRating rating={staffRating} setRating={setStaffRating} />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Additional Comments</Label>
              <Textarea 
                placeholder="Tell us what went well or what could be improved..."
                value={comment}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
          </div>
        )}

        {!hasSubmitted && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || overallRating === 0} className="bg-emerald-600 hover:bg-emerald-700">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit Feedback
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
