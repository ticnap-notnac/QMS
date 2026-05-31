import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

export const useUserProfile = (authUserId) => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        const currentAuthId = authUserId || user?.id;

        if (!currentAuthId) return;

        const { data, error } = await supabase
          .from('users')
          .select('first_name, last_name, user_name, email, employee_no, contact_number')
          .eq('auth_id', currentAuthId)
          .maybeSingle();

        if (error) throw error;
        
        setUserProfile({
          ...data,
          email: data?.email || user?.email
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [authUserId]);

  return { userProfile, loading, error };
};