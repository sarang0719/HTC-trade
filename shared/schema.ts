import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tradeModeEnum = pgEnum("trade_mode", ["DEMO", "REAL"]);
export const withdrawalStatusEnum = pgEnum("withdrawal_status", ["PENDING", "APPROVED", "REJECTED", "CANCELLED"]);

// =========================================================
// AUTH (Replit Auth required tables)
// =========================================================

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable(
  "users",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email").unique(),
    password: text("password"),
    firstName: varchar("first_name"),
    lastName: varchar("last_name"),
    profileImageUrl: varchar("profile_image_url"),
    firebaseUid: varchar("firebase_uid", { length: 128 }).unique(),
    autoTradeEnabled: boolean("auto_trade_enabled"),
    autoTradeAmount: varchar("auto_trade_amount").default("5.00"),
    // AI Prediction credit system
    freePredictionsUsed: integer("free_predictions_used").notNull().default(0),
    paidCredits: integer("paid_credits").notNull().default(0),
    
    // Wallet System — Real + Demo
    walletBalance: numeric("wallet_balance", { precision: 18, scale: 2 }).notNull().default("0.00"),
    demoBalance: numeric("demo_balance", { precision: 18, scale: 2 }).notNull().default("10000.00"),
    tradeMode: tradeModeEnum("trade_mode").notNull().default("DEMO"),
    
    // Notifications & SMS
    phoneNumber: varchar("phone_number", { length: 20 }),

    // Admin Control Flags
    isBlocked: boolean("is_blocked").notNull().default(false),
    isAIBlocked: boolean("is_ai_blocked").notNull().default(false),
    role: varchar("role", { length: 20 }).notNull().default("USER"), // USER, ADMIN_1, ADMIN_2
    autoInvestRound: integer("auto_invest_round").notNull().default(1),
    autoInvestRoundPnl: numeric("auto_invest_round_pnl", { precision: 18, scale: 2 }).notNull().default("0.00"),
    autoInvestProfitLimit: numeric("auto_invest_profit_limit", { precision: 18, scale: 2 }).notNull().default("100.00"),
    autoInvestLossLimit: numeric("auto_invest_loss_limit", { precision: 18, scale: 2 }).notNull().default("50.00"),
    commissionAgreed: boolean("commission_agreed").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  () => [],
);

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// AI Credits response type
export type AiCreditsResponse = {
  freePredictionsUsed: number;
  freePredictionsLimit: number;
  paidCredits: number;
  canUse: boolean;
  isFreeTier: boolean;
};

// =========================================================
// TRADING DATA MODEL
// =========================================================

export const assetClassEnum = pgEnum("asset_class", [
  "INDIAN_STOCK",
  "US_STOCK",
  "ETF",
  "MUTUAL_FUND",
  "FOREX",
  "CRYPTO",
]);

export const orderSideEnum = pgEnum("order_side", ["BUY", "SELL"]);
export const orderTypeEnum = pgEnum("order_type", ["MARKET", "LIMIT", "STOP_LOSS"]);
export const orderStatusEnum = pgEnum("order_status", ["PENDING", "FILLED", "CANCELLED", "REJECTED"]);
export const timeTradeStatusEnum = pgEnum("time_trade_status", ["ACTIVE", "WIN", "LOSS", "TIE"]);

