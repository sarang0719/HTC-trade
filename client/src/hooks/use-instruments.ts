import { useQuery } from "@tanstack/react-query";
import { api, type InstrumentsListInput } from "@shared/routes";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

function buildQuery(params?: InstrumentsListInput) {
  if (!params) return "";
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.assetClass) sp.set("assetClass", params.assetClass);
  if (params.exchange) sp.set("exchange", params.exchange);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export function useInstruments(params?: InstrumentsListInput) {
  return useQuery({
    queryKey: [api.instruments.list.path, params ?? {}],
    queryFn: async () => {
      const url = `${api.instruments.list.path}${buildQuery(params)}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch instruments`);
      const json = await res.json();
      return parseWithLogging(api.instruments.list.responses[200], json, "instruments.list");
    },
  });
}

export function useInstrumentDetail(id?: number) {
  return useQuery({
    queryKey: [api.instruments.get.path, id],
    enabled: !!id,
    queryFn: async () => {
      const url = api.instruments.get.path.replace(":id", String(id));
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch instrument detail`);
      const json = await res.json();
      return json as any;
    },
    refetchInterval: 5000, // Refresh every 5 seconds for live data
  });
}
