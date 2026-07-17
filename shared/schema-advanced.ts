import { pgEnum, pgTable, serial, text, timestamp, varchar, numeric } from "drizzle-orm/pg-core";

// Advanced order types for professional trading
export const advancedOrderTypeEnum = pgEnum("advanced_order_type", [
  "MARKET",
  "LIMIT", 
  "STOP_LOSS",
  "STOP_LIMIT",
  "TRAILING_STOP",
  "TAKE_PROFIT",
  "ICEBERG",
  "ALGO"
]);

export const orderTimeInForceEnum = pgEnum("time_in_force", [
  "GTC", // Good Till Cancelled
  "IOC", // Immediate Or Cancel
  "FOK", // Fill Or Kill
  "DAY"  // Day Order
]);

export const advancedOrders = pgTable("advanced_orders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  portfolioId: serial("portfolio_id").notNull(),
  instrumentId: serial("instrument_id").notNull(),
  side: varchar("side", { length: 4 }).notNull(), // BUY/SELL
  type: advancedOrderTypeEnum("type").notNull(),
  timeInForce: orderTimeInForceEnum("time_in_force").notNull().default("GTC"),
  
  // Order pricing
  limitPrice: numeric("limit_price", { precision: 18, scale: 6 }),
  stopPrice: numeric("stop_price", { precision: 18, scale: 6 }),
  takeProfitPrice: numeric("take_profit_price", { precision: 18, scale: 6 }),
  trailingAmount: numeric("trailing_amount", { precision: 18, scale: 6 }),
  trailingPercent: numeric("trailing_percent", { precision: 5, scale: 2 }),
  
  // Order quantities
  totalQuantity: numeric("total_quantity", { precision: 18, scale: 6 }).notNull(),
  filledQuantity: numeric("filled_quantity", { precision: 18, scale: 6 }).notNull().default("0"),
  remainingQuantity: numeric("remaining_quantity", { precision: 18, scale: 6 }).notNull(),
  
  // Algo parameters
  algoStrategy: varchar("algo_strategy", { length: 50 }),
  algoParams: text("algo_params"), // JSON string
  
  // Status and timestamps
  status: varchar("status", { length: 20 }).notNull().default("PENDING"),
  reason: text("reason"), // Rejection reason
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  activatedAt: timestamp("activated_at"),
  filledAt: timestamp("filled_at"),
  cancelledAt: timestamp("cancelled_at"),
});

// Order execution logs for audit trail
export const orderExecutionLogs = pgTable("order_execution_logs", {
  id: serial("id").primaryKey(),
  orderId: serial("order_id").notNull(),
  executionId: varchar("execution_id", { length: 100 }).notNull(),
  quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull(),
  price: numeric("price", { precision: 18, scale: 6 }).notNull(),
  commission: numeric("commission", { precision: 18, scale: 6 }).notNull().default("0"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  venue: varchar("venue", { length: 50 }), // Exchange/venue
  liquidity: varchar("liquidity", { length: 20 }), // MAKER/TAKER
});

// Position tracking for margin trading
export const positions = pgTable("positions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  portfolioId: serial("portfolio_id").notNull(),
  instrumentId: serial("instrument_id").notNull(),
  
  // Position details
  side: varchar("side", { length: 4 }).notNull(), // LONG/SHORT
  quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull(),
  avgPrice: numeric("avg_price", { precision: 18, scale: 6 }).notNull(),
  currentPrice: numeric("current_price", { precision: 18, scale: 6 }),
  
  // P&L calculations
  unrealizedPnl: numeric("unrealized_pnl", { precision: 18, scale: 2 }).notNull().default("0"),
  realizedPnl: numeric("realized_pnl", { precision: 18, scale: 2 }).notNull().default("0"),
  totalPnl: numeric("total_pnl", { precision: 18, scale: 2 }).notNull().default("0"),
  
  // Margin
  marginUsed: numeric("margin_used", { precision: 18, scale: 2 }).notNull().default("0"),
  marginRequirement: numeric("margin_requirement", { precision: 18, scale: 2 }).notNull().default("0"),
  
  // Timestamps
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
});

// Risk management settings per user
export const riskSettings = pgTable("risk_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().unique(),
  
  // Position limits
  maxPositionSize: numeric("max_position_size", { precision: 18, scale: 2 }).notNull().default("10000"),
  maxPositionsPerInstrument: numeric("max_positions_per_instrument", { precision: 10, scale: 0 }).notNull().default("1"),
  maxTotalPositions: numeric("max_total_positions", { precision: 10, scale: 0 }).notNull().default("20"),
  
  // Loss limits
  maxDailyLoss: numeric("max_daily_loss", { precision: 18, scale: 2 }).notNull().default("1000"),
  maxTotalLoss: numeric("max_total_loss", { precision: 18, scale: 2 }).notNull().default("5000"),
  
  // Leverage
  maxLeverage: numeric("max_leverage", { precision: 5, scale: 2 }).notNull().default("2.0"),
  
  // Auto-close settings
  autoStopLoss: numeric("auto_stop_loss", { precision: 5, scale: 2 }).notNull().default("0.05"),
  autoTakeProfit: numeric("auto_take_profit", { precision: 5, scale: 2 }).notNull().default("0.10"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
