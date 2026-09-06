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
  QrCode,
  Volume2,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DigitalGatePassModal } from '@/components/farmer/DigitalGatePassModal';
import { speakQueuePosition } from '@/services/soundAndSpeech';
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
      toast.success(`Voice Audio Playing in Bengali for Token ${booking.token_number}`);
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
    <div className="relative min-h-screen">
      {/* Sleek Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/20 z-0 pointer-events-none"></div>
      
      <div className="relative z-10 p-4 md:p-8 max-w-5xl mx-auto w-full pb-24 md:pb-8 font-sans">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Bookings</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Manage your procurement slots, download E-Gate passes and listen to voice updates
            </p>
          </div>
          <Link to="/farmer/book" className="shrink-0">
            <Button className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2 rounded-2xl h-12 px-6 shadow-md transition-transform active:scale-95">
              <CalendarClock className="w-5 h-5" /> Book New Slot
            </Button>
          </Link>
        </div>

        {/* Main Content Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden mb-8">
          
          {/* Sleek Tabs */}
          <div className="flex p-2 bg-slate-100/50 backdrop-blur-md m-4 rounded-2xl">
            <button
              onClick={() => setFilter('ALL')}
              className={`flex-1 text-sm font-bold py-3 rounded-xl transition-all duration-300 ${
                filter === 'ALL'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
              }`}
            >
              All Bookings
            </button>
            <button
              onClick={() => setFilter('ACTIVE')}
              className={`flex-1 text-sm font-bold py-3 rounded-xl transition-all duration-300 ${
                filter === 'ACTIVE'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
              }`}
            >
              Active <span className="ml-1 bg-emerald-100 text-emerald-700 py-0.5 px-2 rounded-full text-[10px]">{activeBookings.length}</span>
            </button>
            <button
              onClick={() => setFilter('COMPLETED')}
              className={`flex-1 text-sm font-bold py-3 rounded-xl transition-all duration-300 ${
                filter === 'COMPLETED'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
              }`}
            >
              History <span className="ml-1 bg-slate-200 text-slate-700 py-0.5 px-2 rounded-full text-[10px]">{completedBookings.length}</span>
            </button>
          </div>

          <div className="p-4 sm:p-6 pt-2">
            {displayBookings.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100 shadow-inner text-slate-300">
                  <Ticket className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">No bookings found</h3>
                <p className="text-sm text-slate-500 mb-6 max-w-sm">
                  You haven't made any slot bookings in this category yet. Start by booking a slot for your produce.
                </p>
                {filter !== 'COMPLETED' && (
                  <Link to="/farmer/book">
                    <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl h-12 px-8 shadow-md">
                      Book Your First Slot
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {displayBookings.map((booking) => {
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
                      className={`p-0 border overflow-hidden rounded-2xl group transition-all duration-300 hover:shadow-md ${
                        isCompleted ? 'bg-slate-50 border-slate-200/60' :
                        isCancelled ? 'bg-red-50/30 border-red-100' :
                        'bg-white border-emerald-100/80 hover:border-emerald-300'
                      }`}
                    >
                      <div className="p-5 flex flex-col md:flex-row gap-5 justify-between md:items-center relative overflow-hidden">
                        
                        {/* Decorative background for active bookings */}
                        {!isCompleted && !isCancelled && (
                          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                        )}

                        <div className="flex gap-4 items-start relative z-10">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                            isCompleted ? 'bg-white border-slate-200 text-slate-400' :
                            isCancelled ? 'bg-white border-red-200 text-red-500' :
                            'bg-emerald-50 border-emerald-100 text-emerald-600'
                          }`}>
                            <Sprout className="w-7 h-7" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="font-extrabold text-slate-900 text-lg">
                                {booking.crop_name} • {booking.expected_quantity_q} Qtl
                              </h3>
                              <Badge
                                className={`${
                                  isCompleted ? 'bg-slate-100 text-slate-700 border-slate-200' : 
                                  isCancelled ? 'bg-red-100 text-red-700 border-red-200' : 
                                  'bg-emerald-100 text-emerald-800 border-emerald-200'
                                } font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider`}
                              >
                                {isCompleted && <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                                {isCancelled && <XCircle className="w-3 h-3 mr-1 inline" />}
                                {!isCompleted && !isCancelled && <Clock className="w-3 h-3 mr-1 inline" />}
                                {booking.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 font-medium mt-2">
                              <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                <Ticket className="w-3.5 h-3.5 text-slate-400" /> Token:
                                <strong className="text-slate-900 font-mono text-[13px]">{booking.token_number}</strong>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {booking.centre_name}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <CalendarClock className="w-3.5 h-3.5 text-slate-400" /> {booking.slot_date} at {booking.slot_time}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-5 mt-2 md:mt-0 w-full md:w-auto shrink-0 justify-start md:justify-end relative z-10">
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedPassBooking(normalizedBooking)}
                            className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 text-xs font-bold rounded-xl h-10 shadow-sm flex items-center gap-2 px-4"
                          >
                            <QrCode className="w-4 h-4" /> E-Gate Pass
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVoiceListen(booking)}
                            className="bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold rounded-xl h-10 shadow-sm flex items-center gap-2 px-3"
                            title="Listen in Regional Language"
                          >
                            <Volume2 className="w-4 h-4 text-emerald-600" /> 
                          </Button>

                          {!isCompleted && !isCancelled && (
                            <Link to="/farmer/queue">
                              <Button
                                size="sm"
                                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl h-10 shadow-sm px-4"
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
    </div>
  );
}
