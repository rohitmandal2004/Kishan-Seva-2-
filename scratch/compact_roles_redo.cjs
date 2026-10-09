const fs = require('fs');

const path = 'src/pages/RoleSelection.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Logo size
content = content.replace(
  '<KishanSevaLogo size="xl" showSubtitle={false} animated={false} />',
  '<KishanSevaLogo size="lg" showSubtitle={false} animated={false} />'
);

// 2. Header bottom margin
content = content.replace(
  '<div className="flex flex-col items-center text-center mb-6 lg:mb-8 relative z-10">',
  '<div className="flex flex-col items-center text-center mb-4 lg:mb-6 relative z-10">'
);

// 3. Card padding
content = content.replaceAll(
  'p-6 lg:p-8 bg-white',
  'p-5 lg:p-6 bg-white'
);

// 4. Card internal margins
content = content.replaceAll(
  'mb-8 font-medium',
  'mb-4 font-medium'
);

// 5. Card icon wrapper
content = content.replaceAll(
  'mb-5">',
  'mb-3">'
);

// 6. Card list margin
content = content.replaceAll(
  'font-medium mb-5">',
  'font-medium mb-4">'
);

// 7. Outer container padding
content = content.replace(
  '<div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#fafafa] flex flex-col items-center p-4 sm:p-6 lg:p-6 xl:p-8 relative overflow-hidden font-sans">',
  '<div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#fafafa] flex flex-col items-center p-4 sm:p-6 lg:p-4 relative overflow-hidden font-sans">'
);

// 8. Make the card grid stretch to fill available space nicely but max out
content = content.replace(
  '<div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 w-full relative z-10 max-w-6xl mx-auto flex-1 content-start">',
  '<div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 w-full relative z-10 max-w-6xl mx-auto flex-1 items-stretch">'
);

fs.writeFileSync(path, content);
console.log("Redone RoleSelection compaction.");
