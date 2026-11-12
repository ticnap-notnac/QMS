import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

export const useUserProfile = (authUserId) => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        const currentAuthId = authUserId || user?.id;

        if (!currentAuthId) return;

        const { data, error: userError } = await supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            user_name,
            email,
            contact_number,
            status,
            role_id,
            department_id,
            position_id,
            site_id,
            departments ( id, department_name ),
            positions ( id, position_name ),
            roles ( id, role_name ),
            sites ( id, site_name, site_code )
          `)
          .eq('auth_id', currentAuthId)
          .maybeSingle();

        if (userError) throw userError;

        let deptName = data?.departments?.department_name || null;
        if (!deptName && data?.department_id) {
          const { data: dept } = await supabase
            .from('departments')
            .select('department_name')
            .eq('id', data.department_id)
            .maybeSingle();
          deptName = dept?.department_name || null;
        }

        let posName = data?.positions?.position_name || null;
        if (!posName && data?.position_id) {
          const { data: pos } = await supabase
            .from('positions')
            .select('position_name')
            .eq('id', data.position_id)
            .maybeSingle();
          posName = pos?.position_name || null;
        }

        let rName = data?.roles?.role_name || null;
        if (!rName && data?.role_id) {
          const { data: r } = await supabase
            .from('roles')
            .select('role_name')
            .eq('id', data.role_id)
            .maybeSingle();
          rName = r?.role_name || null;
        }

        let sName = data?.sites?.site_name || null;
        if (!sName && data?.site_id) {
          const { data: s } = await supabase
            .from('sites')
            .select('site_name')
            .eq('id', data.site_id)
            .maybeSingle();
          sName = s?.site_name || null;
        }

        if (isMounted) {
          setUserProfile({
            ...data,
            email: data?.email || user?.email,
            department_name: deptName,
            position_name: posName,
            role_name: rName,
            site_name: sName,
          });
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUserProfile();

    return () => {
      isMounted = false;
    };
  }, [authUserId]);

  return { userProfile, loading, error };
};