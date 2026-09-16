import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useKishanData } from '@/context/DataContext';
import { useSupabase } from '@/context/SupabaseContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, CheckCircle2, AlertTriangle, Loader2, QrCode } from 'lucide-react';
import { toast } from 'sonner';

export default function QRCheckIn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const centreId = searchParams.get('centreId');
  const { farmer, user } = useSupabase();
  const store = useKishanData();
  
  const [locationStatus, setLocationStatus] = useState<'IDLE' | 'LOCATING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  const centre = centreId ? store.getCentreById(centreId) : null;
  const activeBooking = store.getActiveFarmerBookingForFarmer(farmer?.id, user?.email);

  useEffect(() => {
    if (!centreId) {
      setErrorMsg('Invalid QR Code: No Centre ID found');
      setLocationStatus('ERROR');
    }
  }, [centreId]);

  // Haversine formula to calculate distance between two coordinates in meters
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; 
  };

  const handleVerifyLocationAndCheckIn = () => {
    if (!centre || !activeBooking) return;
    
    // Check if the booking is for THIS centre
    if (activeBooking.centre_id !== centre.id) {
      toast.error('Your booking is for a different Mandi.');
      return;
    }

    if (activeBooking.status !== 'BOOKED') {
      toast.error(`You have already checked in or processed (Status: ${activeBooking.status}).`);
      navigate('/farmer/queue');
      return;
    }

    setLocationStatus('LOCATING');
    
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser');
      setLocationStatus('ERROR');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const distance = calculateDistance(
          latitude, longitude, 
          centre.latitude, centre.longitude
        );

        // Accept within 500 meters
        if (distance <= 500) {
          setLocationStatus('SUCCESS');
          setCheckingIn(true);
          try {
            await store.updateBookingStatus(activeBooking.id, 'CHECKED_IN');
            toast.success('Check-In Successful! You are now in the queue.');
            navigate('/farmer/queue');
          } catch (err) {
            toast.error('Failed to complete check-in. Please try again or ask operator.');
            setLocationStatus('IDLE');
          } finally {
            setCheckingIn(false);
          }
        } else {
          setErrorMsg(`You are too far from the Mandi gate (${Math.round(distance)}m). Please move closer.`);
          setLocationStatus('ERROR');
        }
      },
      (error) => {
        let msg = 'Failed to get location';
        if (error.code === error.PERMISSION_DENIED) msg = 'Location permission denied. Please enable GPS.';
        setErrorMsg(msg);
        setLocationStatus('ERROR');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 md:pb-8 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="p-6 border-slate-200 shadow-md rounded-2xl bg-white text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-xs">
            <QrCode className="w-8 h-8 text-slate-700" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Mandi Gate Check-In</h1>
          
          {!centreId ? (
            <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium text-left">Invalid QR Code. No Mandi ID provided in URL.</p>
            </div>
          ) : !centre ? (
            <div className="mt-6 p-4 flex flex-col items-center text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p className="text-sm">Loading Mandi Details...</p>
            </div>
          ) : !activeBooking ? (
            <div className="mt-6 p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 flex items-start gap-2 text-left">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">No Active Booking Found</p>
                <p className="text-xs mt-1">You don't have an active booking to check-in for today. Please book a slot first.</p>
                <Button 
                  onClick={() => navigate('/farmer/book')}
                  className="mt-3 bg-amber-600 hover:bg-amber-700 text-white h-9 rounded-lg text-xs"
                >
                  Book a Slot
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-left space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Mandi:</span>
                  <span className="font-semibold text-slate-900 truncate max-w-[150px]">{centre.name}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Token:</span>
                  <span className="font-mono font-bold text-slate-900">{activeBooking.token_number}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Produce:</span>
                  <span className="font-medium text-slate-900">{activeBooking.crop_name}</span>
                </div>
              </div>

              {locationStatus === 'ERROR' && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-start gap-2 text-left text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{errorMsg}</p>
                </div>
              )}

              <Button
                onClick={handleVerifyLocationAndCheckIn}
                disabled={locationStatus === 'LOCATING' || checkingIn}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 text-sm font-bold shadow-md"
              >
                {locationStatus === 'LOCATING' ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying Location (GPS)...</>
                ) : checkingIn ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking In...</>
                ) : (
                  <><MapPin className="w-4 h-4 mr-2" /> Verify Location & Check In</>
                )}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
