import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'bn';

interface LanguageContextType {
 language: Language;
 setLanguage: (lang: Language) => void;
 t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
 en: {
 'nav.dashboard': 'Dashboard',
 'nav.bookings': 'My Bookings',
 'nav.centres': 'Procurement Centres',
 'nav.book': 'Book Slot',
 'nav.queue': 'Live Queue',
 'nav.payments': 'Payments',
 'nav.profile': 'My Profile',
 'nav.support': 'Support',
 'header.greeting': 'Welcome back',
 'header.farmer': 'Farmer',
 'header.switchLang': 'বাংলা',
 },
 bn: {
 'nav.dashboard': 'ড্যাশবোর্ড',
 'nav.bookings': 'আমার বুকিং',
 'nav.centres': 'ক্রয় কেন্দ্র',
 'nav.book': 'স্লট বুক করুন',
 'nav.queue': 'লাইভ কিউ',
 'nav.payments': 'পেমেন্ট',
 'nav.profile': 'আমার প্রোফাইল',
 'nav.support': 'সমর্থন',
 'header.greeting': 'স্বাগতম',
 'header.farmer': 'কৃষক',
 'header.switchLang': 'English',
 }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
 // Try to load from localStorage, default to 'en'
 const [language, setLanguageState] = useState<Language>(() => {
 const saved = localStorage.getItem('language');
 return (saved === 'en' || saved === 'bn') ? saved : 'en';
 });

 const setLanguage = (lang: Language) => {
 setLanguageState(lang);
 localStorage.setItem('language', lang);
 };

 const t = (key: string): string => {
 return translations[language][key] || translations['en'][key] || key;
 };

 return (
 <LanguageContext.Provider value={{ language, setLanguage, t }}>
 {children}
 </LanguageContext.Provider>
 );
};

export const useLanguage = () => {
 const context = useContext(LanguageContext);
 if (context === undefined) {
 throw new Error('useLanguage must be used within a LanguageProvider');
 }
 return context;
};
