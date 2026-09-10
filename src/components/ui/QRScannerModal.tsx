import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ScanLine, Camera, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useKishanData } from '@/context/DataContext';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QRScannerModal({ isOpen, onClose }: QRScannerModalProps) {
  const navigate = useNavigate();
  const store = useKishanData();
  const [isScanning, setIsScanning] = useState(true);
  const [manualToken, setManualToken] = useState('');
  const [error, setError] = useState('');
  const [successToken, setSuccessToken] = useState('');

  // Simulate scanning for demonstration purposes
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isOpen && isScanning) {
      // In a real app, this would be tied to a barcode scanner hardware or camera stream
      timer = setTimeout(() => {
        // Find a mock booking that isn't completed to simulate scanning
        const activeBookings = store.getBookings().filter(b => b.status !== 'COMPLETED' && b.status !== 'CANCELLED');
        if (activeBookings.length > 0) {
          handleSuccess(activeBookings[0].token_number);
        }
      }, 3000); // simulate a 3-second camera scan
    }
    return () => clearTimeout(timer);
  }, [isOpen, isScanning]);

  if (!isOpen) return null;

  const handleSuccess = (token: string) => {
    setIsScanning(false);
    setSuccessToken(token);
    
    // Auto-route after a brief delay
    setTimeout(() => {
      onClose();
      // Route to quality check prepopulated with token
      navigate(`/operator/quality?token=${token}`);
    }, 1500);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) {
      setError('Please enter a token number');
      return;
    }
    
    const exists = store.getBookings().some(b => b.token_number === manualToken.toUpperCase());
    if (exists) {
      handleSuccess(manualToken.toUpperCase());
    } else {
      setError('Token not found in system. Please verify.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800 font-extrabold">
            <Camera className="w-5 h-5 text-emerald-600" />
            Scan Farmer e-Slip
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner View */}
        <div className="p-6">
          {successToken ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-1">Scan Successful!</h3>
              <p className="text-slate-500 text-sm mb-2">Token: <strong className="text-slate-800">{successToken}</strong></p>
              <p className="text-xs font-bold text-emerald-600 animate-pulse">Routing to Quality Check...</p>
            </div>
          ) : (
            <>
              <div className="relative w-full aspect-square bg-slate-900 rounded-2xl overflow-hidden shadow-inner mb-6">
                {/* Camera Corners overlay */}
                <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl z-10"></div>
                <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl z-10"></div>
                <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl z-10"></div>
                <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-emerald-500 rounded-br-xl z-10"></div>
                
                {/* Simulated Camera Feed (Dark Blur) */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-700 via-slate-900 to-black opacity-80"></div>
                
                {/* Scanning Laser Animation */}
                {isScanning && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_15px_3px_rgba(52,211,153,0.8)] z-20 animate-[scan_2s_ease-in-out_infinite]"></div>
                )}
                
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-white/50">
                  <ScanLine className="w-12 h-12 mb-2 opacity-50" />
                  <p className="text-xs font-bold tracking-widest uppercase">Align QR Code Here</p>
                  <p className="text-[10px] mt-1 text-white/30">(Simulating camera scan)</p>
                </div>
              </div>

              {/* Manual Entry Fallback */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-500 font-bold tracking-wider">Or Enter Manually</span>
                </div>
              </div>

              <form onSubmit={handleManualSubmit} className="mt-5 space-y-3">
                {error && (
                  <div className="flex items-center gap-2 p-2.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input 
                    placeholder="e.g. KSP-MTQ74RQI-983" 
                    value={manualToken}
                    onChange={(e) => {
                      setManualToken(e.target.value);
                      setError('');
                    }}
                    className="flex-1 font-mono uppercase text-sm h-14 rounded-xl"
                    autoFocus={false}
                  />
                  <Button type="submit" className="h-14 px-8 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md">
                    Verify
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
      <style>{`
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
