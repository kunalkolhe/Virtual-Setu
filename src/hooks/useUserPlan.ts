import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type Plan = 'free' | 'premium' | 'platinum';

export interface PlanLimits {
  maxDocuments: number;
  aiChatbot: boolean;
  fullAIAssistant: boolean;
  qrEmergencySharing: boolean;
  noPinDelay: boolean;
  priorityVerification: boolean;
  advancedAIAnalysis: boolean;
  futureFeatures: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxDocuments: 5,
    aiChatbot: true,
    fullAIAssistant: false,
    qrEmergencySharing: false,
    noPinDelay: false,
    priorityVerification: false,
    advancedAIAnalysis: false,
    futureFeatures: false,
  },
  premium: {
    maxDocuments: 100,
    aiChatbot: true,
    fullAIAssistant: true,
    qrEmergencySharing: true,
    noPinDelay: false,
    priorityVerification: true,
    advancedAIAnalysis: false,
    futureFeatures: false,
  },
  platinum: {
    maxDocuments: Infinity,
    aiChatbot: true,
    fullAIAssistant: true,
    qrEmergencySharing: true,
    noPinDelay: true,
    priorityVerification: true,
    advancedAIAnalysis: true,
    futureFeatures: true,
  },
};

export interface UseUserPlanReturn {
  plan: Plan;
  limits: PlanLimits;
  loading: boolean;
  canUploadDocument: (currentCount: number) => boolean;
  canUseFeature: (feature: keyof PlanLimits) => boolean;
  refreshPlan: () => Promise<void>;
}

export function useUserPlan(): UseUserPlanReturn {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan>('free');
  const [loading, setLoading] = useState(true);

  const fetchPlan = useCallback(async () => {
    if (!user) {
      setPlan('free');
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan')
        .eq('user_id', user.id)
        .single();

      if (!error && data?.plan) {
        setPlan(data.plan as Plan);
      } else {
        // Fallback: read plan from user metadata (used before DB migration runs)
        const metaPlan = (user.user_metadata as any)?.plan as Plan | undefined;
        if (metaPlan && ['free', 'premium', 'platinum'].includes(metaPlan)) {
          setPlan(metaPlan);
        }
      }
    } catch {
      // Fallback to user metadata on any error
      const metaPlan = (user.user_metadata as any)?.plan as Plan | undefined;
      if (metaPlan && ['free', 'premium', 'platinum'].includes(metaPlan)) {
        setPlan(metaPlan);
      } else {
        setPlan('free');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const limits = PLAN_LIMITS[plan];

  const canUploadDocument = (currentCount: number) => {
    return currentCount < limits.maxDocuments;
  };

  const canUseFeature = (feature: keyof PlanLimits) => {
    return !!limits[feature];
  };

  return {
    plan,
    limits,
    loading,
    canUploadDocument,
    canUseFeature,
    refreshPlan: fetchPlan,
  };
}
