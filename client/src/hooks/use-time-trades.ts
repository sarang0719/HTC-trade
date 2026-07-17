import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { TimeBasedOrder, CreateTimeBasedOrderRequest } from "@shared/schema";

export function useTimeTrades() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["/api/time-trades"],
    queryFn: async (): Promise<TimeBasedOrder[]> => {
      const res = await fetch("/api/time-trades");
      if (res.status === 401) {
        window.location.href = "/";
        return [];
      }
      if (!res.ok) throw new Error("Failed to fetch time trades");
      return res.json();
    },
    refetchInterval: 1000 // continuously update for active trades
  });

  const mutation = useMutation({
    mutationFn: async (trade: CreateTimeBasedOrderRequest) => {
      const res = await fetch("/api/time-trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trade),
      });
      if (res.status === 401) {
        window.location.href = "/";
        return;
      }
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to place trade");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-trades"] });
    },
  });

  return { trades: query.data || [], isLoading: query.isLoading, placeTrade: mutation };
}
