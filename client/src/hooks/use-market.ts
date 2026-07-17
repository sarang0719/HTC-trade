import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useMarketNews() {
  return useQuery({
    queryKey: [api.market.news.path],
    queryFn: async () => {
      const res = await fetch(api.market.news.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch market news");
      return parseWithLogging(api.market.news.responses[200], await res.json(), "market.news");
    },
  });
}
