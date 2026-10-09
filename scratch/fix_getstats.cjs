const fs = require('fs');

const path = 'src/context/DataContext.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetStats = `  const getStats = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = bookings.filter(b => b.slot_date === today);
    return {
      totalBookings: todayBookings.length,
      completedBookings: todayBookings.filter(b => b.status === 'COMPLETED').length,
      inQueueCount: bookings.filter(b => ['CHECKED_IN', 'WAITING', 'CALLED', 'WEIGHMENT', 'QUALITY_TESTING'].includes(b.status)).length,
      totalProcuredQuintals: todayBookings.filter(b => b.status === 'COMPLETED').reduce((sum, b) => sum + (b.expected_quantity_q || 0), 0)
    };
  }, [bookings]);`;

const replacementStats = `  const getStats = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = bookings.filter(b => b.slot_date === today);
    
    // Calculate total disbursed based on all completed bookings with weighment data
    const totalDisbursed = bookings.filter(b => b.status === 'COMPLETED').reduce((sum, b) => sum + (b.weighment_data?.net_payable || 0), 0);
    const totalDisbursedCrores = (totalDisbursed / 10000000).toFixed(2);
    
    // Unique farmers count based on distinct farmer_id or farmer_name
    const uniqueFarmers = new Set(bookings.map(b => b.farmer_id || b.farmer_name)).size;
    
    return {
      totalBookings: todayBookings.length,
      completedBookings: todayBookings.filter(b => b.status === 'COMPLETED').length,
      inQueueCount: bookings.filter(b => ['CHECKED_IN', 'WAITING', 'CALLED', 'WEIGHMENT', 'QUALITY_TESTING'].includes(b.status)).length,
      totalProcuredQuintals: todayBookings.filter(b => b.status === 'COMPLETED').reduce((sum, b) => sum + (b.expected_quantity_q || 0), 0),
      totalDisbursedCrores: totalDisbursedCrores,
      totalFarmers: uniqueFarmers,
      activeCentres: centres.filter(c => c.status === 'ACTIVE').length
    };
  }, [bookings, centres]);`;

content = content.replace(targetStats, replacementStats);

fs.writeFileSync(path, content);
console.log("Fixed getStats in DataContext.");
