import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import AnimatedOutlet from '@/components/ui/AnimatedOutlet';
import {
    Home, MapPin, CalendarClock, Ticket, Bell, LogOut, PhoneCall,
    User, CreditCard, BookOpen, HelpCircle, ShieldCheck, Sun, Moon, Mic, MicOff, CheckCircle2, Droplets, ArrowDownToLine, Menu, X,
    WifiOff, Users, LineChart, Headset
} from 'lucide-react';
import { useKishanData } from '@/context/DataContext';
import { useSupabase } from '@/context/SupabaseContext';
import { useLanguage } from '@/services/i18n';
import { LanguageSelector } from '@/components/ui/language-selector';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

export default function FarmerLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, farmer, signOut } = useSupabase();
    const currentPath = location.pathname;
    const store = useKishanData();
    const activeBooking = store.getActiveFarmerBookingForFarmer(farmer?.id, user?.email);
    const { t, lang } = useLanguage();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [isSunlightMode, setIsSunlightMode] = useState(() => localStorage.getItem('kishan_sunlight_mode') === 'true');
    const { isListening, startListening, stopListening, isSupported } = useSpeechRecognition();

    useEffect(() => {
        if (isSunlightMode) {
            document.documentElement.classList.add('sunlight-mode');
            localStorage.setItem('kishan_sunlight_mode', 'true');
        } else {
            document.documentElement.classList.remove('sunlight-mode');
            localStorage.setItem('kishan_sunlight_mode', 'false');
        }
    }, [isSunlightMode]);

    useEffect(() => {
        try {
            localStorage.removeItem('kishan_offline_pass');
        } catch { }
        const goOffline = () => setIsOffline(true);
        const goOnline = () => setIsOffline(false);
        window.addEventListener('offline', goOffline);
        window.addEventListener('online', goOnline);
        return () => {
            window.removeEventListener('offline', goOffline);
            window.removeEventListener('online', goOnline);
        };
    }, []);

    const notifications = store.getNotificationsForFarmer(farmer?.id, user?.email);
    const unreadCount = notifications.filter(n => !n.read).length;

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 23 || hour < 5) return 'Good night, ';
        if (hour >= 5 && hour < 12) return 'Good morning, ';
        if (hour >= 12 && hour < 17) return 'Good afternoon, ';
        return 'Good evening, ';
    };

    const handleLogout = async () => {
        try {
            localStorage.removeItem('kishan_offline_pass');
            if (farmer?.id) {
                localStorage.removeItem(`kishan_offline_pass_${farmer.id}`);
            }
            await signOut();
        } catch (err) {
            console.error('[Kishan Seva] Error signing out:', err);
        }
        navigate('/farmer/login', { replace: true });
    };

    const navItems = [
        { icon: Home, label: 'Dashboard', path: '/farmer/dashboard' },
        { icon: CalendarClock, label: 'Book Slot', path: '/farmer/book' },
        { icon: Users, label: 'FPO Bulk Booking', path: '/farmer/bulk-book' },
        { icon: Ticket, label: 'Live Queue', path: '/farmer/queue', badge: activeBooking ? 'Active' : undefined },
        { icon: LineChart, label: 'Market Insights', path: '/farmer/market' },
        { icon: MapPin, label: 'Procurement Centres', path: '/farmer/centres' },
        { icon: BookOpen, label: 'My Bookings', path: '/farmer/bookings' },
        { icon: CreditCard, label: 'Payments', path: '/farmer/payments' },
        { icon: Bell, label: 'Notifications', path: '/farmer/notifications', count: unreadCount > 0 ? unreadCount : undefined },
        { icon: Headset, label: 'Helpdesk', path: '/farmer/helpdesk' },
        { icon: HelpCircle, label: 'Help & Support', path: '/farmer/support' },
    ];

    return (
        <div className={`bg-slate-50 min-h-screen md:h-screen md:overflow-hidden pb-24 md:pb-0 flex flex-col relative ${lang === 'en' ? 'font-poppins' : 'font-sans'}`}>
            {/* Mobile Top Bar */}
            <div className="md:hidden bg-white/95 backdrop-blur-md px-3.5 py-2.5 flex justify-between items-center sticky top-0 z-40 border-b border-slate-200 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="p-1.5 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="p-1 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-xs shrink-0">
                        <img src="/logo.svg" alt="Kishan Seva" className="h-9 w-9 object-contain" />
                    </div>
                    <div className="min-w-0">
                        <span className="font-extrabold text-[#143d23] text-sm leading-none block truncate">Kishan <span className="text-emerald-600">Seva</span></span>
                        <p className="text-[10px] text-slate-500 font-semibold truncate mt-0.5">{farmer?.full_name || t('role_farmer_title')}</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={() => setIsSunlightMode(!isSunlightMode)}
                        className={`p-2 rounded-full transition-colors ${isSunlightMode ? 'bg-amber-100 text-amber-600' : 'hover:bg-slate-100 text-slate-500'}`}
                        title="Toggle Sunlight Mode"
                    >
                        {isSunlightMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    {isSupported && (
                        <button
                            onClick={isListening ? stopListening : startListening}
                            className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-slate-100 text-slate-500'}`}
                            title="Voice Commands"
                        >
                            {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                        </button>
                    )}
                    <Link to="/farmer/queue" className="relative p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors" title="Live Queue">
                        <Bell className="w-5 h-5" />
                        {activeBooking && (
                            <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                            </span>
                        )}
                    </Link>
                    <button
                        onClick={handleLogout}
                        type="button"
                        className="p-2 rounded-full hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
                        title="Sign Out"
                        aria-label="Sign Out">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row w-full md:overflow-hidden min-h-0">
                {/* Desktop & Tablet Sidebar */}
                <aside className="hidden md:flex w-64 shrink-0 flex-col bg-[#0b291a] text-white h-full shadow-2xl relative z-50">
                    <div className="px-6 py-8 flex items-center gap-3">
                        <img src="/logo.svg" alt="Kishan Seva" className="h-11 w-11 object-contain drop-shadow-md" />
                        <div>
                            <span className="font-serif font-bold text-white text-xl tracking-tight block leading-none">Kishan Seva</span>
                            <p className="text-[#34d399] text-xs font-bold tracking-wide mt-1">Farmer Portal</p>
                            <p className="text-slate-300 text-[9px] leading-tight mt-1 opacity-80">Empowering Farmers<br />A Better Tomorrow</p>
                        </div>
                    </div>

                    <div className="flex-1 px-4 space-y-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = currentPath === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`group relative flex items-center gap-3.5 px-4 py-3 rounded-[14px] text-sm font-semibold transition-all duration-200 overflow-hidden ${isActive
                                        ? 'bg-[#0f462e] text-white shadow-sm'
                                        : 'text-[#8ba797] hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-[60%] bg-[#34d399] rounded-r-full shadow-[0_0_10px_rgba(52,211,153,0.3)]"></div>
                                    )}
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#34d399]' : ''}`} />
                                    <span className="flex-1 tracking-wide">{item.label}</span>
                                    {item.badge && (
                                        <span className="px-2.5 py-0.5 bg-[#f59e0b] text-[#451a03] text-[10px] font-black rounded-full uppercase tracking-wider shadow-sm">
                                            {item.badge}
                                        </span>
                                    )}
                                    {item.count && (
                                        <span className="w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                                            {item.count}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    <div className="p-4 mt-2">
                        {/* Promo Banner */}
                        <div className="rounded-xl overflow-hidden relative border border-[#143e2a] shadow-[0_4px_12px_rgba(0,0,0,0.1)] h-28 group">
                            <img src="/sidebar-promo.jpg" alt="Promo" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-70 transition-opacity mix-blend-overlay" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0b291a] via-[#0b291a]/40 to-transparent"></div>
                            <div className="absolute bottom-3 left-3 flex items-center gap-2.5 z-10">
                                <img src="/logo.svg" className="w-6 h-6 opacity-90 drop-shadow-md" />
                                <span className="text-[11px] font-black text-emerald-50 leading-tight drop-shadow-md">भारत का किसान<br />देश की शान</span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 min-w-0 overflow-y-auto flex flex-col relative bg-[#F5F8F6] h-full">
                    {/* Offline Banner */}
                    {isOffline && (
                        <div className="bg-orange-50 border-b border-orange-200 px-6 py-3 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-orange-100 rounded-full">
                                    <WifiOff className="w-4 h-4 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-orange-800">{t('offline_mode') || 'You are currently offline'}</p>
                                    <p className="text-xs text-orange-600">{t('offline_desc') || 'Showing cached data. You can still access your QR pass.'}</p>
                                </div>
                            </div>
                            {activeBooking && (
                                <Link to="/farmer/bookings" className="text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-full shadow-sm transition-colors">
                                    View Pass
                                </Link>
                            )}
                        </div>
                    )}
                    
                    {/* Desktop Top Bar */}
                    <div className="hidden md:flex bg-white/95 backdrop-blur-xl px-8 py-5 border-b border-slate-100 sticky top-0 z-40 items-center justify-between shrink-0 transition-all">
                        {/* Left side */}
                        <div className="flex flex-col justify-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{getGreeting()}</p>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-black text-slate-900 leading-none tracking-tight flex items-center gap-2">
                                    Namaste, <span className="text-emerald-700">{farmer?.full_name?.split(' ')[0]}</span>
                                    <span className="text-2xl leading-none inline-block">{"\u{1F64F}\u{FE0E}"}</span>
                                </h1>
                                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 uppercase tracking-wide">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Farmer
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-[11px] font-medium text-slate-500">
                                <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono">
                                    {farmer?.farmer_code || 'N/A'}
                                </span> 
                                <span className="text-slate-300">•</span> 
                                <span className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> 
                                    {farmer?.village || 'Not set'}, {farmer?.district || 'India'}
                                </span>
                            </div>
                        </div>

                        {/* Weather Widget (Static & Premium) */}
                        <div className="flex items-center gap-5 bg-white border border-slate-100 px-5 py-3 rounded-2xl shadow-sm">
                            <div className="flex items-center gap-4 pr-5 border-r border-slate-100">
                                <div className="flex items-center justify-center w-10 h-10 bg-amber-50 rounded-full border border-amber-100/50">
                                    <Sun className="w-6 h-6 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-xl font-black text-slate-900 leading-none tracking-tighter">28°C</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Clear Sky</p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5 text-[10px] font-semibold text-slate-600">
                                <span className="flex items-center gap-2"><Droplets className="w-3.5 h-3.5 text-blue-400" /> Humidity 42%</span>
                                <span className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Good for Harvesting</span>
                                <span className="flex items-center gap-2"><ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" /> Grade A (14% Moisture)</span>
                            </div>
                        </div>

                        {/* Right side (Profile & Notifications) */}
                        <div className="flex items-center gap-4 ml-2">
                            <div className="flex items-center gap-1 bg-white border border-slate-100 p-1 rounded-full shadow-sm">
                                <button
                                    onClick={() => setIsSunlightMode(!isSunlightMode)}
                                    className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${isSunlightMode ? 'bg-amber-50 text-amber-600' : 'hover:bg-slate-50 text-slate-500'}`}
                                    title="Toggle Sunlight Mode"
                                >
                                    {isSunlightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                </button>
                                {isSupported && (
                                    <button
                                        onClick={isListening ? stopListening : startListening}
                                        className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${isListening ? 'bg-red-50 text-red-600' : 'hover:bg-slate-50 text-slate-500'}`}
                                        title="Voice Commands"
                                    >
                                        {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>

                            <div className="w-px h-8 bg-slate-200"></div>
                            
                            <LanguageSelector variant="pill" className="h-11 px-3 !bg-white hover:!bg-slate-50" />

                            <div className="w-px h-8 bg-slate-200"></div>

                            {/* Notifications */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="w-11 h-11 flex items-center justify-center rounded-full bg-white border border-slate-100 shadow-sm hover:shadow-md text-emerald-600 transition-all"
                                >
                                    <Bell className="w-5 h-5" />
                                </button>
                                {unreadCount > 0 && (
                                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                                )}

                                {/* Notification Dropdown */}
                                {showNotifications && (
                                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                                        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                            <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                                            <button
                                                onClick={() => {
                                                    store.markAllNotificationsRead(farmer?.id, user?.email);
                                                    setShowNotifications(false);
                                                }}
                                                className="text-xs text-emerald-600 font-semibold hover:underline cursor-pointer"
                                            >
                                                Mark all read
                                            </button>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="p-6 text-center text-slate-500">
                                                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                    <p className="text-sm font-medium">No new notifications</p>
                                                </div>
                                            ) : (
                                                notifications.map(n => (
                                                    <div
                                                        key={n.id}
                                                        onClick={() => store.markNotificationAsRead(n.id)}
                                                        className={`p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${!n.read ? 'bg-emerald-50/30' : ''}`}
                                                    >
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="font-bold text-sm text-slate-900">{n.title}</span>
                                                            <span className="text-[10px] text-slate-500 font-medium">Recently</span>
                                                        </div>
                                                        <p className="text-xs text-slate-600 leading-tight">{n.message}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <Link to="/farmer/notifications" onClick={() => setShowNotifications(false)} className="block p-2 text-center text-xs font-bold text-emerald-700 bg-slate-50 hover:bg-slate-100 transition-colors">
                                            View all notifications
                                        </Link>
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <div
                                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                                    className="flex items-center gap-2 cursor-pointer bg-white hover:bg-slate-50 py-1.5 px-1.5 rounded-full border border-slate-100 shadow-sm transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-[#0A2E1A] text-white font-bold flex items-center justify-center text-xs">
                                        {farmer?.full_name ? farmer.full_name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'KS'}
                                    </div>
                                    <svg className="w-3.5 h-3.5 text-slate-400 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>

                                {/* Profile Dropdown */}
                                {showProfileMenu && (
                                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50">
                                        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50 rounded-t-xl">
                                            <div className="w-10 h-10 rounded-full bg-[#0A2E1A] text-white font-bold flex items-center justify-center text-sm shadow-sm">
                                                {farmer?.full_name ? farmer.full_name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'KS'}
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-bold text-slate-900 truncate">{farmer?.full_name || 'Farmer'}</p>
                                                <p className="text-xs text-slate-500 truncate">{farmer?.farmer_code || user?.email || 'N/A'}</p>
                                            </div>
                                        </div>

                                        <div className="p-2 space-y-1">
                                            <Link to="/farmer/profile" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition-colors">
                                                <User className="w-4 h-4" />
                                                My Profile
                                            </Link>

                                            <div className="px-3 py-2">
                                                <span className="text-xs text-slate-500 font-semibold mb-1.5 block">Language / भाषा</span>
                                                <LanguageSelector variant="dropdown" className="w-full text-slate-700 bg-slate-50 border-slate-200" />
                                            </div>

                                            <div className="h-px bg-slate-100 my-1"></div>

                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Offline Banner */}
                    {isOffline && (
                        <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm font-medium animate-in slide-in-from-top duration-300">
                            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>You are offline. Some features may not be available. Your gate pass is still accessible.</span>
                        </div>
                    )}

                    <AnimatedOutlet />
                </main>
            </div>

            {/* Floating 1-Tap Toll-Free Kisan Call Centre Helpline */}
            <div className="fixed bottom-20 md:bottom-6 right-3 sm:right-6 z-40">
                <a
                    href="tel:18001801551"
                    className="flex items-center gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-full bg-[#143d23] hover:bg-[#0f2e1b] text-white shadow-xl border border-emerald-400/40 text-[11px] sm:text-xs font-bold transition group backdrop-blur-md"
                    title="Toll-Free Kisan Call Centre Helpline (1800-180-1551)"
                >
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/30 flex items-center justify-center text-emerald-300">
                        <PhoneCall className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </div>
                    <span className="hidden sm:inline">Kisan Helpline:</span>
                    <span className="font-mono text-amber-300 font-black">1800-180-1551</span>
                    <span className="text-[9px] bg-emerald-700/60 px-1.5 py-0.5 rounded text-emerald-200 font-semibold">TOLL-FREE</span>
                </a>
            </div>

            {/* Mobile Drawer Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
                    <div className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-left">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <div className="flex items-center gap-2">
                                <img src="/logo.svg" alt="Kishan Seva" className="h-8 w-8 object-contain" />
                                <span className="font-extrabold text-[#143d23] text-sm">Kishan Seva</span>
                            </div>
                            <button onClick={() => setMobileMenuOpen(false)} className="p-2 -mr-2 text-slate-500 hover:bg-slate-100 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 bg-emerald-50/50 border-b border-emerald-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center text-sm">
                                {farmer?.full_name ? farmer.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2) : 'KS'}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{farmer?.full_name || 'Farmer'}</p>
                                <p className="text-[10px] text-slate-500 font-mono truncate">{farmer?.farmer_code || '—'}</p>
                            </div>
                        </div>
                        <div className="flex-1 py-2 overflow-y-auto">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = currentPath === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 px-5 py-3 text-sm font-semibold transition-colors ${isActive
                                            ? 'text-emerald-700 bg-emerald-50/80 border-r-4 border-emerald-600'
                                            : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
                                        <span className="flex-1">{item.label}</span>
                                        {item.badge && (
                                            <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-extrabold rounded-full">
                                                {item.badge}
                                            </span>
                                        )}
                                        {item.count && (
                                            <span className="w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                                                {item.count}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                        <div className="p-4 border-t border-slate-100">
                            <LanguageSelector variant="dropdown" className="w-full mb-4" />
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-bold transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Bottom Navigation with Enhanced Touch Targets & Active Indicator */}
            <div className="md:hidden fixed bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md border border-slate-200 rounded-full grid grid-cols-4 items-center px-1 py-1 pb-[max(0.2rem,env(safe-area-inset-bottom))] z-40 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                {navItems.slice(0, 4).map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPath === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition relative select-none ${isActive
                                ? 'text-emerald-800 bg-emerald-50/80 font-bold'
                                : 'text-slate-500 hover:text-slate-800 font-medium'
                                }`}
                        >
                            <div className="relative">
                                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-emerald-700' : ''}`} />
                                {item.badge && (
                                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[72px] text-center">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
