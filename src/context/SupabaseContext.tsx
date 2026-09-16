import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useUser, useClerk, useAuth as useClerkAuth } from '@clerk/react';
import { supabase, isSupabaseConfigured, setClerkTokenProvider } from '@/lib/supabase';
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
  const { isSignedIn, isLoaded: clerkAuthLoaded, getToken } = useClerkAuth();
  
  // Provide the JWT fetcher to the Supabase client
  useEffect(() => {
    setClerkTokenProvider(getToken);
  }, [getToken]);
  const { signOut: clerkSignOut } = useClerk();

  const [authState, setAuthState] = useState<AuthState>('AUTH_LOADING');
  const [user, setUser] = useState<AuthSessionUser | null>(() => {
    try {
      const saved = localStorage.getItem('kishan_farmer_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id) {
          return {
            id: parsed.clerk_user_id || parsed.id,
            email: parsed.email,
            role: 'FARMER',
          };
        }
      }
    } catch {}
    return null;
  });
  const [farmer, setFarmerState] = useState<FarmerProfile | null>(() => {
    try {
      const saved = localStorage.getItem('kishan_farmer_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

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
   * Uses SECURITY DEFINER RPCs as primary path to bypass RLS when Clerk JWT template is not configured.
   */
  const fetchFarmerProfile = useCallback(async (targetClerkId: string, email?: string): Promise<FarmerProfile | null> => {
    if (!isSupabaseConfigured()) {
      console.warn('[Kishan Seva] Supabase not configured — cannot load farmer profile');
      return null;
    }

    try {
      const cleanEmail = email?.trim().toLowerCase();

      // 0. TOP PRIORITY: link_or_fetch_farmer_profile RPC (Atomic lookup + auto-link, bypasses RLS)
      try {
        const { data: linkedProfile, error: linkErr } = await supabase
          .rpc('link_or_fetch_farmer_profile', {
            p_email: cleanEmail || null,
            p_clerk_user_id: targetClerkId || null,
          });
        if (!linkErr && linkedProfile) {
          setProfileError(null);
          try {
            localStorage.setItem('kishan_farmer_profile', JSON.stringify(linkedProfile));
          } catch {}
          return await enrichFarmerCrops(linkedProfile);
        }
      } catch {}

      // 1. PRIMARY: Use SECURITY DEFINER RPC to bypass RLS (works without Clerk JWT template)
      if (targetClerkId) {
        try {
          const { data: rpcProfile, error: rpcError } = await supabase
            .rpc('get_farmer_profile_by_clerk_id', { p_clerk_user_id: targetClerkId });
          if (!rpcError && rpcProfile) {
            setProfileError(null);
            return await enrichFarmerCrops(rpcProfile);
          }
        } catch {}
      }

      // 2. RPC FALLBACK: Direct query by clerk_user_id
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

      // 3. Email lookup via RPC
      if (cleanEmail) {
        try {
          const { data: rpcByEmail, error: rpcEmailError } = await supabase
            .rpc('get_farmer_profile_by_email', { p_email: cleanEmail });
          if (!rpcEmailError && rpcByEmail) {
            // Auto-link clerk_user_id if currently unlinked
            if (targetClerkId && rpcByEmail.clerk_user_id !== targetClerkId) {
              try {
                await supabase.rpc('link_farmer_profile', {
                  p_email: cleanEmail,
                  p_clerk_user_id: targetClerkId
                });
              } catch {}
            }
            setProfileError(null);
            return await enrichFarmerCrops({
              ...rpcByEmail,
              clerk_user_id: targetClerkId || rpcByEmail.clerk_user_id,
              role: 'FARMER'
            });
          }
        } catch {}
      }

      // 4. Direct email query fallback
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
              await supabase.rpc('link_farmer_profile', {
                p_email: cleanEmail,
                p_clerk_user_id: targetClerkId
              });
            } catch (rpcErr) {
              console.warn('[Kishan Seva] Profile auto-link via RPC failed:', rpcErr);
            }
          }

          setProfileError(null);
          return await enrichFarmerCrops({
            ...byEmail,
            clerk_user_id: targetClerkId || byEmail.clerk_user_id,
            role: 'FARMER'
          });
        }
      }

      // 5. Local storage fallback if profile was cached on this client
      try {
        const cached = localStorage.getItem('kishan_farmer_profile');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && (
            (cleanEmail && parsed.email?.toLowerCase() === cleanEmail) ||
            (targetClerkId && parsed.clerk_user_id === targetClerkId)
          )) {
            setProfileError(null);
            return await enrichFarmerCrops(parsed);
          }
        }
      } catch {}

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
  // Note: demoRole is intentionally omitted from deps — it's handled separately below.
  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      if (!isLoaded) {
        setAuthState('AUTH_LOADING');
        return;
      }

      if (isSignedIn && clerkUser) {
        // Active Clerk identity — clear any stale demo state
        setDemoRoleState(null);
        setIsProfileLoading(true);
        setAuthState('PROFILE_LOADING');
        setProfileError(null);

        const email = clerkUser.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
        const { role: resolvedRole, farmerProfile } = await resolveRole(clerkUser.id, email);

        if (!isMounted) return;

        setUser(prev => {
          const effectiveRole = resolvedRole || (farmerProfile ? 'FARMER' : (prev?.role ?? null));
          return {
            id: clerkUser.id,
            email,
            role: effectiveRole,
          };
        });
        setFarmerState(prev => farmerProfile || prev);
        setIsProfileLoading(false);

        if (resolvedRole || farmerProfile) {
          setAuthState('AUTHENTICATED');
          if (farmerProfile) {
            try {
              localStorage.setItem('kishan_farmer_profile', JSON.stringify(farmerProfile));
            } catch {}
          }
        } else {
          setAuthState('PROFILE_NOT_FOUND');
        }
      } else if (!isSignedIn && isLoaded) {
        // Not signed in — clear everything
        if (isMounted) {
          setUser(null);
          setFarmerState(null);
          setIsProfileLoading(false);
          setProfileError(null);
          setAuthState('SIGNED_OUT');
        }
      }
    };

    syncSession();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerkUser?.id, isLoaded, isSignedIn, resolveRole]);

  // Separate effect: handle demo mode when user is not signed in via Clerk
  useEffect(() => {
    if (isSignedIn) return; // Clerk session takes priority
    if (!isLoaded) return;
    if (demoRole && import.meta.env.VITE_ENABLE_DEMO_MODE === 'true') {
      const demoId = `demo_${demoRole.toLowerCase()}`;
      setUser({
        id: demoId,
        email: `${demoId}@kishanseva.gov.in`,
        role: demoRole,
      });
      if (demoRole === 'FARMER') {
        setFarmerState({
          id: 'demo-farmer-001',
          clerk_user_id: demoId,
          farmer_code: 'KIS-FMR-DEMO01',
          full_name: 'Demo Farmer (Ramesh Kumar)',
          email: `${demoId}@kishanseva.gov.in`,
          phone: '9876543210',
          state: 'West Bengal',
          district: 'Bardhaman',
          village: 'Memari',
          latitude: 23.2,
          longitude: 88.12,
          land_area_acres: 5.5,
          crop_name: 'Paddy (Grade A)',
          bank_name: 'State Bank of India',
          account_number_masked: 'XXXX1234',
          ifsc_code: 'SBIN0001234',
          verification_status: 'VERIFIED',
          role: 'FARMER',
          aadhaar_reference: 'VERIFIED',
          aadhaar_last_four: '1234',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);
      }
      setAuthState('AUTHENTICATED');
      setIsProfileLoading(false);
    }
  }, [demoRole, isSignedIn, isLoaded]);

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
      role: resolvedRole || (prev?.role ?? null),
    }));

    setFarmerState(prev => farmerProfile || prev);
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
      const demoId = `demo_${targetRole.toLowerCase()}`;
      setUser({
        id: demoId,
        email: `${demoId}@kishanseva.gov.in`,
        role: targetRole
      });
      // Populate a demo farmer profile so the Farmer portal renders
      if (targetRole === 'FARMER') {
        setFarmerState({
          id: 'demo-farmer-001',
          clerk_user_id: demoId,
          farmer_code: 'KIS-FMR-DEMO01',
          full_name: 'Demo Farmer (Ramesh Kumar)',
          email: `${demoId}@kishanseva.gov.in`,
          phone: '9876543210',
          state: 'West Bengal',
          district: 'Bardhaman',
          village: 'Memari',
          latitude: 23.2,
          longitude: 88.12,
          land_area_acres: 5.5,
          crop_name: 'Paddy (Grade A)',
          bank_name: 'State Bank of India',
          account_number_masked: 'XXXX1234',
          ifsc_code: 'SBIN0001234',
          verification_status: 'VERIFIED',
          role: 'FARMER',
          aadhaar_reference: 'VERIFIED',
          aadhaar_last_four: '1234',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);
      }
      setAuthState('AUTHENTICATED');
      setIsProfileLoading(false);
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
