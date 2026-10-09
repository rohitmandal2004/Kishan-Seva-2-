import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Leaf, Building2, Shield, ArrowRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/services/i18n';
import { LanguageSelector } from '@/components/ui/language-selector';
import { KishanSevaLogo } from '@/components/brand/KishanSevaLogo';
import { gsap, useGSAP } from '@/lib/gsap';
import { useRef } from 'react';

export default function RoleSelection() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.from(".header-anim", {
      y: 20,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: "power3.out"
    });

    gsap.from(".role-card", {
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: "back.out(1.1)",
      delay: 0.2
    });
  }, { scope: container });

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#fafafa] flex flex-col items-center p-4 sm:p-6 lg:p-4 relative overflow-hidden font-sans">
      <div ref={container} className="w-full max-w-7xl flex flex-col relative z-10 flex-1">
        
        {/* Subtle Background Pattern */}
        <div className="fixed inset-0 z-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', backgroundSize: '36px 36px', opacity: 0.5 }}></div>
        
        {/* Top Navigation */}
        <div className="w-full flex items-center justify-between mb-4 sm:mb-6 relative z-10 header-anim">
          <Link 
            to="/" 
            className="group flex items-center gap-3 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:bg-slate-100 transition-colors shadow-sm">
                <ChevronLeft className="w-5 h-5" />
            </div>
            {t('back_to_home')}
          </Link>
          <div className="bg-white rounded-full p-1.5 border border-slate-200 shadow-sm flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-3 pr-1 hidden sm:block">Language</span>
              <LanguageSelector variant="compact" />
          </div>
        </div>

        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-4 lg:mb-6 relative z-10">
          <div className="header-anim mb-3 p-3 bg-white rounded-3xl shadow-sm border border-slate-100 inline-flex items-center justify-center">
             <KishanSevaLogo size="lg" showSubtitle={false} animated={false} />
          </div>
          <h1 className="header-anim text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">
            {t('Select Portal')}
          </h1>
          <p className="header-anim text-base sm:text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
            Welcome to the Smart Agriculture Portal. Please select your dedicated workspace below to access customized tools, metrics, and services.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 w-full relative z-10 max-w-6xl mx-auto flex-1 items-stretch">
          
          {/* Farmer Card */}
          <div className="role-card h-full">
            <Card 
              onMouseEnter={() => import('./auth/FarmerLogin')}
              onClick={() => navigate('/farmer/login')}
              className="group p-5 lg:p-6 bg-white border-2 border-transparent hover:border-emerald-500/20 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.15)] transition-all duration-500 cursor-pointer flex flex-col h-full rounded-[2.5rem] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-50 rounded-bl-full -mr-24 -mt-24 z-0"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-5 mb-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm ring-1 ring-emerald-200/50 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-500">
                    <Leaf className="w-7 h-7" />
                  </div>
                  <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block mb-1">
                        {t('role_farmer_subtitle')}
                      </span>
                      <h3 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight group-hover:text-emerald-700 transition-colors">{t('role_farmer_title')}</h3>
                  </div>
                </div>
                
                <p className="text-sm text-slate-500 leading-relaxed mb-4 font-medium">
                  {t('role_farmer_desc')}
                </p>
              </div>

              <div className="relative z-10 mt-auto pt-6 border-t border-slate-100">
                <ul className="space-y-4 text-xs sm:text-sm text-slate-600 font-medium mb-3">
                  <li className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-emerald-50 p-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600"/></div>
                      <span className="leading-relaxed">{t('f_check_1')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-emerald-50 p-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600"/></div>
                      <span className="leading-relaxed">{t('f_check_2')}</span>
                  </li>
                </ul>
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 text-sm font-black text-emerald-600 uppercase tracking-wider group-hover:gap-3 transition-all duration-300">
                        Enter Portal <ArrowRight className="w-4 h-4" />
                    </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Operator Card */}
          <div className="role-card h-full">
            <Card 
              onMouseEnter={() => import('./auth/OperatorLogin')}
              onClick={() => navigate('/operator/login')}
              className="group p-5 lg:p-6 bg-white border-2 border-transparent hover:border-blue-500/20 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.15)] transition-all duration-500 cursor-pointer flex flex-col h-full rounded-[2.5rem] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50 rounded-bl-full -mr-24 -mt-24 z-0"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-5 mb-3">
                  <div className="p-3.5 rounded-2xl bg-blue-100 text-blue-600 shadow-sm ring-1 ring-blue-200/50 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 block mb-1">
                        {t('role_operator_subtitle')}
                      </span>
                      <h3 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight group-hover:text-blue-700 transition-colors">{t('role_operator_title')}</h3>
                  </div>
                </div>
                
                <p className="text-sm text-slate-500 leading-relaxed mb-4 font-medium">
                  {t('role_operator_desc')}
                </p>
              </div>

              <div className="relative z-10 mt-auto pt-6 border-t border-slate-100">
                <ul className="space-y-4 text-xs sm:text-sm text-slate-600 font-medium mb-3">
                  <li className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-blue-50 p-1"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600"/></div>
                      <span className="leading-relaxed">{t('op_check_1')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-blue-50 p-1"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600"/></div>
                      <span className="leading-relaxed">{t('op_check_2')}</span>
                  </li>
                </ul>
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 text-sm font-black text-blue-600 uppercase tracking-wider group-hover:gap-3 transition-all duration-300">
                        Enter Portal <ArrowRight className="w-4 h-4" />
                    </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Admin Card */}
          <div className="role-card h-full">
            <Card 
              onMouseEnter={() => import('./auth/AdminLogin')}
              onClick={() => navigate('/admin/login')}
              className="group p-5 lg:p-6 bg-white border-2 border-transparent hover:border-slate-800/20 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(15,23,42,0.15)] transition-all duration-500 cursor-pointer flex flex-col h-full rounded-[2.5rem] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-slate-100 rounded-bl-full -mr-24 -mt-24 z-0"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-5 mb-3">
                  <div className="p-3.5 rounded-2xl bg-slate-100 text-slate-700 shadow-sm ring-1 ring-slate-200/50 group-hover:bg-slate-900 group-hover:text-white transition-colors duration-500">
                    <Shield className="w-7 h-7" />
                  </div>
                  <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                        {t('role_admin_subtitle')}
                      </span>
                      <h3 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight group-hover:text-slate-700 transition-colors">{t('role_admin_title')}</h3>
                  </div>
                </div>
                
                <p className="text-sm text-slate-500 leading-relaxed mb-4 font-medium">
                  {t('role_admin_desc')}
                </p>
              </div>

              <div className="relative z-10 mt-auto pt-6 border-t border-slate-100">
                <ul className="space-y-4 text-xs sm:text-sm text-slate-600 font-medium mb-3">
                  <li className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-slate-100 p-1"><CheckCircle2 className="w-3.5 h-3.5 text-slate-700"/></div>
                      <span className="leading-relaxed">{t('adm_check_1')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-slate-100 p-1"><CheckCircle2 className="w-3.5 h-3.5 text-slate-700"/></div>
                      <span className="leading-relaxed">{t('adm_check_2')}</span>
                  </li>
                </ul>
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-wider group-hover:gap-3 transition-all duration-300">
                        Enter Portal <ArrowRight className="w-4 h-4" />
                    </div>
                </div>
              </div>
            </Card>
          </div>
          
        </div>
        
        {/* Footer help */}
        <div className="header-anim mt-8 sm:mt-auto pt-4 pb-2 lg:pb-0 text-center text-sm text-slate-400 font-medium relative z-10 flex items-center justify-center gap-2 w-full">
          <div className="bg-white/80 backdrop-blur-sm px-5 py-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
            {t('need_help')} <strong className="text-slate-800 font-bold tracking-wide">1800-180-1551</strong>
          </div>
        </div>

      </div>
    </div>
  );
}
