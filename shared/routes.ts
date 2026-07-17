import { z } from "zod";
import {
  insertOrderSchema,
  insertPortfolioSchema,
  insertWatchlistItemSchema,
  insertWatchlistSchema,
  type LearnArticle,
  type NewsArticle,
  type Order,
  type PortfolioSummaryResponse,
  type InstrumentDetailResponse,
  type WatchlistDetailResponse,
  type WatchlistsListResponse,
  type InstrumentsListResponse,
  type OrdersListResponse,
  type TimeBasedOrder,
  insertTimeBasedOrderSchema
} from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  instruments: {
    list: {
      method: "GET" as const,
      path: "/api/instruments" as const,
      input: z
        .object({
          q: z.string().optional(),
          assetClass: z.string().optional(),
          exchange: z.string().optional(),
        })
        .optional(),
      responses: {
        200: z.custom<InstrumentsListResponse>(),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/instruments/:id" as const,
      responses: {
        200: z.custom<InstrumentDetailResponse>(),
        404: errorSchemas.notFound,
      },
    },
  },
  watchlists: {
    list: {
      method: "GET" as const,
      path: "/api/watchlists" as const,
      responses: {
        200: z.custom<WatchlistsListResponse>(),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/watchlists" as const,
      input: insertWatchlistSchema.extend({
        name: z.string().min(2).max(64),
      }),
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/watchlists/:id" as const,
      responses: {
        200: z.custom<WatchlistDetailResponse>(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    addItem: {
      method: "POST" as const,
      path: "/api/watchlists/:id/items" as const,
      input: insertWatchlistItemSchema,
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    removeItem: {
      method: "DELETE" as const,
      path: "/api/watchlists/:id/items/:itemId" as const,
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },
  portfolio: {
    summary: {
      method: "GET" as const,
      path: "/api/portfolio/summary" as const,
      responses: {
        200: z.custom<PortfolioSummaryResponse>(),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/portfolios" as const,
      input: insertPortfolioSchema.extend({
        name: z.string().min(2).max(64),
        baseCurrency: z.string().min(3).max(8).optional(),
      }),
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  orders: {
    list: {
      method: "GET" as const,
      path: "/api/orders" as const,
      responses: {
        200: z.custom<OrdersListResponse>(),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/orders" as const,
      input: insertOrderSchema,
      responses: {
        201: z.custom<Order>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    cancel: {
      method: "POST" as const,
      path: "/api/orders/:id/cancel" as const,
      responses: {
        200: z.custom<Order>(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },
  timeTrades: {
    list: {
      method: "GET" as const,
      path: "/api/time-trades" as const,
      responses: {
        200: z.array(z.custom<TimeBasedOrder>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/time-trades" as const,
      input: insertTimeBasedOrderSchema,
      responses: {
        201: z.custom<TimeBasedOrder>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  settings: {
    aiTrade: {
      method: "POST" as const,
      path: "/api/settings/ai-trade" as const,
      input: z.object({
        enabled: z.boolean().optional(),
        amount: z.string().optional(),
      }),
      responses: {
        200: z.object({ ok: z.boolean() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  market: {
    news: {
      method: "GET" as const,
      path: "/api/market/news" as const,
      responses: {
        200: z.array(z.custom<NewsArticle>()),
      },
    },
  },
  learn: {
    list: {
      method: "GET" as const,
      path: "/api/learn" as const,
      responses: {
        200: z.array(z.custom<LearnArticle>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/learn/:id" as const,
      responses: {
        200: z.custom<LearnArticle>(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(
  path: string,
  params?: Record<string, string | number>,
): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type InstrumentsListInput = z.infer<typeof api.instruments.list.input>;
export type CreateWatchlistInput = z.infer<typeof api.watchlists.create.input>;
export type AddWatchlistItemInput = z.infer<typeof api.watchlists.addItem.input>;
export type CreatePortfolioInput = z.infer<typeof api.portfolio.create.input>;
export type CreateOrderInput = z.infer<typeof api.orders.create.input>;
export type CreateTimeBasedOrderInput = z.infer<typeof api.timeTrades.create.input>;
export type ValidationError = z.infer<typeof errorSchemas.validation>;
export type NotFoundError = z.infer<typeof errorSchemas.notFound>;
export type UnauthorizedError = z.infer<typeof errorSchemas.unauthorized>;
export type InternalError = z.infer<typeof errorSchemas.internal>;
