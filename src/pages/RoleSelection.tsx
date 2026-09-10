import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Leaf, Building2, Shield, ArrowRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/services/i18n';
import { LanguageSelector } from '@/components/ui/language-selector';
import AnimatedPage from '@/components/ui/AnimatedPage';
import { motion } from 'framer-motion';

export default function RoleSelection() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <AnimatedPage className="min-h-screen bg-[#f5f5f7] flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans">
      {/* Dynamic Background Mesh */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-emerald-200/40 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-200/30 blur-[140px]" />
        <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-amber-100/40 blur-[120px]" />
      </div>

      {/* Top Bar */}
      <div className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8 relative z-10">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-500 hover:text-slate-900 font-semibold transition-colors bg-white/70 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/40 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
        >
          <ChevronLeft className="w-4 h-4" /> {t('back_to_home')}
        </Link>
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <LanguageSelector variant="compact" />
        </div>
      </div>

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="mb-10 sm:mb-12 text-center max-w-2xl px-2 relative z-10"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md text-emerald-900 text-[10px] sm:text-xs font-bold mb-5 border border-white/50 shadow-sm tracking-wide uppercase">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 
          {t('sso_gateway')}
        </div>
        
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
          {t('roles_title')}
        </h2>
        <p className="text-slate-500 text-sm sm:text-base mt-4 max-w-lg mx-auto font-medium leading-relaxed">
          {t('roles_subtitle')}
        </p>
      </motion.div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full relative z-10">
        
        {/* Farmer Card */}
        <div>
          <Card 
            onClick={() => navigate('/farmer/login')}
            className="p-6 sm:p-8 border border-white/60 bg-white/60 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-shadow duration-500 cursor-pointer flex flex-col justify-between h-full rounded-[2rem] relative overflow-hidden group"
          >
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/20">
                  <Leaf className="w-6 h-6" />
                </div>
                <div className="w-10 h-10 rounded-full bg-white border border-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-colors duration-300">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2 block">
                {t('role_farmer_subtitle')}
              </span>
              <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">{t('role_farmer_title')}</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
                {t('role_farmer_desc')}
              </p>
            </div>

            <div>
              <ul className="space-y-3 pt-5 border-t border-slate-200/50 text-xs text-slate-600 font-medium">
                <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"/> 
                    <span className="leading-tight">{t('f_check_1')}</span>
                </li>
                <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"/> 
                    <span className="leading-tight">{t('f_check_2')}</span>
                </li>
              </ul>
            </div>
          </Card>
        </div>

        {/* Operator Card */}
        <div>
          <Card 
            onClick={() => navigate('/operator/login')}
            className="p-6 sm:p-8 border border-white/60 bg-white/60 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-shadow duration-500 cursor-pointer flex flex-col justify-between h-full rounded-[2rem] relative overflow-hidden group"
          >
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="w-10 h-10 rounded-full bg-white border border-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-colors duration-300">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2 block">
                {t('role_operator_subtitle')}
              </span>
              <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">{t('role_operator_title')}</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
                {t('role_operator_desc')}
              </p>
            </div>

            <div>
              <ul className="space-y-3 pt-5 border-t border-slate-200/50 text-xs text-slate-600 font-medium">
                <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5"/> 
                    <span className="leading-tight">{t('op_check_1')}</span>
                </li>
                <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5"/> 
                    <span className="leading-tight">{t('op_check_2')}</span>
                </li>
              </ul>
            </div>
          </Card>
        </div>

        {/* Admin Card */}
        <div>
          <Card 
            onClick={() => navigate('/admin/login')}
            className="p-6 sm:p-8 border border-white/60 bg-white/60 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-shadow duration-500 cursor-pointer flex flex-col justify-between h-full rounded-[2rem] relative overflow-hidden group"
          >
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg shadow-slate-900/20">
                  <Shield className="w-6 h-6" />
                </div>
                <div className="w-10 h-10 rounded-full bg-white border border-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-colors duration-300">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">
                {t('role_admin_subtitle')}
              </span>
              <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">{t('role_admin_title')}</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
                {t('role_admin_desc')}
              </p>
            </div>

            <div>
              <ul className="space-y-3 pt-5 border-t border-slate-200/50 text-xs text-slate-600 font-medium">
                <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-slate-700 shrink-0 mt-0.5"/> 
                    <span className="leading-tight">{t('adm_check_1')}</span>
                </li>
                <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-slate-700 shrink-0 mt-0.5"/> 
                    <span className="leading-tight">{t('adm_check_2')}</span>
                </li>
              </ul>
            </div>
          </Card>
        </div>
        
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="mt-12 text-center text-xs text-slate-400 font-medium relative z-10"
      >
        {t('need_help')} <strong className="text-slate-700 font-bold tracking-wide">1800-180-1551</strong>
      </motion.div>
    </AnimatedPage>
  );
}
