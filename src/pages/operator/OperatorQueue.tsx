import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Search, User, CheckCircle2, ChevronRight,
    BellRing, Scale, Play, QrCode, Camera, X, Volume2, Sparkles
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useKishanData } from '@/context/DataContext';
import { useSupabase } from '@/context/SupabaseContext';
import { useOperator } from '@/hooks/useOperator';

import { playMandiChime, speakAnnouncement } from '@/services/soundAndSpeech';
import { useLanguage } from '@/services/i18n';
import { SmsGateway } from '@/services/smsGateway';
import { toast } from 'sonner';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

export default function OperatorQueue() {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const store = useKishanData();
    const { operatorCentreId } = useOperator();
    const bookings = store.getBookings().filter(b => b.centre_id === operatorCentreId);
    
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [showQrScanner, setShowQrScanner] = useState(false);
    const [qrInput, setQrInput] = useState('');
    const [scanMessage, setScanMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!showQrScanner) return;
        
        let scanner: Html5QrcodeScanner;
        
        // Timeout to allow the DOM element to be created before initializing scanner
        const timer = setTimeout(() => {
            scanner = new Html5QrcodeScanner(
                "qr-reader", 
                { 
                    fps: 10, 
                    qrbox: { width: 250, height: 250 },
                    supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                }, 
                false
            );
            
            scanner.render((decodedText) => {
                try {
                    // Try to parse the QR code if it's our JSON format
                    const data = JSON.parse(decodedText);
                    if (data.token) {
                        setQrInput(data.token);
                        handleQrSubmit(undefined, data.token);
                    } else {
                        setQrInput(decodedText);
                        handleQrSubmit(undefined, decodedText);
                    }
                } catch {
                    // If not JSON, just treat as string token
                    setQrInput(decodedText);
                    handleQrSubmit(undefined, decodedText);
                }
                
                // Optional: Stop after successful scan
                scanner.pause(true);
                setTimeout(() => scanner.resume(), 2000);
            }, (error) => {
                // Ignore scan errors, they happen on every frame
            });
        }, 100);

        return () => {
            clearTimeout(timer);
            if (scanner) {
                scanner.clear().catch(console.error);
            }
        };
    }, [showQrScanner]);

    const { isProfileLoading } = useSupabase();

    if (isProfileLoading) {
        return (
            <div className="max-w-[1400px] mx-auto w-full font-sans bg-white p-4 md:p-6 min-h-screen">
                {/* Header Skeleton */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-6 border-b-2 border-slate-900 pb-4">
                    <div className="space-y-2">
                        <div className="h-4 w-32 bg-slate-200"></div>
                        <div className="h-8 w-64 bg-slate-300"></div>
                        <div className="h-3 w-96 bg-slate-200"></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-12 w-40 bg-emerald-100 border-2 border-emerald-900"></div>
                        <div className="h-12 w-48 bg-blue-200 border-2 border-blue-900"></div>
                    </div>
                </div>

                <div className="border-2 border-slate-900 bg-white">
                    <div className="h-16 border-b-2 border-slate-900 bg-slate-100 flex items-center justify-between px-4">
                        <div className="h-6 w-32 bg-slate-200"></div>
                        <div className="h-8 w-64 bg-slate-200"></div>
                    </div>
                    <div className="divide-y-2 divide-slate-900">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-24 p-4 flex justify-between items-center bg-white">
                                <div className="flex gap-4 items-center">
                                    <div className="w-12 h-12 bg-slate-100 border-2 border-slate-900"></div>
                                    <div className="space-y-2">
                                        <div className="h-5 w-32 bg-slate-200"></div>
                                        <div className="h-4 w-48 bg-slate-100"></div>
                                    </div>
                                </div>
                                <div className="h-10 w-24 bg-slate-200 border-2 border-slate-900"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const filtered = bookings.filter((b) => {
        const matchesSearch = b.token_number.toLowerCase().includes(search.toLowerCase()) ||
            b.farmer_name.toLowerCase().includes(search.toLowerCase()) ||
            b.crop_name.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleCallNext = () => {
        const waiting = bookings.find(b => b.status === 'BOOKED' || b.status === 'CHECKED_IN');
        if (waiting) {
            playMandiChime();
            speakAnnouncement(`Attention please. Token number ${waiting.token_number}, vehicle ${waiting.vehicle_number || 'tractor'}, please proceed to inspection bay.`, 'en');
            store.advanceBooking(waiting.id);
            toast.success(`Calling Token ${waiting.token_number} (${waiting.farmer_name})`);
            SmsGateway.sendSmsNotification(
                waiting.farmer_phone || '+91 9999999999', 
                `[Simulated SMS] Kishan Seva: Your Token ${waiting.token_number} has been called. Please proceed to the inspection bay with your vehicle.`
            );
        } else {
            toast.info('No waiting tokens in queue to call');
        }
    };

    const handleCallSpecificToken = (item: any) => {
        playMandiChime();
        speakAnnouncement(`Calling token number ${item.token_number}. Farmer ${item.farmer_name}, please proceed to weighbridge platform.`, 'en');
        store.advanceBooking(item.id);
        toast.success(`Calling Token ${item.token_number}`);
        SmsGateway.sendSmsNotification(
            item.farmer_phone || '+91 9999999999', 
            `[Simulated SMS] Kishan Seva: Your Token ${item.token_number} has been called. Please proceed to the weighbridge platform immediately.`
        );
    };

    const handleQrSubmit = (e?: React.FormEvent, overrideToken?: string) => {
        if (e) e.preventDefault();
        const tokenQuery = (overrideToken || qrInput).trim().toUpperCase();
        const found = bookings.find(b => b.token_number.toUpperCase() === tokenQuery);
        if (found) {
            playMandiChime();
            speakAnnouncement(`Token ${found.token_number} verified. Welcome ${found.farmer_name}. Gate access granted.`, 'en');
            store.advanceBooking(found.id);
            setScanMessage(`Verified: ${found.token_number} - ${found.farmer_name}`);
            toast.success(`Token ${found.token_number} checked in successfully!`);
            setTimeout(() => {
                setScanMessage(null);
                setShowQrScanner(false);
                setQrInput('');
            }, 1400);
        } else {
            setScanMessage('Invalid Token Number. Please verify QR.');
            toast.error('Invalid Token Number');
            setTimeout(() => setScanMessage(null), 2000);
        }
    };

    const handleSimulateCameraScan = () => {
        const target = bookings.find(b => b.status === 'BOOKED') || bookings[0];
        if (target) {
            setQrInput(target.token_number);
            playMandiChime();
            speakAnnouncement(`Token ${target.token_number} verified. Gate access approved.`, 'en');
            store.advanceBooking(target.id);
            setScanMessage(`Scan Successful: ${target.token_number} (${target.farmer_name})`);
            toast.success(`Camera scanned token: ${target.token_number}`);
            setTimeout(() => {
                setScanMessage(null);
                setShowQrScanner(false);
                setQrInput('');
            }, 1400);
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto w-full font-sans p-4 md:p-6 text-slate-900 bg-white min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-8 border-b-2 border-slate-900 pb-4">
                <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest bg-slate-900 text-white px-2 py-0.5 mb-2 inline-block">{t('yard_management')}</span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight uppercase">{t('live_mandi_queue')}</h2>
                    <p className="text-xs text-slate-600 mt-1 font-mono">{t('call_vehicles_desc')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowQrScanner(true)}
                        className="bg-emerald-50 text-emerald-900 border-2 border-emerald-900 hover:bg-emerald-100 font-bold h-12 px-4 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-colors"
                    >
                        <QrCode className="w-4 h-4" />
                        {t('scan_gate_qr')}
                    </button>

                    <button
                        onClick={handleCallNext}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-900 font-bold h-12 px-5 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-colors"
                    >
                        <BellRing className="w-4 h-4" />
                        {t('call_next_farmer')} 🔊
                    </button>
                </div>
            </div>

            <div className="border-2 border-slate-900 bg-white shadow-[8px_8px_0px_rgba(0,0,0,1)]">
                {/* Search & Filter Toolbar */}
                <div className="p-4 border-b-2 border-slate-900 bg-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <span className="font-black text-slate-900 text-sm uppercase tracking-widest">{t('active_queue')}</span>
                        <span className="bg-slate-900 text-white text-[10px] font-bold font-mono px-2 py-1 uppercase tracking-widest">
                            {filtered.length} {t('tokens')}
                        </span>
                    </div>

                    <div className="flex flex-col md:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-72">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-900" />
                            <Input
                                placeholder={t('search_placeholder')}
                                className="pl-9 h-12 bg-white border-2 border-slate-900 rounded-none text-xs w-full font-bold font-mono focus-visible:ring-slate-900 uppercase"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-wrap md:flex-nowrap items-center gap-0 border-2 border-slate-900 text-xs overflow-hidden">
                            {['ALL', 'BOOKED', 'CHECKED_IN', 'QUALITY_TESTING', 'WEIGHMENT', 'COMPLETED'].map((st) => (
                                <button
                                    key={st}
                                    onClick={() => setStatusFilter(st)}
                                    className={`px-3 py-2 text-[10px] font-bold font-mono uppercase tracking-widest transition-colors border-r-2 border-slate-900 last:border-r-0 shrink-0 ${statusFilter === st ? 'bg-slate-900 text-white' : 'text-slate-900 hover:bg-slate-200 bg-white'
                                        }`}
                                >
                                    {st === 'ALL' ? t('all') : st.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Token Table List */}
                <div className="divide-y-2 divide-slate-900 bg-white">
                    {filtered.length === 0 ? (
                        <div className="p-16 text-center text-slate-900 bg-white">
                            <p className="text-xs font-bold uppercase tracking-widest font-mono">{t('no_tokens_match')}</p>
                        </div>
                    ) : (
                        <AnimatePresence initial={false}>
                            {filtered.map((item, index) => (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                                    transition={{ 
                                        type: "spring", 
                                        stiffness: 400, 
                                        damping: 30,
                                        mass: 0.8
                                    }}
                                    className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:bg-slate-50 ${
                                        item.status === 'QUALITY_TESTING' ? 'bg-amber-50/50' : 
                                        item.status === 'WEIGHMENT' ? 'bg-blue-50/50' : ''
                                    }`}
                                >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 flex flex-col items-center justify-center font-bold text-xs border-2 ${item.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-900 border-emerald-900' :
                                            item.status === 'WEIGHMENT' ? 'bg-blue-100 text-blue-900 border-blue-900' :
                                                item.status === 'QUALITY_TESTING' ? 'bg-amber-100 text-amber-900 border-amber-900' :
                                                    'bg-slate-100 text-slate-900 border-slate-900'
                                        }`}>
                                        <span className="text-[10px] uppercase font-mono font-black">#{index + 1}</span>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-black text-slate-900 font-mono text-base tracking-widest uppercase">{item.token_number}</span>
                                            <span className={`text-[9px] px-2 py-0.5 font-bold border-2 font-mono uppercase tracking-widest ${item.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-900 border-emerald-900' :
                                                    item.status === 'WEIGHMENT' ? 'bg-blue-100 text-blue-900 border-blue-900' :
                                                        item.status === 'QUALITY_TESTING' ? 'bg-amber-100 text-amber-900 border-amber-900' :
                                                            'bg-slate-100 text-slate-900 border-slate-900'
                                                }`}>
                                                {item.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-600 font-bold uppercase tracking-widest font-mono">
                                            <span className="text-slate-900 flex items-center gap-1">
                                                <User className="w-3 h-3" /> {item.farmer_name}
                                            </span>
                                            <span className="opacity-30">|</span>
                                            <span className="text-slate-900">{item.crop_name} ({item.expected_quantity_q} Q)</span>
                                            <span className="opacity-30">|</span>
                                            <span className="text-slate-900">{item.vehicle_number}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions per token */}
                                <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
                                    <button
                                        onClick={() => store.advanceBooking(item.id)}
                                        className="h-10 px-4 flex items-center justify-center gap-2 text-[10px] font-bold font-mono uppercase tracking-widest border-2 border-slate-900 text-slate-900 bg-white hover:bg-slate-900 hover:text-white transition-colors"
                                        title="Advance to next workflow stage"
                                    >
                                        <Play className="w-3 h-3 fill-current" /> ADVANCE
                                    </button>

                                    {item.status === 'QUALITY_TESTING' ? (
                                        <button
                                            onClick={() => navigate('/operator/quality')}
                                            className="h-10 px-4 flex items-center justify-center gap-2 text-[10px] font-bold font-mono uppercase tracking-widest border-2 border-amber-900 text-amber-900 bg-amber-50 hover:bg-amber-900 hover:text-white transition-colors"
                                        >
                                            ENTER LAB DATA <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    ) : item.status === 'WEIGHMENT' ? (
                                        <button
                                            onClick={() => navigate('/operator/weighment')}
                                            className="h-10 px-4 flex items-center justify-center gap-2 text-[10px] font-bold font-mono uppercase tracking-widest border-2 border-blue-900 text-blue-900 bg-blue-50 hover:bg-blue-900 hover:text-white transition-colors"
                                        >
                                            WEIGHBRIDGE <Scale className="w-3 h-3" />
                                        </button>
                                    ) : item.status === 'COMPLETED' ? (
                                        <span className="text-[10px] text-emerald-700 font-bold font-mono uppercase tracking-widest flex items-center gap-1 border-2 border-emerald-700 bg-emerald-50 h-10 px-4">
                                            <CheckCircle2 className="w-3 h-3" /> E-J-FORM DONE
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => handleCallSpecificToken(item)}
                                            className="h-10 px-4 flex items-center justify-center gap-2 text-[10px] font-bold font-mono uppercase tracking-widest border-2 border-slate-900 text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
                                        >
                                            <Volume2 className="w-3 h-3" /> CALL TOKEN
                                        </button>
                                    )}
                                </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* Camera QR Code Scanner & Verification Modal */}
            {showQrScanner && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
                        <button
                            onClick={() => setShowQrScanner(false)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-4">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                                Mandi Gate Security Check-in
                            </span>
                            <h3 className="text-xl font-black text-slate-900 mt-2">
                                Scan Digital Gate Pass QR
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Align farmer's mobile screen or printed pass with the camera viewfinder.
                            </p>
                        </div>

                        {/* Actual Camera Viewfinder via Html5QrcodeScanner */}
                        <div className="relative w-full aspect-square max-w-[300px] mx-auto rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-inner flex flex-col items-center justify-center mb-4 bg-slate-100">
                            <div id="qr-reader" className="w-full h-full [&>div]:!border-0 [&_video]:object-cover [&_video]:w-full [&_video]:h-full"></div>
                            
                            {scanMessage && (
                                <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center p-3 text-center animate-in fade-in z-50">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
                                    <p className="text-xs font-bold text-white">{scanMessage}</p>
                                </div>
                            )}
                        </div>

                        {/* Quick Simulate Scan Button */}
                        <Button
                            onClick={handleSimulateCameraScan}
                            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold h-10 mb-3 gap-2 shadow-sm"
                        >
                            <Sparkles className="w-4 h-4 text-amber-300" />
                            Simulate Camera Scan (Incoming Vehicle)
                        </Button>

                        {/* Manual Token Code Entry Fallback */}
                        <form onSubmit={handleQrSubmit} className="pt-2 border-t border-slate-100 flex gap-2">
                            <Input
                                placeholder="Or type token (e.g. KS-2026-001)"
                                value={qrInput}
                                onChange={(e) => setQrInput(e.target.value)}
                                className="text-xs h-10 rounded-xl"
                            />
                            <Button
                                type="submit"
                                variant="outline"
                                className="text-xs h-10 rounded-xl font-bold px-4 border-slate-300"
                            >
                                Verify
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