export const instruments = pgTable(
  "instruments",
  {
    id: serial("id").primaryKey(),
    symbol: varchar("symbol", { length: 32 }).notNull(),
    exchange: varchar("exchange", { length: 16 }).notNull(),
    name: text("name").notNull(),
    assetClass: assetClassEnum("asset_class").notNull(),
    currency: varchar("currency", { length: 8 }).notNull(),
    country: varchar("country", { length: 2 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    imageUrl: text("image_url"),
  },
  (t) => [uniqueIndex("instruments_symbol_exchange_unique").on(t.symbol, t.exchange)],
);

export const latestPrices = pgTable(
  "latest_prices",
  {
    instrumentId: integer("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "cascade" }),
    asOf: timestamp("as_of").notNull().defaultNow(),
    price: numeric("price", { precision: 18, scale: 6 }).notNull(),
    changeAbs: numeric("change_abs", { precision: 18, scale: 6 }),
    changePct: numeric("change_pct", { precision: 9, scale: 4 }),
    isOpen: boolean("is_open").notNull().default(true),
    sparkline: numeric("sparkline", { precision: 18, scale: 6 }).array(),
  },
  (t) => [uniqueIndex("latest_prices_instrument_unique").on(t.instrumentId)],
);


export const watchlists = pgTable(
  "watchlists",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 64 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("watchlists_user_id_idx").on(t.userId)],
);

export const watchlistItems = pgTable(
  "watchlist_items",
  {
    id: serial("id").primaryKey(),
    watchlistId: integer("watchlist_id")
      .notNull()
      .references(() => watchlists.id, { onDelete: "cascade" }),
    instrumentId: integer("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("watchlist_item_unique").on(t.watchlistId, t.instrumentId)],
);

export const portfolios = pgTable(
  "portfolios",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 64 }).notNull(),
    baseCurrency: varchar("base_currency", { length: 8 }).notNull().default("USD"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("portfolios_user_id_idx").on(t.userId)],
);

export const holdings = pgTable(
  "holdings",
  {
    id: serial("id").primaryKey(),
    portfolioId: integer("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    instrumentId: integer("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "cascade" }),
    quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull().default("0"),
    avgCost: numeric("avg_cost", { precision: 18, scale: 6 }).notNull().default("0"),
  },
  (t) => [uniqueIndex("holdings_portfolio_instrument_unique").on(t.portfolioId, t.instrumentId)],
);

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    portfolioId: integer("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    instrumentId: integer("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "cascade" }),
    side: orderSideEnum("side").notNull(),
    type: orderTypeEnum("type").notNull(),
    status: orderStatusEnum("status").notNull().default("PENDING"),
    quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull(),
    limitPrice: numeric("limit_price", { precision: 18, scale: 6 }),
    stopPrice: numeric("stop_price", { precision: 18, scale: 6 }),
    filledPrice: numeric("filled_price", { precision: 18, scale: 6 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("orders_user_id_idx").on(t.userId)],
);

export const timeBasedOrders = pgTable(
  "time_based_orders",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    placedBy: varchar("placed_by").notNull().default("USER"),
    instrumentId: integer("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "cascade" }),
    side: orderSideEnum("side").notNull(), // BUY (Up), SELL (Down)
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    payoutRatio: numeric("payout_ratio", { precision: 5, scale: 2 }).notNull().default("0.85"),
    strikePrice: numeric("strike_price", { precision: 18, scale: 6 }).notNull(),
    settlePrice: numeric("settle_price", { precision: 18, scale: 6 }),
    durationSeconds: integer("duration_seconds").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    status: timeTradeStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("time_orders_user_id_idx").on(t.userId), index("time_orders_expires_at_idx").on(t.expiresAt)],
);

export const newsArticles = pgTable(
  "news_articles",
  {
    id: serial("id").primaryKey(),
    source: varchar("source", { length: 64 }).notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    publishedAt: timestamp("published_at").notNull(),
    summary: text("summary"),
    imageUrl: text("image_url"),
    tags: text("tags").array(),
  },
  (t) => [uniqueIndex("news_url_unique").on(t.url)],
);

export const learnArticles = pgTable(
  "learn_articles",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 96 }).notNull(),
    title: text("title").notNull(),
    level: varchar("level", { length: 16 }).notNull(),
    category: varchar("category", { length: 32 }).notNull(),
    content: text("content").notNull(),
  },
  (t) => [uniqueIndex("learn_slug_unique").on(t.slug)],
);

export const insertInstrumentSchema = createInsertSchema(instruments).omit({ id: true });
export const insertWatchlistSchema = createInsertSchema(watchlists).omit({ id: true, createdAt: true });
export const insertWatchlistItemSchema = createInsertSchema(watchlistItems).omit({ id: true, createdAt: true });
export const insertPortfolioSchema = createInsertSchema(portfolios).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, status: true, filledPrice: true });
export const insertTimeBasedOrderSchema = createInsertSchema(timeBasedOrders).omit({ 
  id: true, createdAt: true, status: true, settlePrice: true, expiresAt: true, payoutRatio: true, userId: true
});

