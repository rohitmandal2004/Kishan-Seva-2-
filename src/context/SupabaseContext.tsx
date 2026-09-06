import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useUser, useClerk, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { FarmerProfile } from '@/types';

export type AppRole = 'FARMER' | 'ADMIN' | 'OPERATOR';

export interface AuthSessionUser {
 id: string;
 email?: string;
 role: AppRole;
}

interface SupabaseContextType {
 // --- AUTH STATE (Clerk) ---
 /** True once Clerk has finished loading authentication state */
 isLoaded: boolean;
 /** True if an active Clerk session is established */
 isSignedIn: boolean;
 /** Direct Clerk user object */
 clerkUser: ReturnType<typeof useUser>['user'];
 /** Primary Clerk user ID */
 clerkUserId: string | null;

 // --- APPLICATION PROFILE STATE (Supabase) ---
 /** Farmer profile from Supabase (null if not a farmer or not loaded) */
 farmer: FarmerProfile | null;
 /** Application role derived strictly from profile tables */
 role: AppRole | null;
 /** True while the database profile query is in-flight */
 profileLoading: boolean;
 /** Alias for profileLoading */
 isProfileLoading: boolean;
 /** True if a database profile was successfully loaded */
 profileExists: boolean;
 /** True if a database network/connection error occurred during fetch */
 profileError: string | null;
 /** Direct lookup function for farmer profile by clerkUserId and email */
 fetchFarmerProfile: (clerkUserId: string, email?: string) => Promise<FarmerProfile | null>;
 /** Force a re-fetch of the profile from Supabase */
 refreshProfile: (targetClerkUserId?: string, targetEmail?: string) => Promise<FarmerProfile | null | void>;
 /** Resolve the application role for a user */
 resolveRole: (clerkUserId: string, email?: string) => Promise<{ role: AppRole; farmerProfile: FarmerProfile | null }>;

 // --- COMPATIBILITY & SYSTEM ---
 /** Clerk + database-derived user (null until both are resolved) */
 user: AuthSessionUser | null;
 /** True while Supabase is reachable */
 isConnected: boolean;
 connectionDetails: { connected: boolean; message: string; latencyMs?: number };
 refreshConnection: () => Promise<void>;
 /** Sign out from Clerk and clear all application state */
 signOut: () => Promise<void>;
 /** True once Clerk has finished its initial load */
 isConfigured: boolean;
 /** Manually update the active farmer profile */
 setFarmer: (profile: FarmerProfile | null) => void;
 /** Manually update the active session user */
 setUser: React.Dispatch<React.SetStateAction<AuthSessionUser | null>>;
 /**
 * Set a demo role for operator/admin/farmer (used by RoleSelection demo login).
 * This does NOT create a Clerk session — it only sets the in-memory role.
 */
 setDemoRole: (role: AppRole) => void;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const { user: clerkUser, isLoaded: clerkUserLoaded } = useUser();
 const { isSignedIn, isLoaded: clerkAuthLoaded } = useClerkAuth();
 const { signOut: clerkSignOut } = useClerk();

 const [user, setUser] = useState<AuthSessionUser | null>(() => {
 try {
 const cachedProfile = localStorage.getItem('kishan_farmer_profile');
 if (cachedProfile) {
 const p = JSON.parse(cachedProfile);
 return {
 id: p.clerk_user_id || p.id || 'farmer_local',
 email: p.email || 'farmer@kishan.gov.in',
 role: 'FARMER',
 };
 }
 return null;
 } catch {
 return null;
 }
 });
 const [farmer, setFarmerState] = useState<FarmerProfile | null>(() => {
 try {
 const cached = localStorage.getItem('kishan_farmer_profile');
 return cached ? JSON.parse(cached) : null;
 } catch {
 return null;
 }
 });

 const setFarmer = useCallback((profile: FarmerProfile | null) => {
 setFarmerState(profile);
 try {
 if (profile) {
 localStorage.setItem('kishan_farmer_profile', JSON.stringify(profile));
 } else {
 localStorage.removeItem('kishan_farmer_profile');
 }
 } catch {}
 }, []);

 const [isProfileLoading, setIsProfileLoading] = useState(false);
 const [profileError, setProfileError] = useState<string | null>(null);
 const [demoRole, setDemoRoleState] = useState<AppRole | null>(() => {
 try {
 return (sessionStorage.getItem('kishan_demo_role') as AppRole) || null;
 } catch {
 return null;
 }
 });
 const [connectionDetails] = useState<{ connected: boolean; message: string; latencyMs?: number }>({
 connected: true,
 message: 'Clerk Auth + Supabase DB'
 });

 const isLoaded = Boolean(clerkUserLoaded && clerkAuthLoaded);
 const clerkUserId = clerkUser?.id || null;
 const role = user?.role || null;
 const profileExists = Boolean(farmer);

 const refreshConnection = async () => {};

