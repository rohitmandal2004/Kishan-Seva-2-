import { useState } from 'react';
import { useSupabase } from '@/context/SupabaseContext';
import { useKishanData } from '@/context/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CalendarClock,
  MapPin,
  Ticket,
  Sprout,
  QrCode,
  Volume2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DigitalGatePassModal } from '@/components/farmer/DigitalGatePassModal';
import { speakQueuePosition } from '@/services/soundAndSpeech';
import { Booking } from '@/types';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function FarmerBookings() {
  const { farmer, user, isProfileLoading } = useSupabase();
  const store = useKishanData();
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [selectedPassBooking, setSelectedPassBooking] = useState<Booking | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const allBookings = store.getFarmerBookingsForFarmer(farmer?.id, user?.email);

  const activeBookings = allBookings.filter(
    (b) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(b.status)
  );
  const completedBookings = allBookings.filter((b) =>
    ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(b.status)
  );

  const displayBookings =
    filter === 'ALL'
      ? allBookings
      : filter === 'ACTIVE'
      ? activeBookings
      : completedBookings;

  const handleVoiceListen = (booking: any) => {
    if (booking.status === 'COMPLETED') {
      toast.info(`Procurement completed for ${booking.token_number}. Payout settled.`);
    } else {
      speakQueuePosition(3, 15, 'bn');
      toast.success(`Voice Audio Playing in Bengali for Token ${booking.token_number}`);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      store.updateBookingStatus(cancelTarget.id, 'CANCELLED');
      toast.success(`Booking ${cancelTarget.token_number} has been cancelled.`);
      setCancelTarget(null);
    } catch {
      toast.error('Failed to cancel booking. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isProfileLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">
          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="w-full md:w-36 h-10 rounded-md shrink-0" />
          </div>

          {/* Tabs Skeleton */}
          <div className="flex border-b border-zinc-200 mb-6 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-24 mb-3" />
            ))}
          </div>

          {/* Bookings List Skeleton */}
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-5 border border-zinc-200 rounded-lg shadow-sm bg-white flex flex-col md:flex-row gap-5 justify-between md:items-center">
                <div className="flex gap-4 items-start">
                  <Skeleton className="w-10 h-10 rounded-md shrink-0" />
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-20 rounded-sm" />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-4 md:pt-0 border-t md:border-t-0 border-zinc-100 w-full md:w-auto shrink-0 justify-start md:justify-end">
                  <Skeleton className="h-9 w-16 rounded-md" />
                  <Skeleton className="h-9 w-9 rounded-md" />
                  <Skeleton className="h-9 w-24 rounded-md" />
                  <Skeleton className="h-9 w-9 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 pb-24 md:pb-8">
      <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My Bookings</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Manage your procurement slots and E-Gate passes
            </p>
          </div>
          <Link to="/farmer/book" className="shrink-0">
            <Button className="w-full md:w-auto bg-zinc-900 hover:bg-zinc-800 text-white font-medium gap-2 rounded-md h-10 px-4 transition-transform active:scale-[0.97]">
              <CalendarClock className="w-4 h-4" /> Book New Slot
            </Button>
          </Link>
        </div>

        {/* Segmented Tabs */}
        <div className="flex border-b border-zinc-200 mb-6 gap-6">
          <button
            onClick={() => setFilter('ALL')}
            className={`pb-3 text-sm font-medium transition-colors duration-200 ease-out border-b-2 -mb-px ${
              filter === 'ALL'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            All Bookings
          </button>
          <button
            onClick={() => setFilter('ACTIVE')}
            className={`pb-3 text-sm font-medium transition-colors duration-200 ease-out border-b-2 -mb-px flex items-center gap-2 ${
              filter === 'ACTIVE'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Active 
            <span className={`px-1.5 py-0.5 rounded text-[10px] leading-none ${filter === 'ACTIVE' ? 'bg-zinc-100' : 'bg-zinc-100 text-zinc-500'}`}>
              {activeBookings.length}
            </span>
          </button>
          <button
            onClick={() => setFilter('COMPLETED')}
            className={`pb-3 text-sm font-medium transition-colors duration-200 ease-out border-b-2 -mb-px flex items-center gap-2 ${
              filter === 'COMPLETED'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            History
            <span className={`px-1.5 py-0.5 rounded text-[10px] leading-none ${filter === 'COMPLETED' ? 'bg-zinc-100' : 'bg-zinc-100 text-zinc-500'}`}>
              {completedBookings.length}
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {displayBookings.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center bg-white border border-zinc-200 rounded-lg border-dashed">
              <Ticket className="w-8 h-8 text-zinc-300 mb-4" />
              <h3 className="text-base font-medium text-zinc-900 mb-1">No bookings found</h3>
              <p className="text-sm text-zinc-500 mb-6 max-w-sm">
                You haven't made any slot bookings in this category yet.
              </p>
              {filter !== 'COMPLETED' && (
                <Link to="/farmer/book">
                  <Button className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-md h-10 px-6 transition-transform hover:scale-[1.02] active:scale-[0.97]">
                    Book Your First Slot
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            displayBookings.map((booking) => {
              const normalizedBooking: Booking = {
                id: booking.id,
                token_number: booking.token_number,
                farmer_id: booking.farmer_id || farmer?.id || 'WB-FARM-01',
                farmer_name: booking.farmer_name || farmer?.full_name || 'Farmer Beneficiary',
                farmer_phone: booking.farmer_phone || farmer?.phone || '+91 98301 23456',
                centre_id: booking.centre_id || 'centre-wb-01',
                centre_name: booking.centre_name,
                crop_name: booking.crop_name || 'Paddy (Grade A)',
                expected_quantity_q: booking.expected_quantity_q || 30,
                slot_date: booking.slot_date,
                slot_time: booking.slot_time || '09:00 AM - 11:00 AM',
                status: booking.status,
                vehicle_number: booking.vehicle_number || 'WB-04-T-8812',
                vehicle_type: booking.vehicle_type || 'Tractor',
                booked_at: booking.booked_at || new Date().toISOString(),
                created_at: booking.created_at || new Date().toISOString(),
              };

              const isCompleted = booking.status === 'COMPLETED';
              const isCancelled = ['CANCELLED', 'REJECTED'].includes(booking.status);

              return (
                <Card
                  key={booking.id}
                  className="p-5 border-zinc-200 rounded-lg shadow-sm bg-white transition-[border-color,shadow] duration-200 ease-out hover:shadow-md hover:border-zinc-300 flex flex-col md:flex-row gap-5 justify-between md:items-center"
                >
                  <div className="flex gap-4 items-start">
                    <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 border ${
                      isCompleted ? 'bg-zinc-50 border-zinc-200 text-zinc-500' :
                      isCancelled ? 'bg-red-50 border-red-100 text-red-500' :
                      'bg-emerald-50 border-emerald-100 text-emerald-600'
                    }`}>
                      <Sprout className="w-5 h-5" />
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-3 mb-0.5">
                        <h3 className="font-semibold text-zinc-900 text-base">
                          {booking.crop_name} • {booking.expected_quantity_q} Qtl
                        </h3>
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-sm uppercase tracking-wide ${
                            isCompleted ? 'bg-zinc-100 text-zinc-600' : 
                            isCancelled ? 'bg-red-50 text-red-600' : 
                            'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {booking.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-zinc-500 mt-1.5">
                        <span className="flex items-center gap-1.5 font-mono text-[13px] text-zinc-700 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100">
                          <Ticket className="w-3.5 h-3.5 text-zinc-500" /> {booking.token_number}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-zinc-500" /> {booking.centre_name}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CalendarClock className="w-3.5 h-3.5 text-zinc-500" /> {booking.slot_date} at {booking.slot_time}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 md:pt-0 border-t md:border-t-0 border-zinc-100 w-full md:w-auto shrink-0 justify-start md:justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedPassBooking(normalizedBooking)}
                      className="bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 text-xs font-medium rounded-md h-9 px-3 transition-transform active:scale-[0.97] shadow-sm"
                    >
                      <QrCode className="w-3.5 h-3.5 mr-1.5" /> Pass
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleVoiceListen(booking)}
                      className="bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 text-xs font-medium rounded-md h-9 px-2.5 transition-transform active:scale-[0.97] shadow-sm"
                      title="Listen in Regional Language"
                    >
                      <Volume2 className="w-4 h-4" /> 
                    </Button>

                    {!isCompleted && !isCancelled && (
                      <>
                        <Link to="/farmer/queue">
                          <Button
                            size="sm"
                            className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-md h-9 px-4 transition-transform active:scale-[0.97] shadow-sm ml-1"
                          >
                            Live Queue
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCancelTarget(normalizedBooking)}
                          className="border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 text-xs font-medium rounded-md h-9 px-2.5 transition-transform active:scale-[0.97] shadow-sm"
                          title="Cancel Booking"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Digital Gate Pass Modal */}
        <DigitalGatePassModal
          isOpen={!!selectedPassBooking}
          onClose={() => setSelectedPassBooking(null)}
          booking={selectedPassBooking}
          centre={
            selectedPassBooking
              ? store.getCentreById(selectedPassBooking.centre_id)
              : null
          }
        />

        {/* Cancel Confirmation Dialog */}
        <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
          <DialogContent className="max-w-sm rounded-xl">
            <DialogHeader>
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <DialogTitle className="text-center text-base font-semibold text-zinc-900">
                Cancel Booking?
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-zinc-500 text-center px-2">
              This will cancel token{' '}
              <span className="font-mono font-semibold text-zinc-800">{cancelTarget?.token_number}</span>{' '}
              at <span className="font-semibold text-zinc-800">{cancelTarget?.centre_name}</span>.
              This action cannot be undone.
            </p>
            <DialogFooter className="flex gap-3 mt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-lg"
                onClick={() => setCancelTarget(null)}
                disabled={isCancelling}
              >
                Keep Booking
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                onClick={handleCancelBooking}
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling…' : 'Yes, Cancel'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
