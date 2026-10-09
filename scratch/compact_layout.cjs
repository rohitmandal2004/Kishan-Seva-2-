const fs = require('fs');

const path = 'src/pages/auth/OperatorLogin.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace main container
content = content.replace(
  '<div className="min-h-screen flex flex-col lg:flex-row font-sans bg-slate-50">',
  '<div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row font-sans bg-slate-50">'
);

// Replace left side paddings
content = content.replace(
  '<div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between pt-12 px-16 bg-white overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">',
  '<div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between pt-8 px-10 xl:px-16 bg-white overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">'
);

// Replace mt-16 with mt-8 for content container
content = content.replace(
  '<div className="relative z-10 mt-16 max-w-lg flex-1">',
  '<div className="relative z-10 mt-8 max-w-lg flex-1">'
);

// Replace mb-12 with mb-8 for the paragraph
content = content.replace(
  'font-medium mb-12 max-w-md">',
  'font-medium mb-8 max-w-md">'
);

// Reduce image height
content = content.replace(
  '<div className="absolute bottom-0 left-0 w-full h-[280px] pointer-events-none">',
  '<div className="absolute bottom-0 left-0 w-full h-[180px] pointer-events-none">'
);

// Right side container
content = content.replace(
  '<div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative min-h-screen">',
  '<div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative lg:h-screen lg:overflow-y-auto custom-scrollbar">'
);

// Card padding
content = content.replace(
  '<Card className="w-full max-w-[420px] p-8 lg:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-none rounded-[2rem] bg-white relative">',
  '<Card className="w-full max-w-[420px] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-none rounded-[2rem] bg-white relative my-auto">'
);

// Top right controls padding/margin fix
content = content.replace(
  '<div className="absolute top-6 right-6 lg:top-8 lg:right-8 flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end px-6 lg:px-0">',
  '<div className="absolute top-4 right-4 lg:top-6 lg:right-8 flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end px-4 lg:px-0 z-50">'
);

// Reduce OR margin
content = content.replace(
  '<div className="mt-8 pt-6 border-t border-slate-100 text-center relative">',
  '<div className="mt-6 pt-5 border-t border-slate-100 text-center relative">'
);

// Back to roles margin
content = content.replace(
  '<div className="mt-8 text-center space-y-1">',
  '<div className="mt-4 pb-4 text-center space-y-1">'
);

fs.writeFileSync(path, content);
console.log("Compacted OperatorLogin layout for smaller screens.");