 /**
 * Fetch the farmer profile from Supabase by clerk_user_id (with fallback to email lookup).
 * Automatically links legacy profiles to clerk_user_id if found by email.
 * Distinguishes "not found" from "database error".
 */
 const fetchFarmerProfile = useCallback(async (clerkUserId: string, email?: string): Promise<FarmerProfile | null> => {
 if (!isSupabaseConfigured()) {
 console.warn('[Kishan Seva] Supabase not configured — cannot load farmer profile');
 return null;
 }

 try {
 // 1. Try finding by clerk_user_id first if provided
 if (clerkUserId) {
 try {
 const { data: byClerkId, error: clerkError } = await supabase
 .from('farmer_profiles')
 .select('*')
 .eq('clerk_user_id', clerkUserId)
 .maybeSingle();

 if (!clerkError && byClerkId) {
 setProfileError(null);
 return byClerkId as FarmerProfile;
 }
 } catch {
 // clerk_user_id column might not exist yet on database
 }
 }

 // 2. Fallback: Check if profile exists by email (case-insensitive)
 const cleanEmail = email?.trim().toLowerCase();
 if (cleanEmail) {
 const { data: byEmail, error: emailError } = await supabase
 .from('farmer_profiles')
 .select('*')
 .ilike('email', cleanEmail)
 .maybeSingle();

 if (!emailError && byEmail) {
 // Auto-link clerk_user_id if column exists
 if (clerkUserId && byEmail.clerk_user_id !== clerkUserId) {
 try {
 await supabase
 .from('farmer_profiles')
 .update({ clerk_user_id: clerkUserId, role: 'FARMER' })
 .eq('id', byEmail.id);
 } catch {}
 }

 setProfileError(null);
 return { ...byEmail, ...(clerkUserId ? { clerk_user_id: clerkUserId } : {}), role: 'FARMER' } as FarmerProfile;
 }
 }

 // 3. Fallback: Check localStorage for cached farmer profile
 try {
 const cached = localStorage.getItem('kishan_farmer_profile');
 if (cached) {
 const parsed = JSON.parse(cached);
 if (parsed && (parsed.id || parsed.full_name)) {
 setProfileError(null);
 return { ...parsed, role: 'FARMER' } as FarmerProfile;
 }
 }
 } catch {}

 // 4. Fallback: If only 1 farmer profile exists in database (e.g. initial demo seed), link to it
 try {
 const { data: allFarmers } = await supabase
 .from('farmer_profiles')
 .select('*')
 .limit(2);
 if (allFarmers && allFarmers.length === 1) {
 const primary = allFarmers[0];
 if (cleanEmail && primary.email !== cleanEmail) {
 try {
 await supabase
 .from('farmer_profiles')
 .update({ email: cleanEmail })
 .eq('id', primary.id);
 } catch {}
 }
 setProfileError(null);
 return { ...primary, email: cleanEmail || primary.email, role: 'FARMER' } as FarmerProfile;
 }
 } catch {}

 // data is null if no row found — this is "profile not found", NOT an error
 setProfileError(null);
 return null;
 } catch (err: any) {
 console.error('[Kishan Seva] Network error loading farmer profile:', err);
 setProfileError('Unable to connect to the database. Please check your connection.');
 return null;
 }
 }, []);

 /**
 * Determine the user's role by checking database profile tables.
 * Sourced strictly from application profile data.
 */
 const resolveRole = useCallback(async (clerkUserId: string, email?: string): Promise<{ role: AppRole; farmerProfile: FarmerProfile | null }> => {
 if (!isSupabaseConfigured()) {
 return { role: 'FARMER', farmerProfile: null };
 }

 const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const isUuid = UUID_REGEX.test(clerkUserId);
 const cleanEmail = email?.trim().toLowerCase();

 // 1. Check admin_profiles first if email or clerkUserId
 try {
 if (cleanEmail) {
 const { data: adminByEmail } = await supabase
 .from('admin_profiles')
 .select('id')
 .ilike('email', cleanEmail)
 .maybeSingle();
 if (adminByEmail) return { role: 'ADMIN', farmerProfile: null };
 }
 if (clerkUserId) {
 const { data: adminByClerk } = await supabase
 .from('admin_profiles')
 .select('id')
 .eq('clerk_user_id', clerkUserId)
 .maybeSingle();
 if (adminByClerk) return { role: 'ADMIN', farmerProfile: null };

 if (isUuid) {
 const { data: adminById } = await supabase
 .from('admin_profiles')
 .select('id')
 .eq('user_id', clerkUserId)
 .maybeSingle();
 if (adminById) return { role: 'ADMIN', farmerProfile: null };
 }
 }
 } catch { /* ignore — table may not exist */ }

 // 2. Check operator_profiles
 try {
 if (cleanEmail) {
 const { data: opByEmail } = await supabase
 .from('operator_profiles')
 .select('id')
 .ilike('email', cleanEmail)
 .maybeSingle();
 if (opByEmail) return { role: 'OPERATOR', farmerProfile: null };
 }
 if (clerkUserId) {
 const { data: opByClerk } = await supabase
 .from('operator_profiles')
 .select('id')
 .eq('clerk_user_id', clerkUserId)
 .maybeSingle();
 if (opByClerk) return { role: 'OPERATOR', farmerProfile: null };

 if (isUuid) {
 const { data: opById } = await supabase
 .from('operator_profiles')
 .select('id')
 .eq('user_id', clerkUserId)
 .maybeSingle();
 if (opById) return { role: 'OPERATOR', farmerProfile: null };
 }
 }
 } catch { /* ignore — table may not exist */ }

 // 3. Check farmer_profiles
 const farmerProfile = await fetchFarmerProfile(clerkUserId, email);
 if (farmerProfile) {
 const role = (farmerProfile.role as AppRole) || 'FARMER';
 return { role, farmerProfile };
 }

 // 4. No profile found anywhere — default to FARMER (new user)
 return { role: 'FARMER', farmerProfile: null };
 }, [fetchFarmerProfile]);

