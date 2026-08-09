import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "./db";
import { syncUserToFirestore } from "./firebase-admin";
import {
  holdings,
  instruments,
  latestPrices,
  newsArticles,
  orders,
  timeBasedOrders,
  portfolios,
  watchlistItems,
  watchlists,
  learnArticles,
  users,
  walletTransactions,
  loginHistory,
  userActivities,
  withdrawalRequests,
  type CreateOrderRequest,
  type CreatePortfolioRequest,
  type CreateWatchlistItemRequest,
  type CreateWatchlistRequest,
  type InstrumentsListResponse,
  type InstrumentDetailResponse,
  type LearnDetailResponse,
  type LearnListResponse,
  type NewsFeedResponse,
  type OrdersListResponse,
  type Order,
  type TimeBasedOrder,
  type CreateTimeBasedOrderRequest,
  type PortfolioSummaryResponse,
  type WatchlistDetailResponse,
  type WatchlistsListResponse,
  type Instrument,
  type LatestPrice,
  type User,
  type UpsertUser,
  type WalletTransaction,
  type InsertWalletTransaction,
  type LoginHistory,
  type InsertLoginHistory,
  type UserActivity,
  type InsertUserActivity,
  type WithdrawalRequest,
  type InsertWithdrawalRequest,
} from "@shared/schema";

