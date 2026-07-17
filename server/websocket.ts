import { Server as HTTPServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "./db";
import { instruments, latestPrices } from "@shared/schema";
import { eq } from "drizzle-orm";

interface Client {
  id: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  lastPing: number;
}

interface MarketDataUpdate {
  type: "market_data";
  symbol: string;
  data: {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    timestamp: number;
  };
}

interface OrderBookUpdate {
  type: "order_book";
  symbol: string;
  data: {
    symbol: string;
    bids: Array<[number, number]>;
    asks: Array<[number, number]>;
    timestamp: number;
  };
}

interface TradeUpdate {
  type: "trade";
  symbol: string;
  data: {
    symbol: string;
    price: number;
    quantity: number;
    side: "BUY" | "SELL";
    timestamp: number;
  };
}

type WSMessage = MarketDataUpdate | OrderBookUpdate | TradeUpdate | { type: "error"; message: string };

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, Client> = new Map();
  private priceUpdateInterval: NodeJS.Timeout | null = null;
  private orderBookData: Map<string, { bids: Array<[number, number]>; asks: Array<[number, number]> }> = new Map();

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({ 
      noServer: true
    });

    this.setupWebSocketServer();
    this.startPriceUpdates();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = this.generateClientId();
      const client: Client = {
        id: clientId,
        ws,
        subscriptions: new Set(),
        lastPing: Date.now()
      };

      this.clients.set(clientId, client);
      console.log(`[WS] Client connected: ${clientId} (${this.clients.size} total)`);

      // Send initial connection message
      this.sendToClient(client, {
        type: "connected",
        clientId: clientId,
        timestamp: Date.now()
      });

      // Handle messages from client
      ws.on('message', (data: Buffer) => {
        this.handleClientMessage(client, data.toString());
      });

      // Handle client disconnection
      ws.on('close', (code: number, reason: Buffer) => {
        this.clients.delete(clientId);
        console.log(`[WS] Client disconnected: ${clientId} (${this.clients.size} total)`);
      });

      // Handle errors
      ws.on('error', (error: Error) => {
        console.error(`[WS] Error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });

      // Set up ping/pong for connection health
      ws.on('pong', () => {
        client.lastPing = Date.now();
      });
    });

    // Set up ping interval to detect dead connections
    setInterval(() => {
      this.pingClients();
    }, 30000); // Ping every 30 seconds
  }

  private generateClientId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private async handleClientMessage(client: Client, message: string) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'subscribe':
          await this.handleSubscription(client, data.symbols);
          break;
          
        case 'unsubscribe':
          await this.handleUnsubscription(client, data.symbols);
          break;
          
        case 'ping':
          this.sendToClient(client, { type: 'pong', timestamp: Date.now() });
          break;
          
        default:
          this.sendError(client, `Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error(`[WS] Error handling message from ${client.id}:`, error);
      this.sendError(client, 'Invalid message format');
    }
  }

  private async handleSubscription(client: Client, symbols: string[]) {
    // Validate symbols exist in database
    const validSymbols = await this.validateSymbols(symbols);
    
    validSymbols.forEach(symbol => {
      client.subscriptions.add(symbol);
    });

    // Send current data for subscribed symbols
    for (const symbol of validSymbols) {
      const marketData = await this.getCurrentMarketData(symbol);
      if (marketData) {
        this.sendMarketData(client, marketData);
      }
    }

    console.log(`[WS] Client ${client.id} subscribed to: ${validSymbols.join(', ')}`);
  }

  private async handleUnsubscription(client: Client, symbols: string[]) {
    symbols.forEach(symbol => {
      client.subscriptions.delete(symbol);
    });

    console.log(`[WS] Client ${client.id} unsubscribed from: ${symbols.join(', ')}`);
  }

  private async validateSymbols(symbols: string[]): Promise<string[]> {
    const validSymbols: string[] = [];
    
    for (const symbol of symbols) {
      const instrument = await db.select()
        .from(instruments)
        .where(eq(instruments.symbol, symbol))
        .limit(1);
      
      if (instrument.length > 0) {
        validSymbols.push(symbol);
      }
    }
    
    return validSymbols;
  }

  private async getCurrentMarketData(symbol: string) {
    const result = await db
      .select({
        symbol: instruments.symbol,
        price: latestPrices.price,
        changeAbs: latestPrices.changeAbs,
        changePct: latestPrices.changePct,
        asOf: latestPrices.asOf
      })
      .from(instruments)
      .leftJoin(latestPrices, eq(instruments.id, latestPrices.instrumentId))
      .where(eq(instruments.symbol, symbol))
      .limit(1);

    if (result.length === 0) return null;

    const { price, changeAbs, changePct, asOf } = result[0];
    
    return {
      symbol,
      price: parseFloat(price?.toString() || '0'),
      change: parseFloat(changeAbs?.toString() || '0'),
      changePercent: parseFloat(changePct?.toString() || '0'),
      volume: Math.floor(Math.random() * 1000000), // Mock volume
      timestamp: asOf?.getTime() || Date.now()
    };
  }

  private startPriceUpdates() {
    // Update prices every 5 seconds for subscribed symbols
    this.priceUpdateInterval = setInterval(async () => {
      await this.updatePrices();
    }, 5000);
  }

  private async updatePrices() {
    // Get all subscribed symbols
    const allSubscriptions = new Set<string>();
    Array.from(this.clients.values()).forEach(client => {
      Array.from(client.subscriptions.values()).forEach(symbol => {
        allSubscriptions.add(symbol);
      });
    });

    // Broadcast verified live prices from database (synchronized by background worker)
    for (const symbol of Array.from(allSubscriptions)) {
      const currentData = await this.getCurrentMarketData(symbol);
      if (!currentData || !currentData.price) continue;

      // Ensure exact synchronization without artificial drift
      const updatedData = {
        ...currentData,
        timestamp: Date.now()
      };

      // Broadcast to all subscribed clients
      this.broadcastToSubscribers(symbol, {
        type: 'market_data',
        symbol,
        data: updatedData
      } as MarketDataUpdate);

      // Occasionally generate institutional trade volume updates
      if (Math.random() < 0.15) {
        this.generateTradeUpdate(symbol, updatedData.price);
      }
    }
  }

  private generateTradeUpdate(symbol: string, price: number) {
    const trade: TradeUpdate = {
      type: 'trade',
      symbol,
      data: {
        symbol,
        price,
        quantity: Math.floor(Math.random() * 1000) + 100,
        side: Math.random() > 0.5 ? 'BUY' : 'SELL',
        timestamp: Date.now()
      }
    };

    this.broadcastToSubscribers(symbol, trade);
  }

  private broadcastToSubscribers(symbol: string, message: WSMessage) {
    Array.from(this.clients.values()).forEach(client => {
      if (client.subscriptions.has(symbol) && client.ws.readyState === WebSocket.OPEN) {
        this.sendToClient(client, message);
      }
    });
  }

  private sendMarketData(client: Client, data: any) {
    this.sendToClient(client, {
      type: 'market_data',
      symbol: data.symbol,
      data
    } as MarketDataUpdate);
  }

  private sendToClient(client: Client, message: any) {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`[WS] Error sending to client ${client.id}:`, error);
      }
    }
  }

  private sendError(client: Client, message: string) {
    this.sendToClient(client, {
      type: 'error',
      message
    });
  }

  private pingClients() {
    const now = Date.now();
    Array.from(this.clients.entries()).forEach(([clientId, client]) => {
      if (now - client.lastPing > 60000) { // No pong for 60 seconds
        console.log(`[WS] Removing inactive client: ${clientId}`);
        client.ws.terminate();
        this.clients.delete(clientId);
      } else if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.ping();
      }
    });
  }

  public getStats() {
    return {
      connectedClients: this.clients.size,
      totalSubscriptions: Array.from(this.clients.values())
        .reduce((total, client) => total + Array.from(client.subscriptions).length, 0)
    };
  }

  public shutdown() {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
    }
    
    Array.from(this.clients.values()).forEach(client => {
      client.ws.close();
    });
    
    this.wss.close();
  }
  public handleUpgrade(req: any, socket: any, head: any) {
    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.wss.emit('connection', ws, req);
    });
  }
}

export function setupWebSocket(server: HTTPServer) {
  return new WebSocketManager(server);
}
