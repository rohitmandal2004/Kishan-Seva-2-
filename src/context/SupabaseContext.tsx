import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useUser, useClerk, useAuth as useClerkAuth } from '@clerk/react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { FarmerProfile } from '@/types';

export type AppRole = 'FARMER' | 'ADMIN' | 'OPERATOR';

export type AuthState =
  | 'AUTH_IDLE'
  | 'AUTH_LOADING'
  | 'SIGNED_OUT'
  | 'EMAIL_CHECKING'
  | 'OTP_SENDING'
  | 'OTP_SENT'
  | 'OTP_VERIFYING'
  | 'FINALIZING'
  | 'PROFILE_LOADING'
  | 'AUTHENTICATED'
  | 'PROFILE_NOT_FOUND'
  | 'DATABASE_ERROR'
  | 'UNAUTHORIZED'
  | 'AUTH_ERROR';

export type RegistrationState =
  | 'REGISTERING'
  | 'REGISTER_OTP_SENT'
  | 'REGISTER_VERIFIED'
  | 'PROFILE_CREATING'
  | 'REGISTRATION_COMPLETE'
  | 'REGISTRATION_FAILED';

export interface AuthSessionUser {
  id: string;
  email?: string;
  role: AppRole | null;
}

interface SupabaseContextType {
  // --- AUTH STATE MACHINE (Clerk + Application) ---
  authState: AuthState;
  setAuthState: (state: AuthState) => void;
  isLoaded: boolean;
  isSignedIn: boolean;
  clerkUser: ReturnType<typeof useUser>['user'];
  clerkUserId: string | null;

  // --- APPLICATION PROFILE STATE (Supabase) ---
  farmer: FarmerProfile | null;
  role: AppRole | null;
  profileLoading: boolean;
  isProfileLoading: boolean;
  profileExists: boolean;
  profileError: string | null;
  fetchFarmerProfile: (clerkUserId: string, email?: string) => Promise<FarmerProfile | null>;
  refreshProfile: (targetClerkUserId?: string, targetEmail?: string) => Promise<FarmerProfile | null | void>;
  resolveRole: (clerkUserId: string, email?: string) => Promise<{ role: AppRole | null; farmerProfile: FarmerProfile | null }>;

