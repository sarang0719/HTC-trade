import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type CreatePortfolioInput } from "@shared/routes";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function usePortfolioSummary() {
  return useQuery({
    queryKey: [api.portfolio.summary.path],
    queryFn: async () => {
      const res = await fetch(api.portfolio.summary.path, { credentials: "include" });
      if (res.status === 401) return parseWithLogging(api.portfolio.summary.responses[401], await res.json(), "portfolio.summary.401") as any;
      if (!res.ok) throw new Error("Failed to fetch portfolio summary");
      return parseWithLogging(api.portfolio.summary.responses[200], await res.json(), "portfolio.summary");
    },
  });
}

export function useCreatePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePortfolioInput) => {
      const validated = api.portfolio.create.input.parse(data);
      const res = await apiRequest(api.portfolio.create.method, api.portfolio.create.path, validated);
      if (res.status === 201) return api.portfolio.create.responses[201].parse(await res.json());
      if (res.status === 400) throw new Error(api.portfolio.create.responses[400].parse(await res.json()).message);
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.portfolio.summary.path] });
    },
  });
}
