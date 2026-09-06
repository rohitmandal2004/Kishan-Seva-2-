import { useState } from 'react';
import { useSupabase } from '@/context/SupabaseContext';
import { useMockStore } from '@/services/useMockStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CalendarClock,
  MapPin,
  Ticket,
  Sprout,
  ArrowRight,
  Download,
  QrCode,
  Volume2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DigitalGatePassModal } from '@/components/farmer/DigitalGatePassModal';
import { speakQueuePosition, speakBookingConfirmed } from '@/services/soundAndSpeech';
import { Booking } from '@/types';
import { toast } from 'sonner';

export default function FarmerBookings() {
  const { farmer, user, isProfileLoading } = useSupabase();
  const store = useMockStore();
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [selectedPassBooking, setSelectedPassBooking] = useState<Booking | null>(null);

  const allBookings = store.getFarmerBookingsForFarmer(farmer, user?.email, user?.id);

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
      toast.success(`Voice Audio Playing in Bengali (বাংলা) for Token ${booking.token_number}`);
    }
  };

  if (isProfileLoading) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto w-full space-y-6 pt-12">
        <Skeleton className="h-20 w-1/3 rounded-xl" />
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto w-full pb-24 md:pb-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Bookings</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage your procurement slots, download E-Gate passes and listen to voice updates
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/farmer/book">
            <Button className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold gap-2 rounded-xl h-10 shadow-xs">
              <CalendarClock className="w-4 h-4" /> Book New Slot
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mb-6">
        <div className="flex items-center gap-1 p-1 border-b border-slate-100 bg-slate-50/50">
          <button
            onClick={() => setFilter('ALL')}
            className={`flex-1 text-sm font-bold py-2.5 rounded-xl transition-all ${
              filter === 'ALL'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            All Bookings
          </button>
          <button
            onClick={() => setFilter('ACTIVE')}
            className={`flex-1 text-sm font-bold py-2.5 rounded-xl transition-all ${
              filter === 'ACTIVE'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Active ({activeBookings.length})
          </button>
          <button
            onClick={() => setFilter('COMPLETED')}
            className={`flex-1 text-sm font-bold py-2.5 rounded-xl transition-all ${
              filter === 'COMPLETED'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            History ({completedBookings.length})
          </button>
        </div>

        <div className="p-4">
          {displayBookings.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                <Ticket className="w-8 h-8 text-emerald-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">No bookings found</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm">
                You haven't made any slot bookings in this category yet.
              </p>
              {filter !== 'COMPLETED' && (
                <Link to="/farmer/book">
                  <Button className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl h-10 px-6">
                    Book Your First Slot
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {displayBookings.map((booking) => {
                // Normalize booking for GatePassModal
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

                return (
                  <Card
                    key={booking.id}
                    className="p-0 border border-slate-200 overflow-hidden rounded-2xl group hover:border-emerald-300 transition-colors shadow-xs"
                  >
                    <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                      <div className="flex gap-4 items-start">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                          <Sprout className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-extrabold text-slate-900 text-base">
                              {booking.crop_name} • {booking.expected_quantity_q} Qtl
                            </h3>
                            <Badge
                              className={`${
                                ['COMPLETED'].includes(booking.status)
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : ['CANCELLED', 'REJECTED'].includes(booking.status)
                                  ? 'bg-red-100 text-red-800 border-red-200'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              } font-bold text-[10px] px-2 py-0.5 rounded-full uppercase`}
                            >
                              {booking.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Ticket className="w-3.5 h-3.5 text-slate-400" /> Token:{' '}
                              <span className="text-slate-800 font-bold">{booking.token_number}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" /> {booking.centre_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <CalendarClock className="w-3.5 h-3.5 text-slate-400" /> {booking.slot_date} at{' '}
                              {booking.slot_time}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-4 mt-2 sm:mt-0 w-full sm:w-auto shrink-0 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedPassBooking(normalizedBooking)}
                          className="text-emerald-800 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 text-xs font-bold rounded-xl h-8 shadow-xs flex items-center gap-1"
                        >
                          <QrCode className="w-3.5 h-3.5" /> E-Gate Pass
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVoiceListen(booking)}
                          className="text-slate-700 border-slate-200 hover:bg-slate-100 text-xs font-bold rounded-xl h-8 shadow-xs flex items-center gap-1"
                          title="Listen in Bengali / Hindi"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> Audio
                        </Button>

                        {!['COMPLETED', 'CANCELLED', 'REJECTED'].includes(booking.status) && (
                          <Link to="/farmer/queue">
                            <Button
                              size="sm"
                              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl h-8 shadow-xs"
                            >
                              Live Queue
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
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
    </div>
  );
}
