import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLanguage, Language, LANGUAGES } from '@/services/i18n';
import { AnimatePresence, motion } from 'framer-motion';

interface LanguageSelectorProps {
 variant?: 'compact' | 'pill' | 'buttons' | 'dropdown';
 className?: string;
}

export function LanguageSelector({ variant = 'pill', className = '' }: LanguageSelectorProps) {
  const { lang, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  const isDark = variant === 'dropdown';

  const buttonClasses = isDark 
    ? `relative flex items-center bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-3 py-2 cursor-pointer w-full justify-between transition-colors ${className}`
    : `relative flex items-center bg-slate-100/90 hover:bg-slate-100 border border-slate-200/80 rounded-full px-4 py-2 shadow-xs cursor-pointer justify-between transition-colors ${className}`;

  // Made the text size bigger (text-sm instead of text-xs) as requested
  const textClasses = isDark ? "text-sm font-semibold text-emerald-50" : "text-sm font-bold text-slate-700";
  const iconClasses = isDark ? "text-emerald-200" : "text-slate-500";
  
  const menuClasses = isDark 
    ? "absolute right-0 top-full mt-2 w-48 bg-emerald-900 border border-emerald-800 rounded-xl shadow-xl overflow-hidden z-50"
    : "absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] overflow-hidden z-50";

  const optionHover = isDark ? "hover:bg-emerald-800 text-white" : "hover:bg-slate-50 text-slate-700";

  return (
    <div className="relative" ref={containerRef}>
      <div className={buttonClasses} onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center">
          <Globe className={`w-4 h-4 mr-2 ${iconClasses}`} />
          <span className={textClasses}>{currentLang.nativeName}</span>
        </div>
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${iconClasses}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={menuClasses}
          >
            <div className="py-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {LANGUAGES.map((l) => (
                <div 
                  key={l.code}
                  className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors text-sm font-medium ${optionHover} ${l.code === lang ? (isDark ? 'bg-emerald-800/50' : 'bg-emerald-50/50 text-emerald-700 font-bold') : ''}`}
                  onClick={() => {
                    setLanguage(l.code as Language);
                    setIsOpen(false);
                  }}
                >
                  {l.nativeName}
                  {l.code === lang && <Check className="w-4 h-4" />}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
