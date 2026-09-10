import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PhoneCall, MessageSquare, FileText, ChevronDown, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/services/i18n';

const FAQS = [
  {
    q: 'faq_q1',
    a: 'faq_a1',
  },
  {
    q: 'faq_q2',
    a: 'faq_a2',
  },
  {
    q: 'faq_q3',
    a: 'faq_a3',
  },
  {
    q: 'faq_q4',
    a: 'faq_a4',
  },
  {
    q: 'faq_q5',
    a: 'faq_a5',
  },
  {
    q: 'faq_q6',
    a: 'faq_a6',
  },
  {
    q: 'faq_q7',
    a: 'faq_a7',
  },
  {
    q: 'faq_q8',
    a: 'faq_a8',
  },
];

function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border border-zinc-200 rounded-lg overflow-hidden bg-white transition-shadow ${open ? 'shadow-sm' : ''}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left gap-4 hover:bg-zinc-50 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-3 text-sm font-semibold text-zinc-800">
          <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
          {question}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-0 border-t border-zinc-100 animate-in fade-in slide-in-from-top-1 duration-150">
          <p className="text-sm text-zinc-600 leading-relaxed ml-7">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function FarmerSupport() {
  const { t } = useLanguage();

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="text-center md:text-left mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">{t('help_support')}</h1>
        <p className="text-zinc-500 text-sm mt-1">{t('support_subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 border-zinc-200 bg-white shadow-sm rounded-lg flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center">
            <PhoneCall className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 text-lg">{t('kishan_helpline')}</h3>
            <p className="text-xs text-zinc-500 mt-1 mb-3">{t('helpline_subtitle')}</p>
            <a href="tel:18001801551" className="text-2xl font-semibold text-emerald-700 font-mono tracking-tight hover:underline inline-block">
              1800-180-1551
            </a>
            <p className="text-[10px] text-zinc-400 mt-1 font-medium uppercase tracking-wider">{t('toll_free_24x7')}</p>
          </div>
        </Card>

        <Card className="p-6 border-zinc-200 bg-white shadow-sm rounded-lg flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 text-green-700 rounded-full flex items-center justify-center">
            <MessageSquare className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 text-lg">{t('whatsapp_support')}</h3>
            <p className="text-xs text-zinc-500 mt-1 mb-3">{t('whatsapp_support_subtitle')}</p>
            <Button
              onClick={() => window.open('https://wa.me/9118001801551?text=Hello%20Kishan%20Seva%20Support,%20I%20need%20assistance%20with%20my%20procurement%20booking.', '_blank')}
              className="bg-[#25D366] hover:bg-[#1ebe5b] text-white font-bold rounded-md cursor-pointer"
            >
              {t('start_whatsapp')}
            </Button>
          </div>
        </Card>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-5 h-5 text-zinc-400" />
          <h3 className="font-bold text-zinc-900 text-lg">{t('faq_title')}</h3>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <AccordionItem
              key={i}
              question={t(faq.q)}
              answer={t(faq.a)}
            />
          ))}
        </div>
      </div>

      <Card className="p-5 border-zinc-200 bg-zinc-50 rounded-lg text-center">
        <p className="text-sm text-zinc-600">
          {t('support_footer_text')}{' '}
          <a href="mailto:support@kishanseva.gov.in" className="text-emerald-700 font-semibold hover:underline">
            support@kishanseva.gov.in
          </a>
        </p>
      </Card>
    </div>
  );
}