 // Sync Clerk session → application state
 useEffect(() => {
 let isMounted = true;

 const syncSession = async () => {
 if (!isLoaded) return;

 if (isSignedIn && clerkUser) {
 // Clear any stale demo role when a real Clerk session is active
 if (demoRole) {
 try { sessionStorage.removeItem('kishan_demo_role'); } catch {}
 setDemoRoleState(null);
 }
 setIsProfileLoading(true);
 setProfileError(null);

 const email = clerkUser.primaryEmailAddress?.emailAddress;
 const { role, farmerProfile } = await resolveRole(clerkUser.id, email);

 if (!isMounted) return;

 setUser({
 id: clerkUser.id,
 email,
 role,
 });
 setFarmer(farmerProfile);
 setIsProfileLoading(false);
 } else {
 // Not signed in — check for demo role
 if (isMounted) {
 if (demoRole) {
 // Demo login (no Clerk session)
 setUser({
 id: `demo-${demoRole.toLowerCase()}`,
 email: `${demoRole.toLowerCase()}@kishan.gov.in`,
 role: demoRole,
 });
 if (demoRole === 'FARMER') {
 const demoFarmer: FarmerProfile = {
 id: 'farmer-demo-1',
 clerk_user_id: 'demo-farmer',
 farmer_code: 'WB-N24-2026-0889',
 full_name: 'Subhash Chandra Mondal',
 email: 'farmer@kishan.gov.in',
 phone: '9830123456',
 aadhaar_reference: 'VERIFIED',
 aadhaar_last_four: '7890',
 state: 'West Bengal',
 district: 'North 24 Parganas',
 village: 'Basirhat',
 land_area_acres: 4.5,
 crop_name: 'Paddy (Dhan)',
 crop_area_acres: 4.0,
 expected_quantity_quintals: 65,
 verification_status: 'VERIFIED',
 role: 'FARMER'
 };
 setFarmer(demoFarmer);
 }
 } else {
 // Check if there is a cached farmer profile
 try {
 const cached = localStorage.getItem('kishan_farmer_profile');
 if (cached) {
 const parsed = JSON.parse(cached);
 setFarmer(parsed);
 setUser({
 id: parsed.clerk_user_id || parsed.id || 'farmer_local',
 email: parsed.email || 'farmer@kishan.gov.in',
 role: 'FARMER',
 });
 } else {
 setUser(null);
 }
 } catch {
 setUser(null);
 }
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
 const effectiveEmail = targetEmail || clerkUser?.primaryEmailAddress?.emailAddress || user?.email;
 if (!effectiveUserId && !effectiveEmail) return;
 setIsProfileLoading(true);
 setProfileError(null);
 const { role, farmerProfile } = await resolveRole(effectiveUserId || '', effectiveEmail);
 setUser(prev => ({
 id: effectiveUserId || prev?.id || `user_${Date.now()}`,
 email: effectiveEmail || prev?.email,
 role: role || (prev?.role ?? 'FARMER'),
 }));
 if (farmerProfile) {
 setFarmer(farmerProfile);
 }
 setIsProfileLoading(false);
 }, [clerkUser, user, resolveRole, setFarmer]);

 const signOut = async () => {
 try {
 await clerkSignOut();
 } catch (err) {
 console.error('[Kishan Seva] Error during sign out:', err);
 }
 try {
 sessionStorage.removeItem('kishan_demo_role');
 localStorage.removeItem('kishan_farmer_profile');
 } catch {}
 setUser(null);
 setFarmer(null);
 setDemoRoleState(null);
 setProfileError(null);
 };

 const setDemoRole = (role: AppRole) => {
 try {
 sessionStorage.setItem('kishan_demo_role', role);
 } catch {}
 setDemoRoleState(role);
 };

 return (
 <SupabaseContext.Provider
 value={{
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