  // --- COMPATIBILITY & SYSTEM ---
  user: AuthSessionUser | null;
  isConnected: boolean;
  connectionDetails: { connected: boolean; message: string; latencyMs?: number };
  refreshConnection: () => Promise<void>;
  signOut: () => Promise<void>;
  isConfigured: boolean;
  setFarmer: (profile: FarmerProfile | null) => void;
  setUser: React.Dispatch<React.SetStateAction<AuthSessionUser | null>>;
  setDemoRole: (role: AppRole) => void;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded: clerkUserLoaded } = useUser();
  const { isSignedIn, isLoaded: clerkAuthLoaded } = useClerkAuth();
  const { signOut: clerkSignOut } = useClerk();

  const [authState, setAuthState] = useState<AuthState>('AUTH_LOADING');
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [farmer, setFarmerState] = useState<FarmerProfile | null>(null);

  const setFarmer = useCallback((profile: FarmerProfile | null) => {
    setFarmerState(profile);
  }, []);

  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [demoRole, setDemoRoleState] = useState<AppRole | null>(null);
  const [connectionDetails] = useState<{ connected: boolean; message: string; latencyMs?: number }>({
    connected: true,
    message: 'Clerk Auth + Supabase DB'
  });

  const isLoaded = Boolean(clerkUserLoaded && clerkAuthLoaded);
  const clerkUserId = clerkUser?.id || null;
  const role = user?.role || (demoRole && import.meta.env.VITE_ENABLE_DEMO_MODE === 'true' ? demoRole : null);
  const profileExists = Boolean(farmer);

  const refreshConnection = async () => {};

  const enrichFarmerCrops = async (profile: any): Promise<FarmerProfile> => {
    if (!profile?.id) return profile as FarmerProfile;
    try {
      const { data: crops } = await supabase
        .from('farmer_crops')
        .select('*, crops(name, msp_rate_per_quintal)')
        .eq('farmer_id', profile.id)
        .order('created_at', { ascending: false });

      if (crops && crops.length > 0) {
        const primary = crops[0];
        return {
          ...profile,
          crop_name: (primary.crops as any)?.name || profile.crop_name || 'Paddy (Grade A)',
          crop_area_acres: primary.area_acres || profile.land_area_acres,
          expected_quantity_quintals: primary.expected_quantity || ((profile.land_area_acres || 1) * 18),
        } as FarmerProfile;
      }
    } catch (err) {
      console.warn('[Kishan Seva] Crop enrichment note:', err);
    }
    return profile as FarmerProfile;
  };

  /**
   * Fetch the farmer profile from Supabase by clerk_user_id (with fallback to normalized email).
   * Links legacy profiles with missing clerk_user_id if found by email.
   */
  const fetchFarmerProfile = useCallback(async (targetClerkId: string, email?: string): Promise<FarmerProfile | null> => {
    if (!isSupabaseConfigured()) {
      console.warn('[Kishan Seva] Supabase not configured — cannot load farmer profile');
      return null;
    }

    try {
      // 1. Primary lookup by clerk_user_id
      if (targetClerkId) {
        try {
          const { data: byClerkId, error: clerkError } = await supabase
            .from('farmer_profiles')
            .select('*')
            .eq('clerk_user_id', targetClerkId)
            .maybeSingle();

          if (!clerkError && byClerkId) {
            setProfileError(null);
            return await enrichFarmerCrops(byClerkId);
          }
        } catch {}
      }

      // 2. Secondary lookup by normalized email
      const cleanEmail = email?.trim().toLowerCase();
      if (cleanEmail) {
        const { data: byEmail, error: emailError } = await supabase
          .from('farmer_profiles')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (!emailError && byEmail) {
          // Auto-link clerk_user_id if currently unlinked
          if (targetClerkId && byEmail.clerk_user_id !== targetClerkId) {
            try {
              await supabase
                .from('farmer_profiles')
                .update({ clerk_user_id: targetClerkId, role: 'FARMER' })
                .eq('id', byEmail.id);
            } catch {}
          }

          setProfileError(null);
          return await enrichFarmerCrops({
            ...byEmail,
            clerk_user_id: targetClerkId || byEmail.clerk_user_id,
            role: 'FARMER'
          });
        }
      }

      // Profile genuinely not found in database
      setProfileError(null);
      return null;
    } catch (err: any) {
      console.error('[Kishan Seva] Database error loading farmer profile:', err);
      setProfileError("We couldn't connect to Kishan Seva right now. Please try again.");
      return null;
    }
  }, []);

  /**
   * Determine the user's role strictly from database profile tables.
   * Order: admin_profiles -> operator_profiles -> farmer_profiles.
   * If no profile exists, role is null (unregistered).
   */
  const resolveRole = useCallback(async (
    targetClerkId: string, 
    email?: string
  ): Promise<{ role: AppRole | null; farmerProfile: FarmerProfile | null }> => {
    if (!isSupabaseConfigured()) {
      return { role: null, farmerProfile: null };
    }

    const cleanEmail = email?.trim().toLowerCase();

    // 1. Check admin_profiles
    try {
      if (targetClerkId) {
        const { data: adminByClerk } = await supabase
          .from('admin_profiles')
          .select('id')
          .eq('clerk_user_id', targetClerkId)
          .maybeSingle();
        if (adminByClerk) return { role: 'ADMIN', farmerProfile: null };
      }
      if (cleanEmail) {
        const { data: adminByEmail } = await supabase
          .from('admin_profiles')
          .select('id')
          .ilike('email', cleanEmail)
          .maybeSingle();
        if (adminByEmail) {
          if (targetClerkId) {
            try {
              await supabase.from('admin_profiles').update({ clerk_user_id: targetClerkId }).eq('id', adminByEmail.id);
            } catch {}
          }
          return { role: 'ADMIN', farmerProfile: null };
        }
      }
    } catch {}

    // 2. Check operator_profiles
    try {
      if (targetClerkId) {
        const { data: opByClerk } = await supabase
          .from('operator_profiles')
          .select('id')
          .eq('clerk_user_id', targetClerkId)
          .maybeSingle();
        if (opByClerk) return { role: 'OPERATOR', farmerProfile: null };
      }
      if (cleanEmail) {
        const { data: opByEmail } = await supabase
          .from('operator_profiles')
          .select('id')
          .ilike('email', cleanEmail)
          .maybeSingle();
        if (opByEmail) {
          if (targetClerkId) {
            try {
              await supabase.from('operator_profiles').update({ clerk_user_id: targetClerkId }).eq('id', opByEmail.id);
            } catch {}
          }
          return { role: 'OPERATOR', farmerProfile: null };
        }
      }
    } catch {}

    // 3. Check farmer_profiles
    const farmerProfile = await fetchFarmerProfile(targetClerkId, cleanEmail);
    if (farmerProfile) {
      return { role: 'FARMER', farmerProfile };
    }

    // 4. No profile found in database
    return { role: null, farmerProfile: null };
  }, [fetchFarmerProfile]);

  // Sync Clerk session with Supabase database profile
  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      if (!isLoaded) {
        setAuthState('AUTH_LOADING');
        return;
      }

      if (isSignedIn && clerkUser) {
        // Active Clerk identity established
        if (demoRole) {
          setDemoRoleState(null);
        }
        setIsProfileLoading(true);
        setAuthState('PROFILE_LOADING');
        setProfileError(null);

        const email = clerkUser.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
        const { role: resolvedRole, farmerProfile } = await resolveRole(clerkUser.id, email);

        if (!isMounted) return;

        setUser({
          id: clerkUser.id,
          email,
          role: resolvedRole,
        });
        setFarmer(farmerProfile);
        setIsProfileLoading(false);

        if (resolvedRole) {
          setAuthState('AUTHENTICATED');
        } else {
          setAuthState('PROFILE_NOT_FOUND');
        }
      } else {
        // Not signed in
        if (isMounted) {
          if (demoRole && import.meta.env.VITE_ENABLE_DEMO_MODE === 'true') {
            setUser({
              id: 'demo_user',
              email: 'demo@kishanseva.gov.in',
              role: demoRole
            });
            setAuthState('AUTHENTICATED');
          } else {
            setUser(null);
            setFarmer(null);
            setAuthState('SIGNED_OUT');
          }
          setIsProfileLoading(false);
          setProfileError(null);
        }
      }
    };

    syncSession();

    return () => {
      isMounted = false;
    };
  }, [clerkUser, isLoaded, isSignedIn, resolveRole, demoRole, setFarmer]);

  const refreshProfile = useCallback(async (targetClerkUserId?: string, targetEmail?: string) => {
    const effectiveUserId = targetClerkUserId || clerkUser?.id || user?.id;
    const effectiveEmail = (targetEmail || clerkUser?.primaryEmailAddress?.emailAddress || user?.email)?.trim().toLowerCase();
    if (!effectiveUserId && !effectiveEmail) return;

    setIsProfileLoading(true);
    setProfileError(null);
    const { role: resolvedRole, farmerProfile } = await resolveRole(effectiveUserId || '', effectiveEmail);
    
    setUser(prev => ({
      id: effectiveUserId || prev?.id || '',
      email: effectiveEmail || prev?.email,
      role: resolvedRole,
    }));

    if (farmerProfile) {
      setFarmer(farmerProfile);
    } else {
      setFarmer(null);
    }
    setIsProfileLoading(false);
  }, [clerkUser, user, resolveRole, setFarmer]);

  const signOut = async () => {
    try {
      await clerkSignOut();
    } catch (err) {
      console.error('[Kishan Seva] Error during sign out:', err);
    }
    setUser(null);
    setFarmer(null);
    setDemoRoleState(null);
    setProfileError(null);
    setAuthState('SIGNED_OUT');

    try {
      localStorage.removeItem('kishan_farmer_profile');
      sessionStorage.removeItem('kishan_reg_sessionid');
      sessionStorage.removeItem('kishan_reg_userid');
      sessionStorage.removeItem('kishan_demo_role');
    } catch {}
  };

  const setDemoRole = (targetRole: AppRole) => {
    if (import.meta.env.VITE_ENABLE_DEMO_MODE === 'true') {
      setDemoRoleState(targetRole);
      setUser({
        id: `demo_${targetRole.toLowerCase()}`,
        email: `demo_${targetRole.toLowerCase()}@kishanseva.gov.in`,
        role: targetRole
      });
      setAuthState('AUTHENTICATED');
    } else {
      console.warn('[Kishan Seva] Demo mode is disabled in production.');
    }
  };

  return (
    <SupabaseContext.Provider
      value={{
        authState,
        setAuthState,
        isLoaded,
        isSignedIn: Boolean(isSignedIn),
        clerkUser: clerkUser || null,
        clerkUserId,
        farmer,
        role,
        profileLoading: isProfileLoading,
        isProfileLoading,
        profileExists,
        profileError,
        fetchFarmerProfile,
        refreshProfile,
        resolveRole,
        user,
        isConnected: connectionDetails.connected,
        connectionDetails,
        refreshConnection,
        signOut,
        isConfigured: isLoaded,
        setDemoRole,
        setFarmer,
        setUser,
      }}
    >
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = (): SupabaseContextType => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

export const useAuth = () => useSupabase();
