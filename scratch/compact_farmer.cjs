const fs = require('fs');

const path = 'src/pages/auth/FarmerLogin.tsx';
let content = fs.readFileSync(path, 'utf8');

// Container
content = content.replace(
  '<div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">',
  '<div className="min-h-screen lg:h-screen lg:overflow-hidden bg-slate-50 flex flex-col lg:flex-row font-sans">'
);

// Right side
content = content.replace(
  '<div className="w-full lg:w-[55%] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-12 relative bg-gradient-to-b from-slate-50 via-white to-emerald-50/40 min-h-screen">',
  '<div className="w-full lg:w-[55%] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative bg-gradient-to-b from-slate-50 via-white to-emerald-50/40 lg:h-screen lg:overflow-y-auto custom-scrollbar">'
);

// Left side padding and margins
content = content.replace(
  '<div className="hidden lg:flex lg:w-[45%] bg-emerald-800 relative flex-col justify-between p-12',
  '<div className="hidden lg:flex lg:w-[45%] bg-emerald-800 relative flex-col justify-between pt-8 px-10 xl:px-12 pb-12'
);
content = content.replace(
  '<div className="relative z-10 max-w-lg mb-12">',
  '<div className="relative z-10 max-w-lg mb-4">'
);
content = content.replace(
  'font-medium mb-8 drop-shadow-sm">',
  'font-medium mb-0 drop-shadow-sm">'
);
content = content.replace(
  'leading-tight mb-6 drop-shadow-sm">',
  'leading-tight mb-4 drop-shadow-sm">'
);

// Right side form card
content = content.replace(
  '<Card className="w-full max-w-md p-6 sm:p-8 shadow-xl border border-slate-200/80 rounded-3xl bg-white relative">',
  '<Card className="w-full max-w-md p-5 sm:p-8 shadow-xl border border-slate-200/80 rounded-[2rem] bg-white relative my-auto">'
);

// Top controls
content = content.replace(
  '<div className="w-full max-w-md flex items-center justify-between mb-8">',
  '<div className="absolute top-4 right-4 lg:top-6 lg:right-8 flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end px-4 lg:px-0 z-50">'
);
// In the top controls, there's a link:
content = content.replace(
  '<Link \n            to="/" \n            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-emerald-700 font-semibold transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs"\n          >\n            <ChevronLeft className="w-4 h-4" /> {t(\'back_to_home\')}\n          </Link>',
  '<Link to="/" className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 transition-colors px-4 py-2 rounded-full border border-slate-200 shadow-sm"><ChevronLeft className="w-3.5 h-3.5" /> {t(\'back_to_home\')}</Link>'
);

// Card mt-6 pt-6
content = content.replace(
  '<div className="mt-6 pt-6 border-t border-slate-100 text-center space-y-4">',
  '<div className="mt-5 pt-5 border-t border-slate-100 text-center space-y-3">'
);

// Footer text
content = content.replace(
  '<p className="text-[11px] text-slate-500 mt-6 text-center max-w-sm">',
  '<p className="text-[10px] text-slate-500 mt-4 pb-4 text-center max-w-sm">'
);

fs.writeFileSync(path, content);
console.log("Compacted FarmerLogin layout.");
