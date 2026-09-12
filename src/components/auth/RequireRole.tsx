import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSupabase } from '@/context/SupabaseContext';
import { Role } from '@/types';
import { Loader2 } from 'lucide-react';
import { useAuth as useClerkAuth } from '@clerk/react';

interface RequireRoleProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}

export const RequireRole: React.FC<RequireRoleProps> = ({ children, allowedRoles }) => {
  const { user, isProfileLoading, farmer, profileError } = useSupabase();
  const { isLoaded: clerkLoaded, isSignedIn } = useClerkAuth();
  const location = useLocation();

  // STATE A: Clerk still initializing — NEVER redirect during this phase
  if (!clerkLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-gray-500 font-medium text-sm">Loading authentication...</p>
      </div>
    );
  }

  // STATE B: Not signed in and no demo user — redirect to role selection
  if (!isSignedIn && !user) {
    return <Navigate to="/roles" state={{ from: location }} replace />;
  }

  // STATE C: Clerk signed in but database profile still loading
  if (isSignedIn && (isProfileLoading || !user)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-gray-500 font-medium text-sm">Loading your profile from database...</p>
      </div>
    );
  }

  // STATE D: Farmer portal route but no farmer profile exists in database
  if (allowedRoles.includes('FARMER') && (!farmer || user?.role !== 'FARMER')) {
    // If there was a database network error, show error screen with reload
    if (profileError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center space-y-4 p-4">
          <div className="text-center max-w-md">
            <p className="text-red-600 font-semibold mb-2">Unable to load profile</p>
            <p className="text-gray-500 text-sm mb-4">{profileError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    // Genuinely missing farmer profile -> redirect to register
    return <Navigate to="/farmer/register" replace />;
  }

  // STATE E: Role mismatch
  if (user && user.role && !allowedRoles.includes(user.role as Role)) {
    if (user.role === 'FARMER') return <Navigate to="/farmer/dashboard" replace />;
    if (user.role === 'OPERATOR') return <Navigate to="/operator/dashboard" replace />;
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/roles" replace />;
  }

  // STATE F: Access granted
  return <>{children}</>;
};

export default RequireRole;
