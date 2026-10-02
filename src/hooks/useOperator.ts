import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useSupabase } from '@/context/SupabaseContext';

export function useOperator() {
  const { clerkUser } = useSupabase();
  const [operatorCentreId, setOperatorCentreId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
       if (clerkUser?.id) {
         try {
           const { data } = await supabase.from('operator_profiles').select('centre_id').eq('clerk_user_id', clerkUser.id).maybeSingle();
           if (data?.centre_id) {
             setOperatorCentreId(data.centre_id);
           }
         } catch (err) {
           console.error('Failed to load operator profile', err);
         }
       }
       setIsLoading(false);
    }
    load();
  }, [clerkUser]);

  return { operatorCentreId, isLoading };
}