function num(v: any): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function log(message: string) {
  console.log(`${new Date().toLocaleTimeString()} [storage] ${message}`);
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByFirebaseUid(uid: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateAiTradeConsent(userId: string, enabled?: boolean, amount?: string): Promise<void>;
  updateAiCredits(userId: string, update: { freePredictionsUsed?: number; paidCredits?: number }): Promise<void>;
  updateUser(id: string, payload: Partial<User>): Promise<User>;

  // Admin Dashboard System
  getAllUsers(): Promise<User[]>;
  getLoginHistory(userId: string): Promise<LoginHistory[]>;
  getUserActivities(userId: string): Promise<UserActivity[]>;
  logLogin(userId: string, data: { ip?: string; device?: string; browser?: string }): Promise<void>;
  logActivity(userId: string, action: string, details?: string): Promise<void>;
  updateUserAdminFlags(userId: string, flags: { isBlocked?: boolean; isAIBlocked?: boolean }): Promise<User>;
  
  // Wallet System
  updateWalletBalance(userId: string, amountOffset: number): Promise<User>;
  updateDemoBalance(userId: string, amountOffset: number): Promise<User>;
  setTradeMode(userId: string, mode: "DEMO" | "REAL"): Promise<User>;
  resetDemoBalance(userId: string): Promise<User>;
  getWalletInfo(userId: string): Promise<{ realBalance: string; demoBalance: string; tradeMode: string } | null>;
  getWalletTransactions(userId: string): Promise<WalletTransaction[]>;

  // Withdrawal System
  createWithdrawalRequest(req: InsertWithdrawalRequest): Promise<WithdrawalRequest>;
  getUserWithdrawalRequests(userId: string): Promise<WithdrawalRequest[]>;
  getAllWithdrawalRequests(): Promise<(WithdrawalRequest & { user: User })[]>;
  updateWithdrawalStatus(withdrawalId: number, status: any, notes?: string): Promise<WithdrawalRequest>;


  listInstruments(input?: {
    q?: string;
    assetClass?: string;
    exchange?: string;
  }): Promise<InstrumentsListResponse>;
  getInstrumentDetail(id: number): Promise<InstrumentDetailResponse | undefined>;
  getInstrumentBySymbol(symbol: string): Promise<{ price?: string, changeAbs?: string, changePct?: string } | undefined>;

  listWatchlists(userId: string): Promise<WatchlistsListResponse>;
  createWatchlist(userId: string, input: CreateWatchlistRequest): Promise<number>;
  getWatchlistDetail(userId: string, id: number): Promise<WatchlistDetailResponse | undefined>;
  addWatchlistItem(userId: string, watchlistId: number, input: CreateWatchlistItemRequest): Promise<void>;
  removeWatchlistItem(userId: string, watchlistId: number, itemId: number): Promise<void>;

  ensureDefaultPortfolio(userId: string): Promise<number>;
  createPortfolio(userId: string, input: CreatePortfolioRequest): Promise<number>;
  getPortfolioSummary(userId: string): Promise<PortfolioSummaryResponse>;

  listOrders(userId: string): Promise<OrdersListResponse>;
  createOrder(userId: string, input: CreateOrderRequest): Promise<Order>;
  cancelOrder(userId: string, orderId: number): Promise<Order | undefined>;

  listTimeBasedOrders(userId: string): Promise<TimeBasedOrder[]>;
  createTimeBasedOrder(userId: string, input: CreateTimeBasedOrderRequest): Promise<TimeBasedOrder>;
  updateTimeBasedOrder(orderId: number, update: Partial<TimeBasedOrder>): Promise<void>;
  getActiveTimeBasedOrders(): Promise<TimeBasedOrder[]>;
  checkRiskManagement(userId: string): Promise<{ allowed: boolean, reason?: string }>;

  getNews(): Promise<NewsFeedResponse>;
  listLearn(): Promise<LearnListResponse>;
  getLearn(id: number): Promise<LearnDetailResponse | undefined>;

  seed(): Promise<void>;
  updateLatestPrice(instrumentId: number, price: string, changeAbs: string, changePct: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, username));
    return user;
  }

  async getUserByFirebaseUid(uid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, uid));
    return user;
  }

  async createUser(insertUser: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    if (user) await syncUserToFirestore(user);
    return user;
  }

  async updateUser(id: string, payload: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set(payload).where(eq(users.id, id)).returning();
    if (!user) throw new Error("User not found for update");
    await syncUserToFirestore(user);
    return user;
  }

  // Admin Dashboard System
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getLoginHistory(userId: string): Promise<LoginHistory[]> {
    return await db.select().from(loginHistory).where(eq(loginHistory.userId, userId)).orderBy(desc(loginHistory.createdAt));
  }

  async getUserActivities(userId: string): Promise<UserActivity[]> {
    return await db.select().from(userActivities).where(eq(userActivities.userId, userId)).orderBy(desc(userActivities.createdAt));
  }

  async logLogin(userId: string, data: { ip?: string; device?: string; browser?: string }): Promise<void> {
    await db.insert(loginHistory).values({
      userId,
      ip: data.ip,
      device: data.device,
      browser: data.browser,
    });
    
    // Institutional Cloud Mirror: Log to Firestore for high-fidelity persistence
    try {
      const { firestore } = await import("./firebase-admin");
      await firestore.collection("logins").add({
        userId,
        ...data,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("[Firestore Log] Skipping cloud login mirror:", e);
    }
  }

  async logActivity(userId: string, action: string, details?: string): Promise<void> {
    await db.insert(userActivities).values({
      userId,
      action,
      details,
    });

    // Institutional Cloud Mirror: Log to Firestore
    try {
      const { firestore } = await import("./firebase-admin");
      await firestore.collection("activities").add({
        userId,
        action,
        details,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("[Firestore Log] Skipping cloud activity mirror:", e);
    }
  }

  async updateUserAdminFlags(userId: string, flags: { 
    isBlocked?: boolean; 
    isAIBlocked?: boolean;
    autoTradeEnabled?: boolean;
    autoTradeAmount?: string;
    autoInvestProfitLimit?: string;
    autoInvestLossLimit?: string;
  }): Promise<User> {
    const [user] = await db.update(users).set(flags).where(eq(users.id, userId)).returning();
    if (!user) throw new Error("User not found");
    await syncUserToFirestore(user);
    return user;
  }


  async updateAiTradeConsent(userId: string, enabled?: boolean, amount?: string): Promise<void> {
    const payload: Partial<User> = {};
    if (enabled !== undefined) payload.autoTradeEnabled = enabled;
    if (amount !== undefined) payload.autoTradeAmount = amount;
    if (Object.keys(payload).length > 0) {
      await db.update(users).set(payload).where(eq(users.id, userId));
    }
  }

  async updateAiCredits(userId: string, update: { freePredictionsUsed?: number; paidCredits?: number }): Promise<void> {
    const payload: Partial<User> = {};
    if (update.freePredictionsUsed !== undefined) payload.freePredictionsUsed = update.freePredictionsUsed;
    if (update.paidCredits !== undefined) payload.paidCredits = update.paidCredits;
    if (Object.keys(payload).length > 0) {
      await db.update(users).set(payload).where(eq(users.id, userId));
    }
  }

  // Withdrawal System
  async updateWithdrawalStatus(reqId: number, status: any, notes?: string): Promise<WithdrawalRequest> {
    const [req] = await db.update(withdrawalRequests)
      .set({ status, adminNotes: notes, processedAt: new Date() })
      .where(eq(withdrawalRequests.id, reqId))
      .returning();
    if (!req) throw new Error("Withdrawal request not found");
    return req;
  }

  async getAllWithdrawalRequests(): Promise<(WithdrawalRequest & { user: User })[]> {
    const results = await db.select({
      request: withdrawalRequests,
      user: users
    })
    .from(withdrawalRequests)
    .innerJoin(users, eq(withdrawalRequests.userId, users.id))
    .orderBy(desc(withdrawalRequests.createdAt));

    return results.map((r: any) => ({
      ...r.request,
      user: r.user
    }));
  }

  async getUserWithdrawalRequests(userId: string): Promise<WithdrawalRequest[]> {
     return await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.userId, userId)).orderBy(desc(withdrawalRequests.createdAt));
  }

  async createWithdrawalRequest(insertReq: InsertWithdrawalRequest): Promise<WithdrawalRequest> {
     const [req] = await db.insert(withdrawalRequests).values(insertReq).returning();
     return req;
  }


  async updateWalletBalance(userId: string, amountOffset: number): Promise<User> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const newBalance = (parseFloat(user.walletBalance as string) || 0) + amountOffset;
    const [updated] = await db.update(users).set({ walletBalance: newBalance.toFixed(2) }).where(eq(users.id, userId)).returning();
    await syncUserToFirestore(updated);
    return updated;
  }

  async updateDemoBalance(userId: string, amountOffset: number): Promise<User> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const newBalance = Math.max(0, (parseFloat(user.demoBalance as string) || 0) + amountOffset);
    const [updated] = await db.update(users).set({ demoBalance: newBalance.toFixed(2) }).where(eq(users.id, userId)).returning();
    await syncUserToFirestore(updated);
    return updated;
  }

  async setTradeMode(userId: string, mode: "DEMO" | "REAL"): Promise<User> {
    const [updated] = await db.update(users).set({ tradeMode: mode as any }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async resetDemoBalance(userId: string): Promise<User> {
    const [updated] = await db.update(users).set({ demoBalance: "10000.00" }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async getWalletInfo(userId: string): Promise<{ realBalance: string; demoBalance: string; tradeMode: string } | null> {
    const [user] = await db.select({
      walletBalance: users.walletBalance,
      demoBalance: users.demoBalance,
      tradeMode: users.tradeMode,
    }).from(users).where(eq(users.id, userId));
    if (!user) return null;
    return {
      realBalance: user.walletBalance as string,
      demoBalance: user.demoBalance as string,
      tradeMode: user.tradeMode as string,
    };
  }

  async createWalletTransaction(tx: InsertWalletTransaction): Promise<WalletTransaction> {
    const [inserted] = await db.insert(walletTransactions).values(tx).returning();
    return inserted;
  }

  async getWalletTransactions(userId: string): Promise<WalletTransaction[]> {
    return db.select().from(walletTransactions).where(eq(walletTransactions.userId, userId)).orderBy(desc(walletTransactions.createdAt));
  }

  async listInstruments(input?: { q?: string; assetClass?: string; exchange?: string }): Promise<(Instrument & { price?: LatestPrice })[]> {
    const where: any[] = [eq(instruments.isActive, true)];
    if (input?.q) {
      const q = `%${input.q}%`;
      where.push(or(ilike(instruments.symbol, q), ilike(instruments.name, q)));
    }
    if (input?.assetClass) where.push(eq(instruments.assetClass as any, input.assetClass as any));
    if (input?.exchange) where.push(eq(instruments.exchange, input.exchange));

    const rows = await db
      .select({
        instrument: instruments,
        price: latestPrices,
      })
      .from(instruments)
      .leftJoin(latestPrices, eq(instruments.id, latestPrices.instrumentId))
      .where(and(...(where as any)))
      .orderBy(instruments.exchange, instruments.symbol)
      .limit(200);

    return rows.map((r: any) => ({
      ...r.instrument,
      price: r.price ?? undefined,
    }));
  }

  async getInstrumentDetail(id: number): Promise<InstrumentDetailResponse | undefined> {
    const [inst] = await db.select().from(instruments).where(eq(instruments.id, id));
    if (!inst) return undefined;

    const [price] = await db.select().from(latestPrices).where(eq(latestPrices.instrumentId, id));

    return {
      instrument: inst,
      price: price ?? undefined,
    };
  }

  async getInstrumentBySymbol(symbol: string): Promise<{ price?: string, changeAbs?: string, changePct?: string } | undefined> {
    const [inst] = await db.select().from(instruments).where(eq(instruments.symbol, symbol));
    if (!inst) return undefined;
    const [price] = await db.select().from(latestPrices).where(eq(latestPrices.instrumentId, inst.id));
    if (!price) return undefined;
    
    return {
      price: price.price as string,
      changeAbs: price.changeAbs as string,
      changePct: price.changePct as string
    };
  }

  async listWatchlists(userId: string): Promise<WatchlistsListResponse> {
    const rows = await db
      .select({
        id: watchlists.id,
        userId: watchlists.userId,
        name: watchlists.name,
        createdAt: watchlists.createdAt,
        itemCount: sql<number>`(SELECT count(*) FROM ${watchlistItems} WHERE ${watchlistItems.watchlistId} = ${watchlists.id})::int`.as("itemCount"),
      })
      .from(watchlists)
      .leftJoin(watchlistItems, eq(watchlistItems.watchlistId, watchlists.id))
      .where(eq(watchlists.userId, userId))
      .groupBy(watchlists.id)
      .orderBy(desc(watchlists.createdAt));
    return rows as any;
  }

  async createWatchlist(userId: string, input: CreateWatchlistRequest): Promise<number> {
    const [wl] = await db
      .insert(watchlists)
      .values({ userId, name: input.name })
      .returning();
    return wl.id;
  }

  async getWatchlistDetail(userId: string, id: number): Promise<WatchlistDetailResponse | undefined> {
    const [wl] = await db
      .select()
      .from(watchlists)
      .where(and(eq(watchlists.id, id), eq(watchlists.userId, userId)));
    if (!wl) return undefined;

    const rows = await db
      .select({
        itemId: watchlistItems.id,
        instrument: instruments,
        price: latestPrices,
      })
      .from(watchlistItems)
      .innerJoin(instruments, eq(instruments.id, watchlistItems.instrumentId))
      .leftJoin(latestPrices, eq(latestPrices.instrumentId, instruments.id))
      .where(eq(watchlistItems.watchlistId, id))
      .orderBy(instruments.exchange, instruments.symbol);

    return {
      ...wl,
      items: rows.map((r: any) => ({
        id: r.itemId,
        instrument: r.instrument,
        price: r.price ?? undefined,
      })),
    };
  }

  async addWatchlistItem(userId: string, watchlistId: number, input: CreateWatchlistItemRequest): Promise<void> {
    const [wl] = await db
      .select({ id: watchlists.id })
      .from(watchlists)
      .where(and(eq(watchlists.id, watchlistId), eq(watchlists.userId, userId)));
    if (!wl) return;
    await db
      .insert(watchlistItems)
      .values({ watchlistId, instrumentId: input.instrumentId as any })
      .onConflictDoNothing();
  }

  async removeWatchlistItem(userId: string, watchlistId: number, itemId: number): Promise<void> {
    const [wl] = await db
      .select({ id: watchlists.id })
      .from(watchlists)
      .where(and(eq(watchlists.id, watchlistId), eq(watchlists.userId, userId)));
    if (!wl) return;
    await db
      .delete(watchlistItems)
      .where(and(eq(watchlistItems.id, itemId), eq(watchlistItems.watchlistId, watchlistId)));
  }

  async ensureDefaultPortfolio(userId: string): Promise<number> {
    const [p] = await db
      .select()
      .from(portfolios)
      .where(eq(portfolios.userId, userId))
      .orderBy(desc(portfolios.createdAt))
      .limit(1);
    if (p) return p.id;
    const [created] = await db
      .insert(portfolios)
      .values({ userId, name: "Main Portfolio", baseCurrency: "USD" })
      .returning();
    return created.id;
  }

  async createPortfolio(userId: string, input: CreatePortfolioRequest): Promise<number> {
    const [p] = await db
      .insert(portfolios)
      .values({
        userId,
        name: input.name,
        baseCurrency: input.baseCurrency ?? "USD",
      })
      .returning();
    return p.id;
  }

  async getPortfolioSummary(userId: string): Promise<PortfolioSummaryResponse> {
    const portfolioId = await this.ensureDefaultPortfolio(userId);
    const [portfolio] = await db.select().from(portfolios).where(eq(portfolios.id, portfolioId));

    const rows = await db
      .select({
        holding: holdings,
        instrument: instruments,
        price: latestPrices,
      })
      .from(holdings)
      .innerJoin(instruments, eq(instruments.id, holdings.instrumentId))
      .leftJoin(latestPrices, eq(latestPrices.instrumentId, instruments.id))
      .where(eq(holdings.portfolioId, portfolioId));

    const enriched = rows.map((r: any) => {
      const qty = num(r.holding.quantity);
      const avg = num(r.holding.avgCost);
      const px = r.price ? num(r.price.price) : 0;
      const marketValue = qty * px;
      const costValue = qty * avg;
      const pnl = marketValue - costValue;
      const pnlPct = costValue > 0 ? pnl / costValue : 0;
      return {
        holding: r.holding,
        instrument: r.instrument,
        price: r.price ?? undefined,
        marketValue,
        costValue,
        pnl,
        pnlPct,
      };
    });

    const marketValue = enriched.reduce((a: number, b: any) => a + b.marketValue, 0);
    const costValue = enriched.reduce((a: number, b: any) => a + b.costValue, 0);
    const totalPnl = marketValue - costValue;
    const totalPnlPct = costValue > 0 ? totalPnl / costValue : 0;

    const dayPnl = enriched.reduce((a: number, b: any) => {
      const chg = b.price ? num(b.price.changeAbs) : 0;
      const qty = num(b.holding.quantity);
      return a + chg * qty;
    }, 0);
    const dayBase = marketValue - dayPnl;
    const dayPnlPct = dayBase > 0 ? dayPnl / dayBase : 0;

    const allocMap = new Map<string, number>();
    for (const h of enriched) {
      const k = h.instrument.assetClass;
      allocMap.set(k, (allocMap.get(k) ?? 0) + h.marketValue);
    }
    const allocation = Array.from(allocMap.entries()).map(([assetClass, value]) => ({
      assetClass: assetClass as any,
      value,
      pct: marketValue > 0 ? value / marketValue : 0,
    }));

    return {
      portfolio: portfolio!,
      totals: {
        marketValue,
        costValue,
        totalPnl,
        totalPnlPct,
        dayPnl,
        dayPnlPct,
      },
      allocation,
      holdings: enriched,
    };
  }

  async listOrders(userId: string): Promise<OrdersListResponse> {
    return db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(200);
  }

  async createOrder(userId: string, input: CreateOrderRequest): Promise<Order> {
    const portfolioId = await this.ensureDefaultPortfolio(userId);
    const [order] = await db
      .insert(orders)
      .values({
        userId,
        portfolioId,
        instrumentId: input.instrumentId as any,
        side: input.side as any,
        type: input.type as any,
        quantity: input.quantity as any,
        limitPrice: (input as any).limitPrice ?? null,
        stopPrice: (input as any).stopPrice ?? null,
        status: "FILLED" as any,
        filledPrice: (await this.getLatestPriceNumber(input.instrumentId as any))?.toString() ?? null,
      })
      .returning();

    await this.applyFillToHoldings(order);
    return order;
  }

  async cancelOrder(userId: string, orderId: number): Promise<Order | undefined> {
    const [existing] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));
    if (!existing) return undefined;
    if (existing.status !== "PENDING") return existing as any;

    const [updated] = await db
      .update(orders)
      .set({ status: "CANCELLED" as any })
      .where(eq(orders.id, orderId))
      .returning();
    return updated as any;
  }

  async listTimeBasedOrders(userId: string): Promise<TimeBasedOrder[]> {
    return db
      .select()
      .from(timeBasedOrders)
      .where(eq(timeBasedOrders.userId, userId))
      .orderBy(desc(timeBasedOrders.createdAt))
      .limit(200);
  }

  async createTimeBasedOrder(userId: string, input: CreateTimeBasedOrderRequest): Promise<TimeBasedOrder> {
    const risk = await this.checkRiskManagement(userId);
    if (!risk.allowed) throw new Error(risk.reason);

    const expiresAt = new Date(Date.now() + input.durationSeconds * 1000);
    const [order] = await db
      .insert(timeBasedOrders)
      .values({
        userId,
        instrumentId: input.instrumentId as any,
        side: input.side as any,
        amount: input.amount as any,
        strikePrice: input.strikePrice as any,
        durationSeconds: input.durationSeconds as any,
        expiresAt,
        status: "ACTIVE" as any,
        placedBy: (input as any).placedBy || "USER",
      })
      .returning();
    return order as any;
  }

  async updateTimeBasedOrder(orderId: number, update: Partial<TimeBasedOrder>): Promise<void> {
    await db.update(timeBasedOrders).set(update as any).where(eq(timeBasedOrders.id, orderId));
  }

  async getActiveTimeBasedOrders(): Promise<TimeBasedOrder[]> {
    return db.select().from(timeBasedOrders).where(eq(timeBasedOrders.status, "ACTIVE" as any));
  }

  async checkRiskManagement(userId: string): Promise<{ allowed: boolean, reason?: string }> {
    // Profit and trade limits removed to allow unlimited Auto-Pilot profits!
    return { allowed: true };
  }

  async getNews(): Promise<NewsFeedResponse> {
    return db.select().from(newsArticles).orderBy(desc(newsArticles.publishedAt)).limit(20);
  }

  async listLearn(): Promise<LearnListResponse> {
    return db.select().from(learnArticles).orderBy(learnArticles.category, learnArticles.title).limit(50);
  }

  async getLearn(id: number): Promise<LearnDetailResponse | undefined> {
    const [a] = await db.select().from(learnArticles).where(eq(learnArticles.id, id));
    return a;
  }

  private async getLatestPriceNumber(instrumentId: number): Promise<number | undefined> {
    const [p] = await db.select().from(latestPrices).where(eq(latestPrices.instrumentId, instrumentId));
    if (!p) return undefined;
    return num(p.price);
  }

  private async applyFillToHoldings(order: Order): Promise<void> {
    const qty = num(order.quantity);
    const px = num(order.filledPrice);
    const signedQty = order.side === "BUY" ? qty : -qty;

    const [existing] = await db
      .select()
      .from(holdings)
      .where(and(eq(holdings.portfolioId, order.portfolioId), eq(holdings.instrumentId, order.instrumentId)));

    if (!existing) {
      if (signedQty <= 0) return;
      await db.insert(holdings).values({
        portfolioId: order.portfolioId,
        instrumentId: order.instrumentId,
        quantity: String(signedQty),
        avgCost: String(px),
      });
      return;
    }

    const oldQty = num(existing.quantity);
    const oldAvg = num(existing.avgCost);
    const newQty = oldQty + signedQty;
    if (newQty <= 0) {
      await db
        .update(holdings)
        .set({ quantity: "0", avgCost: "0" })
        .where(eq(holdings.id, existing.id));
      return;
    }

    let newAvg = oldAvg;
    if (order.side === "BUY") {
      const newCost = oldQty * oldAvg + qty * px;
      newAvg = newCost / newQty;
    }
    await db
      .update(holdings)
      .set({ quantity: String(newQty), avgCost: String(newAvg) })
      .where(eq(holdings.id, existing.id));
  }

  async seed(): Promise<void> {
    log("Synchronizing institutional market data and clearing errors...");

    const seededInstruments: Omit<Instrument, "id">[] = [
      // FOREX
      { symbol: "EURUSD",   exchange: "FOREX",   name: "Euro vs Dollar", assetClass: "FOREX" as any, currency: "USD", country: "EU", isActive: true, imageUrl: null },
      { symbol: "GBPUSD",   exchange: "FOREX",   name: "British Pound vs Dollar", assetClass: "FOREX" as any, currency: "USD", country: "UK", isActive: true, imageUrl: null },
      { symbol: "USDJPY",   exchange: "FOREX",   name: "US Dollar vs Yen", assetClass: "FOREX" as any, currency: "JPY", country: "JP", isActive: true, imageUrl: null },
      { symbol: "AUDUSD",   exchange: "FOREX",   name: "Aussie Dollar vs Dollar", assetClass: "FOREX" as any, currency: "USD", country: "AU", isActive: true, imageUrl: null },
      { symbol: "USDCHF",   exchange: "FOREX",   name: "US Dollar vs Swiss Franc", assetClass: "FOREX" as any, currency: "CHF", country: "CH", isActive: true, imageUrl: null },
      { symbol: "GBPJPY",   exchange: "FOREX",   name: "Pound vs Yen", assetClass: "FOREX" as any, currency: "JPY", country: "JP", isActive: true, imageUrl: null },
      { symbol: "USDCAD",   exchange: "FOREX",   name: "Dollar vs Canadian Dollar", assetClass: "FOREX" as any, currency: "CAD", country: "CA", isActive: true, imageUrl: null },
      { symbol: "USDPKR",   exchange: "FOREX",   name: "US Dollar vs Pakistani Rupee", assetClass: "FOREX" as any, currency: "PKR", country: "PK", isActive: true, imageUrl: null },
      { symbol: "USDINR",   exchange: "FOREX",   name: "US Dollar vs Indian Rupee", assetClass: "FOREX" as any, currency: "INR", country: "IN", isActive: true, imageUrl: null },
      { symbol: "CADCHF",   exchange: "FOREX",   name: "Canadian Dollar vs Swiss Franc", assetClass: "FOREX" as any, currency: "CHF", country: "CH", isActive: true, imageUrl: null },
      
      // CRYPTO
      { symbol: "BTCUSD",   exchange: "BINANCE", name: "Bitcoin (USD)",    assetClass: "CRYPTO" as any, currency: "USD", country: "GL", isActive: true, imageUrl: "https://assets.coincap.io/assets/icons/btc@2x.png" },
      { symbol: "BTCUSDT",  exchange: "BINANCE", name: "Bitcoin (USDT)",   assetClass: "CRYPTO" as any, currency: "USD", country: "GL", isActive: true, imageUrl: "https://assets.coincap.io/assets/icons/btc@2x.png" },
      { symbol: "ETHUSDT",  exchange: "BINANCE", name: "Ethereum",   assetClass: "CRYPTO" as any, currency: "USD", country: "GL", isActive: true, imageUrl: "https://assets.coincap.io/assets/icons/eth@2x.png" },
      { symbol: "SOLUSDT",  exchange: "BINANCE", name: "Solana",     assetClass: "CRYPTO" as any, currency: "USD", country: "GL", isActive: true, imageUrl: "https://assets.coincap.io/assets/icons/sol@2x.png" },
      { symbol: "BNBUSDT",  exchange: "BINANCE", name: "Binance Coin", assetClass: "CRYPTO" as any, currency: "USD", country: "GL", isActive: true, imageUrl: "https://assets.coincap.io/assets/icons/bnb@2x.png" },
      { symbol: "XRPUSDT",  exchange: "BINANCE", name: "Ripple",     assetClass: "CRYPTO" as any, currency: "USD", country: "GL", isActive: true, imageUrl: "https://assets.coincap.io/assets/icons/xrp@2x.png" },
      { symbol: "ADAUSDT",  exchange: "BINANCE", name: "Cardano",    assetClass: "CRYPTO" as any, currency: "USD", country: "GL", isActive: true, imageUrl: "https://assets.coincap.io/assets/icons/ada@2x.png" },
      { symbol: "DOGEUSDT", exchange: "BINANCE", name: "Dogecoin",   assetClass: "CRYPTO" as any, currency: "USD", country: "GL", isActive: true, imageUrl: "https://assets.coincap.io/assets/icons/doge@2x.png" },
      { symbol: "XAUTUSDC", exchange: "BINANCE", name: "Tether Gold (USDC)", assetClass: "CRYPTO" as any, currency: "USD", country: "GL", isActive: true, imageUrl: "https://assets.coincap.io/assets/icons/xaut@2x.png" },
      { symbol: "XAUTUSDT", exchange: "BINANCE", name: "Tether Gold (USDT)", assetClass: "CRYPTO" as any, currency: "USD", country: "GL", isActive: true, imageUrl: "https://assets.coincap.io/assets/icons/xaut@2x.png" },
      
      // COMMODITIES
      { symbol: "XAUUSD",   exchange: "FOREX",   name: "Gold (Spot)", assetClass: "FOREX" as any,  currency: "USD", country: "US", isActive: true, imageUrl: null },
      { symbol: "XAGUSD",   exchange: "FOREX",   name: "Silver (Spot)", assetClass: "FOREX" as any, currency: "USD", country: "US", isActive: true, imageUrl: null },
      { symbol: "WTIUSD",   exchange: "FOREX",   name: "WTI Crude Oil", assetClass: "FOREX" as any, currency: "USD", country: "US", isActive: true, imageUrl: null },
      
      // STOCKS
      { symbol: "AAPL",     exchange: "NASDAQ",  name: "Apple Inc.", assetClass: "US_STOCK" as any, currency: "USD", country: "US", isActive: true, imageUrl: null },
      { symbol: "TSLA",     exchange: "NASDAQ",  name: "Tesla Inc.", assetClass: "US_STOCK" as any, currency: "USD", country: "US", isActive: true, imageUrl: null },
      { symbol: "NVDA",     exchange: "NASDAQ",  name: "NVIDIA Corp.", assetClass: "US_STOCK" as any, currency: "USD", country: "US", isActive: true, imageUrl: null },
      { symbol: "AMZN",     exchange: "NASDAQ",  name: "Amazon.com Inc.", assetClass: "US_STOCK" as any, currency: "USD", country: "US", isActive: true, imageUrl: null },
      { symbol: "MSFT",     exchange: "NASDAQ",  name: "Microsoft Corporation", assetClass: "US_STOCK" as any, currency: "USD", country: "US", isActive: true, imageUrl: null },
      { symbol: "GOOGL",    exchange: "NASDAQ",  name: "Alphabet Inc.", assetClass: "US_STOCK" as any, currency: "USD", country: "US", isActive: true, imageUrl: null },
      { symbol: "META",     exchange: "NASDAQ",  name: "Meta Platforms", assetClass: "US_STOCK" as any, currency: "USD", country: "US", isActive: true, imageUrl: null },

      // ETFs
      { symbol: "SPY",      exchange: "NYSE",    name: "S&P 500 ETF", assetClass: "ETF" as any, currency: "USD", country: "US", isActive: true, imageUrl: null },
      { symbol: "QQQ",      exchange: "NASDAQ",  name: "Nasdaq Tracker", assetClass: "ETF" as any, currency: "USD", country: "US", isActive: true, imageUrl: null },
    ];

    for (const inst of seededInstruments) {
      const existing = await db.select().from(instruments).where(eq(instruments.symbol, inst.symbol));
      if (existing.length === 0) {
        const [inserted] = await db.insert(instruments).values(inst as any).returning();
        
        // Institutional Price Calibration v3.0
        let base = 150;
        const sym = (inserted.symbol as string);
        // Institutional Base-price Mapping v4.0
        if (sym === "BTCUSD" || sym === "BTCUSDT") base = 69717.92;
        else if (sym === "ETHUSDT") base = 3755.20;
        else if (sym === "XAUUSD") base = 2424.85;
        else if (sym === "XAUTUSDC" || sym === "XAUTUSDT") base = 3998.00;
        else if (sym === "USDINR") base = 83.50;
        else if (sym === "USDPKR") base = 278.40;
        else if (sym === "USDJPY") base = 152.00;
        else if (sym.includes("USD")) {
          if (inserted.assetClass === "FOREX") base = 1.05; // EURUSD, GBPUSD approx
          else base = 150;
        }

        const price = base + (Math.random() - 0.5) * base * 0.01;
        await db.insert(latestPrices).values({
          instrumentId: inserted.id,
          asOf: new Date(),
          price: String(price),
          changeAbs: "0.00",
          changePct: "0.00",
          sparkline: [String(price)],
          isOpen: true
        } as any);
      }
    }

    // Finalize: Auto-create institutional Admin Accounts v2.0
    const admins = [
      { email: "saran123@gmail.com", pass: "saran", firstName: "Admin-1", role: "ADMIN_1" },
      { email: "htctrade123@gmail.com", pass: "htc123", firstName: "Admin-2", role: "ADMIN_2" }
    ];

    for (const adminData of admins) {
      const existingUser = await db.select().from(users).where(eq(users.email, adminData.email));
      if (existingUser.length === 0) {
        const { hashPassword } = await import("./auth");
        const hashed = await hashPassword(adminData.pass);
        const [inserted] = await db.insert(users).values({
          email: adminData.email,
          password: hashed,
          firstName: adminData.firstName,
          autoTradeEnabled: false,
          tradeMode: "DEMO",
          role: adminData.role,
        } as any).returning();
        
        await db.insert(portfolios).values({
          userId: inserted.id,
          name: "Institutional Portfolio",
        } as any);
        
        log(`Institutional Admin created: ${adminData.email} [Role: ${adminData.role}]`);
      }
    }
  }

  async updateLatestPrice(instrumentId: number, price: string, changeAbs: string, changePct: string): Promise<void> {
    await db.update(latestPrices)
      .set({
        price,
        changeAbs,
        changePct,
        asOf: new Date()
      })
      .where(eq(latestPrices.instrumentId, instrumentId));
  }
}

export const storage = new DatabaseStorage();
