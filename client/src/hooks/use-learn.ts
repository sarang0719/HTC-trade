import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useLearnList() {
  return useQuery({
    queryKey: [api.learn.list.path],
    queryFn: async () => {
      const res = await fetch(api.learn.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch learn articles");
      return parseWithLogging(api.learn.list.responses[200], await res.json(), "learn.list");
    },
  });
}

export function useLearnDetail(id?: number) {
  return useQuery({
    enabled: typeof id === "number",
    queryKey: [api.learn.get.path, id ?? -1],
    queryFn: async () => {
      const url = buildUrl(api.learn.get.path, { id: id as number });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch learn article");
      return parseWithLogging(api.learn.get.responses[200], await res.json(), "learn.get");
    },
  });
}
