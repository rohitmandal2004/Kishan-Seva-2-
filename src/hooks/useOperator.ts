import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useSupabase } from '@/context/SupabaseContext';

export function useOperator() {
  const { clerkUser } = useSupabase();
  const [operatorCentreId, setOperatorCentreId] = useState<string | null>(null);
  const [operatorProfile, setOperatorProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
       if (clerkUser?.id) {
         try {
           const { data } = await supabase.from('operator_profiles').select('*').eq('clerk_user_id', clerkUser.id).maybeSingle();
           if (data) {
             setOperatorProfile(data);
             if (data.assigned_centre_id) {
               setOperatorCentreId(data.assigned_centre_id);
             }
           }
         } catch (err) {
           console.error('Failed to load operator profile', err);
         }
       }
       setIsLoading(false);
    }
    load();

    let channel: any;
    if (clerkUser?.id) {
      channel = supabase.channel(`operator-profile-${clerkUser.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'operator_profiles', filter: `clerk_user_id=eq.${clerkUser.id}` },
          (payload) => {
            if (payload.new) {
              setOperatorProfile(payload.new as any);
              setOperatorCentreId((payload.new as any).assigned_centre_id || null);
            }
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [clerkUser]);

  return { operatorCentreId, operatorProfile, isLoading };
}
