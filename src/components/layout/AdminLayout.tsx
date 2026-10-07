import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import AnimatedOutlet from '@/components/ui/AnimatedOutlet';
import { 
 Building2, Truck, LogOut, 
 BarChart3, Menu, X, ShieldCheck, LayoutDashboard, Scale, Users
} from 'lucide-react';
import { useSupabase } from '@/context/SupabaseContext';
import { LanguageSelector } from '@/components/ui/language-selector';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminLayout() {
 const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
 const location = useLocation();
 const navigate = useNavigate();
 const currentPath = location.pathname;
 const { user, clerkUser, signOut } = useSupabase();

 const handleLogout = async () => {
   try {
     await signOut();
   } catch (err) {
     console.error('[Kishan Seva] Error signing out:', err);
   }
   navigate('/roles', { replace: true });
 };

 const navItems = [
   { icon: LayoutDashboard, label: 'Overview', path: '/admin/dashboard' },
   { icon: Building2, label: 'Mandi Management', path: '/admin/centres' },
   { icon: Users, label: 'Operator Requests', path: '/admin/operators' },
   { icon: Truck, label: 'Slot & Capacity', path: '/admin/slots' },
   { icon: BarChart3, label: 'Analytics & Reports', path: '/admin/analytics' },
   { icon: ShieldCheck, label: 'Audit Logs', path: '/admin/transactions' },
   { icon: Scale, label: 'Disputes & Appeals', path: '/admin/disputes' },
 ];

 return (
   <div className="bg-[#f8fafc] min-h-screen md:h-screen md:overflow-hidden pb-20 md:pb-0 flex flex-col font-sans relative">
     {/* Mobile Top Bar */}
     <div className="md:hidden bg-white px-4 py-3 flex justify-between items-center sticky top-0 z-40 border-b border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
       <div className="flex items-center gap-3 min-w-0">
         <button 
           onClick={() => setMobileMenuOpen(true)}
           className="p-1.5 -ml-1.5 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
         >
           <Menu className="w-5 h-5" />
         </button>
         <img src="/logo.svg" alt="Kishan Seva" className="h-8 w-8 object-contain" />
         <div className="min-w-0">
           <span className="font-bold text-slate-900 text-sm leading-none block truncate">Kishan Seva</span>
           <p className="text-[10px] text-emerald-600 font-semibold truncate mt-0.5">Admin Portal</p>
         </div>
       </div>
       
       <div className="flex items-center gap-2 shrink-0">
         <LanguageSelector variant="compact" />
         <button 
           onClick={handleLogout}
           className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
         >
           <LogOut className="w-4 h-4" />
         </button>
       </div>
     </div>

     <div className="flex-1 flex flex-col md:flex-row w-full md:overflow-hidden">
       {/* Desktop & Tablet Sidebar */}
       <aside className="hidden md:flex w-64 lg:w-72 shrink-0 flex-col bg-white h-full relative z-50 border-r border-slate-100/50 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
         <div className="px-6 py-8 flex items-center gap-4">
           <div className="bg-emerald-500/10 p-2 rounded-2xl">
             <img src="/logo.svg" alt="Kishan Seva" className="h-9 w-9 object-contain" />
           </div>
           <div>
             <span className="font-extrabold text-slate-900 text-xl tracking-tight leading-none block">Kishan Seva</span>
             <p className="text-emerald-600 text-xs font-semibold mt-1">State Admin</p>
           </div>
         </div>

         <div className="mx-6 mb-6 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-100">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 text-emerald-700 font-bold flex items-center justify-center text-sm">
               SA
             </div>
             <div className="overflow-hidden flex-1">
               <p className="text-sm font-bold text-slate-900 truncate">{clerkUser?.fullName || 'System Admin'}</p>
               <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{user?.email || 'admin@kishanseva.gov.in'}</p>
             </div>
           </div>
         </div>

         <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
           {navItems.map((item) => {
             const Icon = item.icon;
             const isActive = currentPath === item.path;
             return (
               <Link
                 key={item.path}
                 to={item.path}
                 className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[13px] font-semibold transition-all duration-300 ${
                   isActive 
                     ? 'text-emerald-700 bg-emerald-50 shadow-[inset_0_1px_1px_rgba(255,255,255,1)] ring-1 ring-emerald-500/20' 
                     : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                 }`}
               >
                 <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors duration-300 ${isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-500'}`} />
                 <span className="flex-1 truncate">{item.label}</span>
               </Link>
             );
           })}
         </nav>
       </aside>

       {/* Main Content Area */}
       <main className="flex-1 flex flex-col h-full overflow-hidden bg-transparent relative">
         <header className="hidden md:flex bg-white/60 backdrop-blur-xl border-b border-slate-100 h-16 items-center justify-between px-8 shrink-0 z-10">
           <div className="flex items-center gap-3">
             <h1 className="font-bold text-slate-800 text-base">
               {navItems.find(n => n.path === currentPath)?.label || 'Dashboard'}
             </h1>
           </div>
           
           <div className="flex items-center gap-5">
             <LanguageSelector variant="dropdown" />
             <div className="h-4 w-px bg-slate-200"></div>
             <Button onClick={handleLogout} variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-600 font-semibold text-sm rounded-xl">
               Sign Out
             </Button>
           </div>
         </header>
         
         <div className="flex-1 overflow-auto">
           <AnimatedOutlet />
         </div>
       </main>
     </div>

     {/* Mobile Bottom Navigation - Elegant App-like style */}
     <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center px-2 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
       {navItems.slice(0, 4).map((item) => {
         const Icon = item.icon;
         const isActive = currentPath === item.path;
         return (
           <Link 
             key={item.path} 
             to={item.path}
             className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition duration-300 min-w-[64px] relative ${
               isActive ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
             }`}
           >
             <div className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${isActive ? 'bg-emerald-50 scale-110' : 'bg-transparent'}`}>
               <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-emerald-600 stroke-[2.5px]' : 'stroke-2'}`} />
             </div>
             <span className={`text-[10px] mt-1 tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
           </Link>
         );
       })}
     </div>

     {/* Mobile Drawer Menu */}
     <AnimatePresence>
       {mobileMenuOpen && (
         <div className="md:hidden fixed inset-0 z-50 flex">
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" 
             onClick={() => setMobileMenuOpen(false)} 
           />
           <motion.div 
             initial={{ x: '-100%' }}
             animate={{ x: 0 }}
             exit={{ x: '-100%' }}
             transition={{ type: "spring", bounce: 0, duration: 0.4 }}
             className="relative w-[280px] max-w-[85vw] bg-white h-full shadow-2xl flex flex-col"
           >
             <div className="p-6 pb-4 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <img src="/logo.svg" alt="Kishan Seva" className="h-8 w-8 object-contain" />
                 <span className="font-extrabold text-slate-900 text-lg">Kishan Seva</span>
               </div>
               <button onClick={() => setMobileMenuOpen(false)} className="p-2 -mr-2 text-slate-400 hover:bg-slate-50 rounded-full">
                 <X className="w-5 h-5" />
               </button>
             </div>
             
             <div className="px-6 py-4 mb-2">
               <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                 <div className="w-10 h-10 rounded-full bg-white border border-slate-200 text-emerald-700 font-bold flex items-center justify-center text-sm shadow-sm">
                   SA
                 </div>
                 <div className="min-w-0">
                   <p className="text-sm font-bold text-slate-900 truncate">{clerkUser?.fullName || 'System Admin'}</p>
                   <p className="text-[10px] text-slate-500 truncate">{user?.email || ''}</p>
                 </div>
               </div>
             </div>
             
             <div className="flex-1 px-4 overflow-y-auto space-y-1">
               {navItems.map((item) => {
                 const Icon = item.icon;
                 const isActive = currentPath === item.path;
                 return (
                   <Link 
                     key={item.path} 
                     to={item.path}
                     onClick={() => setMobileMenuOpen(false)}
                     className={`flex items-center gap-3.5 px-4 py-3 text-[13px] font-semibold transition-colors rounded-2xl ${
                       isActive 
                         ? 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-500/10 shadow-sm' 
                         : 'text-slate-600 hover:bg-slate-50'
                     }`}
                   >
                     <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                     <span className="flex-1">{item.label}</span>
                   </Link>
                 );
               })}
             </div>
             
             <div className="p-6 border-t border-slate-100">
               <LanguageSelector variant="dropdown" className="w-full mb-4" />
               <button 
                 onClick={handleLogout}
                 className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
               >
                 <LogOut className="w-4 h-4" />
                 Sign Out
               </button>
             </div>
           </motion.div>
         </div>
       )}
     </AnimatePresence>
   </div>
 );
}
