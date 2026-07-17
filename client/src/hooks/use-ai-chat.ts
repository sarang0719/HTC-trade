import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type Conversation = {
  id: number;
  title: string;
  createdAt: string;
};

export type ConversationDetail = Conversation & {
  messages: Array<{
    id: number;
    conversationId: number;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
  }>;
};

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

export function useConversations() {
  return useQuery({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const res = await fetch("/api/conversations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return readJson<Conversation[]>(res);
    },
  });
}

export function useConversation(id?: number) {
  return useQuery({
    enabled: typeof id === "number",
    queryKey: ["/api/conversations/:id", id ?? -1],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${id}`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return readJson<ConversationDetail>(res);
    },
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (title?: string) => {
      const res = await apiRequest("POST", "/api/conversations", { title: title || "New Insight Thread" });
      return readJson<Conversation>(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/conversations"] }),
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete conversation");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/conversations"] }),
  });
}

/**
 * SSE: POST /api/conversations/:id/messages
 * Response lines: `data: {"content":"..."}` and ends with `data: {"done":true}`
 */
export function useStreamAssistantMessage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { conversationId: number; content: string; onDelta: (delta: string) => void }) => {
      const { conversationId, content, onDelta } = vars;

      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });

      if (!res.ok) throw new Error("Failed to send message");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        if (readerDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;

          try {
            const event = JSON.parse(payload) as { content?: string; done?: boolean; error?: string };
            if (event.error) throw new Error(event.error);
            if (event.content) onDelta(event.content);
            if (event.done) done = true;
          } catch (e) {
            // ignore partial JSON
            const msg = e instanceof Error ? e.message : String(e);
            if (!msg.toLowerCase().includes("unexpected end")) {
              // keep soft
            }
          }
        }
      }
    },
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ["/api/conversations/:id", vars.conversationId] });
    },
  });
}
