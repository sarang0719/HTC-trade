import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateOrderInput } from "@shared/routes";
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

export function useOrders() {
  return useQuery({
    queryKey: [api.orders.list.path],
    queryFn: async () => {
      const res = await fetch(api.orders.list.path, { credentials: "include" });
      if (res.status === 401) return parseWithLogging(api.orders.list.responses[401], await res.json(), "orders.list.401") as any;
      if (!res.ok) throw new Error("Failed to fetch orders");
      return parseWithLogging(api.orders.list.responses[200], await res.json(), "orders.list");
    },
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateOrderInput) => {
      const validated = api.orders.create.input.parse(data);
      const res = await apiRequest(api.orders.create.method, api.orders.create.path, validated);
      if (res.status === 201) return parseWithLogging(api.orders.create.responses[201], await res.json(), "orders.create.201");
      if (res.status === 400) throw new Error(parseWithLogging(api.orders.create.responses[400], await res.json(), "orders.create.400").message);
      throw new Error("Failed to create order");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.orders.list.path] });
      qc.invalidateQueries({ queryKey: [api.portfolio.summary.path] });
    },
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.orders.cancel.path, { id });
      const res = await apiRequest(api.orders.cancel.method, url);
      return parseWithLogging(api.orders.cancel.responses[200], await res.json(), "orders.cancel");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.orders.list.path] });
      qc.invalidateQueries({ queryKey: [api.portfolio.summary.path] });
    },
  });
}
