import React from 'react';
import QRCode from 'react-qr-code';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Booking, ProcurementCentre } from '@/types';
import {
  Printer,
  Download,
  Building2,
  Calendar,
  Clock,
  Truck,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface DigitalGatePassModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  centre?: ProcurementCentre | null;
}

export const DigitalGatePassModal: React.FC<DigitalGatePassModalProps> = ({
  isOpen,
  onClose,
  booking,
  centre,
}) => {
  if (!booking) return null;

  const qrPayload = JSON.stringify({
    token: booking.token_number,
    farmer_id: booking.farmer_id,
    farmer_name: booking.farmer_name,
    centre_id: booking.centre_id,
    slot_date: booking.slot_date,
    slot_time: booking.slot_time,
    quantity_quintals: booking.expected_quantity_q,
    vehicle_number: booking.vehicle_number || 'WB-04-T-8812',
  });

  const handlePrint = () => {
    window.print();
    toast.success('Gate pass sent to printer!');
  };

  const handleDownload = () => {
    toast.success('Digital Gate Pass stored offline in your device passbook!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl bg-white rounded-3xl p-0 overflow-hidden border-2 border-emerald-600/20 shadow-2xl">
        {/* Pass Header Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-5 text-center relative">
          <div className="flex items-center justify-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-amber-300" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100">
              Government of West Bengal • Dept of Agriculture
            </span>
          </div>
          <h2 className="text-xl font-black tracking-wide uppercase">
            Official Mandi E-Gate Pass
          </h2>
          <p className="text-xs text-emerald-200 mt-0.5">
            Smart MSP Digital Procurement Token • Valid for Direct Depot Entry
          </p>
          <div className="absolute top-4 right-4">
            <Badge className="bg-amber-400 text-slate-900 font-extrabold text-[10px] border-0 px-2 py-0.5">
              VERIFIED PASS
            </Badge>
          </div>
        </div>

        {/* Pass Body Content */}
        <div className="p-6 space-y-6 print:p-0">
          {/* Main Token & QR Card */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
            <div className="p-3 bg-white rounded-2xl shadow-xs border border-emerald-200 flex items-center justify-center shrink-0">
              <QRCode
                value={qrPayload}
                size={130}
                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                viewBox={`0 0 256 256`}
              />
            </div>

            <div className="text-center sm:text-left space-y-1.5 w-full">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Mandi Token ID
              </span>
              <div className="font-mono text-2xl sm:text-3xl font-black text-emerald-900 tracking-tight">
                {booking.token_number}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge
                  className={`text-[10px] font-bold border-0 px-2 py-0.5 ${
                    booking.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : booking.status === 'CHECKED_IN'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                  STATUS: {booking.status}
                </Badge>
                <span className="text-xs font-semibold text-slate-600">
                  Crop: <strong className="text-slate-900">{booking.crop_name}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Designated Mandi
              </span>
              <span className="font-extrabold text-slate-900 block mt-1">
                {centre?.name || booking.centre_name || 'Habra Krishak Bazaar'}
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                {centre?.address || 'NH-34 Crossing'}, {centre?.district || 'North 24 Parganas'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Scheduled Window
              </span>
              <span className="font-extrabold text-slate-900 block mt-1">
                {booking.slot_date}
              </span>
              <span className="text-[10px] text-emerald-700 font-bold block flex items-center gap-1">
                <Clock className="w-3 h-3" /> {booking.slot_time}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Farmer Beneficiary
              </span>
              <span className="font-extrabold text-slate-900 block mt-1">
                {booking.farmer_name}
              </span>
              <span className="text-[10px] text-slate-500 font-mono block">
                ID: {booking.farmer_id}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Truck className="w-3 h-3" /> Declared Quantity
              </span>
              <span className="font-extrabold text-slate-900 block mt-1">
                {booking.expected_quantity_q} Quintals
              </span>
              <span className="text-[10px] text-slate-500 font-mono block">
                Vehicle: {booking.vehicle_number || 'WB-04-T-8812'}
              </span>
            </div>
          </div>

          {/* Gate Verification Advisory */}
          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-900 space-y-0.5">
              <strong className="block font-bold">Important Mandi Gate Instructions:</strong>
              <p className="text-amber-800">
                1. Show this QR code to the gate security scanner upon arrival.
                <br />
                2. Carry original <strong>Aadhaar Card</strong> &amp; <strong>RoR Khatian</strong> land record.
                <br />
                3. Ensure grain moisture is tested below 17% for instant Grade-A certification.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between sm:justify-between w-full">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-xs font-bold rounded-xl"
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              className="text-xs font-bold rounded-xl border-slate-200 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Save Offline
            </Button>
            <Button
              type="button"
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" /> Print Gate Pass
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
