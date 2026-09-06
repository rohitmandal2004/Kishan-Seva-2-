import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useMockStore } from '@/services/useMockStore';
import { Booking } from '@/types';
import {
  QrCode,
  Camera,
  Search,
  CheckCircle2,
  AlertCircle,
  Truck,
  User,
  Building2,
  ScanLine,
} from 'lucide-react';
import { toast } from 'sonner';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (booking: Booking) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const store = useMockStore();
  const bookings = store.getBookings();

  const [manualToken, setManualToken] = useState('');
  const [isScanningActive, setIsScanningActive] = useState(true);

  // Available tokens for quick-scan simulation in yard
  const activeBookings = bookings.filter(
    (b) => b.status === 'CHECKED_IN' || b.status === 'BOOKED'
  );

  const handleManualSearch = (tokenToFind?: string) => {
    const query = (tokenToFind || manualToken).trim().toUpperCase();
    if (!query) {
      toast.error('Please enter or select a Token Number');
      return;
    }

    const found = bookings.find(
      (b) =>
        b.token_number.toUpperCase() === query ||
        b.id.toUpperCase() === query ||
        b.farmer_name.toUpperCase().includes(query)
    );

    if (found) {
      toast.success(`E-Gate Pass Verified: ${found.farmer_name} (${found.token_number})`);
      onScanSuccess(found);
      onClose();
    } else {
      toast.error(`Token ${query} not found in current Mandi dispatch manifest.`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-slate-900">
                Mandi Gate Optical QR Scanner
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Scan farmer gate pass QR code or enter token ID for instant weighbridge intake.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Simulated Optical Viewport */}
          <div className="relative h-48 bg-slate-950 rounded-2xl overflow-hidden flex flex-col items-center justify-center border-2 border-emerald-500/50 shadow-inner">
            {/* Animated Laser Scanning Line */}
            <div className="absolute inset-x-8 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-bounce" />

            <ScanLine className="w-16 h-16 text-emerald-500/40 animate-pulse mb-2" />
            <p className="text-xs font-mono font-bold text-emerald-400 tracking-wider">
              CAMERA OPTICAL SENSOR ACTIVE
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Align farmer digital pass or printed QR inside viewfinder
            </p>

            {/* Corner Targeting Reticles */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
            <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
          </div>

          {/* Quick Click Simulation Tokens */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Simulate Gate Camera Scan (Incoming Tractors)
            </span>
            <div className="grid grid-cols-2 gap-2">
              {activeBookings.slice(0, 4).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleManualSearch(b.token_number)}
                  className="p-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <span className="font-mono font-black text-xs text-slate-900 group-hover:text-emerald-900 block">
                      {b.token_number}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate block">
                      {b.farmer_name} • {b.expected_quantity_q} Q
                    </span>
                  </div>
                  <Badge className="text-[9px] bg-slate-200 text-slate-700 border-0 group-hover:bg-emerald-200 group-hover:text-emerald-900">
                    SCAN
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Input Fallback */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Manual Token Lookup
            </span>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                  placeholder="e.g. KSP-1040"
                  className="pl-9 text-xs uppercase font-mono font-bold rounded-xl"
                />
              </div>
              <Button
                type="button"
                onClick={() => handleManualSearch()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl px-4"
              >
                Verify
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full text-xs font-bold rounded-xl"
          >
            Close Scanner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
