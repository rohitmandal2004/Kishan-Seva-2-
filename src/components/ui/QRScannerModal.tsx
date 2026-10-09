import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
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

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isOpen && isScanning) {
      // Initialize scanner
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      scannerRef.current = scanner;

      scanner.render(
        (decodedText) => {
          // Verify if decoded text is a valid token in our system
          const exists = store.getBookings().some(b => b.token_number === decodedText.toUpperCase() && b.status !== 'COMPLETED' && b.status !== 'CANCELLED');
          if (exists) {
            scanner.clear();
            handleSuccess(decodedText.toUpperCase());
          } else {
            // Only alert if we haven't already shown an error recently to avoid spam
            setError('Token scanned is not active or valid.');
          }
        },
        (error) => {
          // Log scan errors silently as they occur frequently while searching for a QR code
          console.debug('QR Scan error:', error);
        }
      );

      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(e => console.error("Failed to clear scanner", e));
        }
      };
    }
  }, [isOpen, isScanning, store]);

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
                
                <div className="absolute inset-0 bg-slate-900 z-10 flex flex-col items-center justify-center">
                  <div id="qr-reader" className="w-full h-full text-white"></div>
                  {/* Remove the simulated styling since Html5QrcodeScanner provides its own UI inside #qr-reader */}
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
