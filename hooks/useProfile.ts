import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { PrivacyLevel } from '@/lib/social';

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  goal_kcal: number;
  goal_protein: number;
  goal_carbs: number;
  goal_fat: number;
  goal_water_ml: number;
  streak: number;
  username: string | null;
  bio: string | null;
  discoverable: boolean;
  vis_streak: PrivacyLevel;
  vis_weight: PrivacyLevel;
  vis_meals: PrivacyLevel;
  vis_achievements: PrivacyLevel;
  vis_photos: PrivacyLevel;
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    setProfile(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { profile, loading, setProfile, refetch };
}
