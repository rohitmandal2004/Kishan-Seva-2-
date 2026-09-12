import React from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage, Language, LANGUAGES } from '@/services/i18n';

interface LanguageSelectorProps {
 variant?: 'compact' | 'pill' | 'buttons' | 'dropdown';
 className?: string;
}

export function LanguageSelector({ variant = 'pill', className = '' }: LanguageSelectorProps) {
 const { lang, setLanguage } = useLanguage();

  if (variant === 'dropdown') {
    return (
      <div className={`relative flex items-center bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-3 py-2 ${className}`}>
        <Globe className="w-4 h-4 text-emerald-200 mr-2" />
        <select 
          value={lang} 
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="bg-transparent text-xs font-semibold text-emerald-50 outline-none cursor-pointer appearance-none w-full"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code} className="bg-emerald-900 text-white">
              {l.nativeName}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-emerald-200">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
        </div>
      </div>
    );
  }

  // Fallback for all other variants (pill, buttons, compact) now rendered as a light-themed dropdown
  return (
    <div className={`relative flex items-center bg-slate-100/90 hover:bg-slate-100 border border-slate-200/80 rounded-full px-3 py-1.5 shadow-xs ${className}`}>
      <Globe className="w-4 h-4 text-slate-500 mr-2" />
      <select 
        value={lang} 
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer appearance-none w-full pr-4"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} className="bg-white text-slate-800">
            {l.nativeName}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
      </div>
    </div>
  );
}
