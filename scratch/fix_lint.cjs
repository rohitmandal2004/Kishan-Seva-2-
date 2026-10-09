const fs = require('fs');

const dashboardPath = 'src/pages/farmer/FarmerDashboard.tsx';
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

// The hooks are currently missing from FarmerDashboard because I accidentally deleted them in multi_replace_file_content!
// I need to add them before `if (!farmer) {`.
if (!dashboardContent.includes('const navigate = useNavigate();')) {
  dashboardContent = dashboardContent.replace(
    '  // Route is guarded by RequireRole; render splash screen while farmer resolves\n  if (!farmer) {',
    `  const navigate = useNavigate();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Route is guarded by RequireRole; render splash screen while farmer resolves
  if (!farmer) {`
  );
  fs.writeFileSync(dashboardPath, dashboardContent);
  console.log("Fixed FarmerDashboard hooks.");
}

const bookingPath = 'src/pages/farmer/SlotBooking.tsx';
let bookingContent = fs.readFileSync(bookingPath, 'utf8');

// Fix 1: unused parameter 't'
bookingContent = bookingContent.replace(
  'toast.custom((t) => (',
  'toast.custom((_t) => ('
);

// Fix 2: missing dependency selectedCentreId in useEffect
bookingContent = bookingContent.replace(
  '}, [preSelectedCentreId, recommendations]);',
  '}, [preSelectedCentreId, recommendations, selectedCentreId]);'
);

fs.writeFileSync(bookingPath, bookingContent);
console.log("Fixed SlotBooking lint issues.");
