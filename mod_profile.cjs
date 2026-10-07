const fs = require('fs');

const files = [
  'src/components/layout/AdminLayout.tsx',
  'src/components/layout/OperatorLayout.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('clerkUser')) {
    content = content.replace(/const \{ user, signOut \} = useSupabase\(\);/, 'const { user, clerkUser, signOut } = useSupabase();');
  }

  // Update profile block for Desktop
  content = content.replace(/<p className="text-sm font-bold text-slate-900 truncate">.*?<\/p>/g, '{clerkUser?.fullName ? <p className="text-sm font-bold text-slate-900 truncate">{clerkUser.fullName}</p> : <p className="text-sm font-bold text-slate-900 truncate">System User</p>}');
  
  // Also fix initials inside the circle
  content = content.replace(/SA\n\s*<\/div>/g, '{clerkUser?.firstName ? clerkUser.firstName.charAt(0).toUpperCase() : \'S\'}\n  </div>');
  content = content.replace(/OP\n\s*<\/div>/g, '{clerkUser?.firstName ? clerkUser.firstName.charAt(0).toUpperCase() : \'O\'}\n  </div>');
  
  // Mobile drawer profile
  content = content.replace(/<p className="text-sm font-bold text-white truncate">.*?<\/p>/g, '{clerkUser?.fullName ? <p className="text-sm font-bold text-white truncate">{clerkUser.fullName}</p> : <p className="text-sm font-bold text-white truncate">System User</p>}');

  // Remove the static default fallbacks from email
  content = content.replace(/\{user\?\.email \|\| 'admin@wb\.gov\.in'\}/g, '{user?.email || \'\'}');
  content = content.replace(/\{user\?\.email \|\| 'operator@kishan\.in'\}/g, '{user?.email || \'\'}');
  
  fs.writeFileSync(file, content);
});
console.log('Done dynamic profile updates');
