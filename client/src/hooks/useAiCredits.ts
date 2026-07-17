import { useState, useEffect, useCallback } from "react";

export interface AiCredits {
  freePredictionsUsed: number;
  freePredictionsLimit: number;
  paidCredits: number;
  canUse: boolean;
  isFreeTier: boolean;
  isAdmin: boolean;
  unlimited: boolean;
}

export function useAiCredits() {
  const [credits, setCredits] = useState<AiCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/credits", { credentials: "include" });
      if (res.ok) setCredits(await res.json());
    } catch (e) {
      // ignore — unauthenticated
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCredits(); }, [fetchCredits]);

  const usePrediction = useCallback(async (): Promise<{ granted: boolean; source?: string; remaining?: number; message?: string }> => {
    const res = await fetch("/api/ai/use-prediction", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    // Only refresh credits for non-admin (admins have infinite, no need to re-fetch)
    if (res.ok && data.granted && data.source !== "admin") {
      fetchCredits();
    }
    return data;
  }, [fetchCredits]);

  return { credits, loading, fetchCredits, usePrediction };
}