export type CreateWatchlistRequest = z.infer<typeof insertWatchlistSchema>;
export type CreateWatchlistItemRequest = z.infer<typeof insertWatchlistItemSchema>;
export type CreatePortfolioRequest = z.infer<typeof insertPortfolioSchema>;
export type CreateOrderRequest = z.infer<typeof insertOrderSchema>;
export type CreateTimeBasedOrderRequest = z.infer<typeof insertTimeBasedOrderSchema>;

export type Instrument = typeof instruments.$inferSelect;
export type LatestPrice = typeof latestPrices.$inferSelect;
export type Watchlist = typeof watchlists.$inferSelect;
export type WatchlistItem = typeof watchlistItems.$inferSelect;
export type Portfolio = typeof portfolios.$inferSelect;
export type Holding = typeof holdings.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type TimeBasedOrder = typeof timeBasedOrders.$inferSelect;
export type NewsArticle = typeof newsArticles.$inferSelect;
export type LearnArticle = typeof learnArticles.$inferSelect;

export type InstrumentsListResponse = (Instrument & { price?: LatestPrice })[];
export type InstrumentDetailResponse = {
  instrument: Instrument;
  price?: LatestPrice;
};
export type WatchlistsListResponse = (Watchlist & { itemCount: number })[];
export type WatchlistDetailResponse = Watchlist & {
  items: Array<{
    id: number;
    instrument: Instrument;
    price?: LatestPrice;
  }>;
};

export type PortfolioSummaryResponse = {
  portfolio: Portfolio;
  totals: {
    marketValue: number;
    costValue: number;
    totalPnl: number;
    totalPnlPct: number;
    dayPnl: number;
    dayPnlPct: number;
  };
  allocation: Array<{
    assetClass: string;
    value: number;
    pct: number;
  }>;
  holdings: Array<{
    holding: Holding;
    instrument: Instrument;
    price?: LatestPrice;
    marketValue: number;
    costValue: number;
    pnl: number;
    pnlPct: number;
  }>;
};

export type OrdersListResponse = Order[];
export type NewsFeedResponse = NewsArticle[];
export type LearnListResponse = LearnArticle[];
export type LearnDetailResponse = LearnArticle;

// =========================================================
// WALLET AND TRANSACTIONS MODEL
// =========================================================

export const transactionTypeEnum = pgEnum("transaction_type", ["DEPOSIT", "WITHDRAW", "TRADE_DEDUCTION", "TRADE_WIN", "TRADE_REFUND", "DEMO_RESET", "COMMISSION"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["PENDING", "SUCCESS", "FAILED"]);

export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: transactionTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  status: transactionStatusEnum("status").notNull().default("SUCCESS"),
  mode: varchar("mode", { length: 8 }).default("REAL"), // DEMO or REAL
  referenceId: varchar("reference_id"), // E.g., Razorpay payment_id or trade_id
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = typeof walletTransactions.$inferInsert;

// Wallet API response types
export type WalletInfoResponse = {
  realBalance: string;
  demoBalance: string;
  tradeMode: "DEMO" | "REAL";
};

// --- ADMIN TRACKING TABLES ---

export const loginHistory = pgTable("login_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ip: varchar("ip", { length: 45 }),
  device: varchar("device", { length: 255 }),
  browser: varchar("browser", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userActivities = pgTable("user_activities", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 255 }).notNull(), // e.g., "LOGIN", "TRADE_PLACE", "AI_PREDICTION", "DEPOSIT"
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LoginHistory = typeof loginHistory.$inferSelect;
export type InsertLoginHistory = typeof loginHistory.$inferInsert;

export type UserActivity = typeof userActivities.$inferSelect;
export type InsertUserActivity = typeof userActivities.$inferInsert;

export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  method: varchar("method", { length: 50 }).notNull(), // UPI, BANK
  details: text("details").notNull(), 
  status: withdrawalStatusEnum("status").notNull().default("PENDING"),
  adminNotes: text("admin_notes"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type InsertWithdrawalRequest = typeof withdrawalRequests.$inferInsert;
