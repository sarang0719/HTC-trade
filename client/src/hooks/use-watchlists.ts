import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type AddWatchlistItemInput, type CreateWatchlistInput } from "@shared/routes";
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

export function useWatchlists() {
  return useQuery({
    queryKey: [api.watchlists.list.path],
    queryFn: async () => {
      const res = await fetch(api.watchlists.list.path, { credentials: "include" });
      if (res.status === 401) return parseWithLogging(api.watchlists.list.responses[401], await res.json(), "watchlists.list.401") as any;
      if (!res.ok) throw new Error("Failed to fetch watchlists");
      return parseWithLogging(api.watchlists.list.responses[200], await res.json(), "watchlists.list");
    },
  });
}

export function useWatchlist(id?: number) {
  return useQuery({
    enabled: typeof id === "number",
    queryKey: [api.watchlists.get.path, id ?? -1],
    queryFn: async () => {
      const url = buildUrl(api.watchlists.get.path, { id: id as number });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 401) {
        return parseWithLogging(api.watchlists.get.responses[401], await res.json(), "watchlists.get.401") as any;
      }
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch watchlist");
      return parseWithLogging(api.watchlists.get.responses[200], await res.json(), "watchlists.get");
    },
  });
}

export function useCreateWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateWatchlistInput) => {
      const validated = api.watchlists.create.input.parse(data);
      const res = await apiRequest(api.watchlists.create.method, api.watchlists.create.path, validated);
      if (res.status === 201) return api.watchlists.create.responses[201].parse(await res.json());
      if (res.status === 400) throw new Error(api.watchlists.create.responses[400].parse(await res.json()).message);
      return await res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [api.watchlists.list.path] }),
  });
}

export function useAddWatchlistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      watchlistId,
      ...body
    }: { watchlistId: number } & AddWatchlistItemInput) => {
      const validated = api.watchlists.addItem.input.parse(body);
      const url = buildUrl(api.watchlists.addItem.path, { id: watchlistId });
      const res = await apiRequest(api.watchlists.addItem.method, url, validated);
      return api.watchlists.addItem.responses[201].parse(await res.json());
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [api.watchlists.list.path] });
      qc.invalidateQueries({ queryKey: [api.watchlists.get.path, vars.watchlistId] });
    },
  });
}

export function useRemoveWatchlistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { watchlistId: number; itemId: number }) => {
      const url = buildUrl(api.watchlists.removeItem.path, { id: vars.watchlistId, itemId: vars.itemId });
      const res = await fetch(url, { method: api.watchlists.removeItem.method, credentials: "include" });
      if (res.status === 404) throw new Error("Item not found");
      if (!res.ok) throw new Error("Failed to remove item");
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [api.watchlists.list.path] });
      qc.invalidateQueries({ queryKey: [api.watchlists.get.path, vars.watchlistId] });
    },
  });
}
