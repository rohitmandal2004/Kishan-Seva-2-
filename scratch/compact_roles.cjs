const fs = require('fs');

const path = 'src/pages/RoleSelection.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Container
content = content.replace(
  '<div className="min-h-screen bg-[#fafafa] flex flex-col items-center p-4 sm:p-6 md:p-10 relative overflow-hidden font-sans">',
  '<div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#fafafa] flex flex-col items-center p-4 sm:p-6 lg:p-6 xl:p-8 relative overflow-hidden font-sans">'
);

// 2. Top Nav
content = content.replace(
  '<div className="w-full flex items-center justify-between mb-6 sm:mb-8 relative z-10 header-anim">',
  '<div className="w-full flex items-center justify-between mb-4 sm:mb-6 relative z-10 header-anim">'
);

// 3. Header Section
content = content.replace(
  '<div className="flex flex-col items-center text-center mb-10 sm:mb-12 relative z-10">',
  '<div className="flex flex-col items-center text-center mb-6 lg:mb-8 relative z-10">'
);
content = content.replace(
  '<div className="header-anim mb-5 p-5 bg-white rounded-[2rem] shadow-sm border border-slate-100 inline-flex items-center justify-center">',
  '<div className="header-anim mb-3 p-3 bg-white rounded-3xl shadow-sm border border-slate-100 inline-flex items-center justify-center">'
);
content = content.replace(
  '<h1 className="header-anim text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-5">',
  '<h1 className="header-anim text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">'
);

// 4. Cards Grid padding/gap
content = content.replace(
  '<div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 w-full relative z-10 max-w-6xl mx-auto flex-1 content-start">',
  '<div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 w-full relative z-10 max-w-6xl mx-auto flex-1 content-start">'
);

// We need to apply repetitive changes to all 3 cards:
content = content.replaceAll(
  'p-8 sm:p-10 bg-white border-2 border-transparent',
  'p-6 lg:p-8 bg-white border-2 border-transparent'
);
content = content.replaceAll(
  'mb-8">',
  'mb-5">'
);
content = content.replaceAll(
  'p-4 rounded-[1.25rem]',
  'p-3.5 rounded-2xl'
);
content = content.replaceAll(
  'text-2xl font-black',
  'text-xl lg:text-2xl font-black'
);

// Card lists and footers also use mb-8, which got replaced above. Let's fix the footer:
content = content.replace(
  '<div className="header-anim mt-16 sm:mt-auto pt-8 pb-4 text-center text-sm text-slate-400 font-medium relative z-10 flex items-center justify-center gap-2 w-full">',
  '<div className="header-anim mt-8 sm:mt-auto pt-4 pb-2 lg:pb-0 text-center text-sm text-slate-400 font-medium relative z-10 flex items-center justify-center gap-2 w-full">'
);
content = content.replace(
  '<div className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full border border-slate-200 shadow-sm flex items-center gap-2">',
  '<div className="bg-white/80 backdrop-blur-sm px-5 py-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-2">'
);

fs.writeFileSync(path, content);
console.log("Compacted RoleSelection layout.");
