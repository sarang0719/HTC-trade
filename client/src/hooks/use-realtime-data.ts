import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
}

interface OrderBookData {
  symbol: string;
  bids: Array<[number, number]>;
  asks: Array<[number, number]>;
  timestamp: number;
}

interface TradeData {
  symbol: string;
  price: number;
  quantity: number;
  side: "BUY" | "SELL";
  timestamp: number;
}

export function useRealtimeMarketData(symbols: string[]) {
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [orderBook, setOrderBook] = useState<Record<string, OrderBookData>>({});
  const [recentTrades, setRecentTrades] = useState<Record<string, TradeData[]>>({});
  const wsRef = useRef<WebSocket | null>(null);

  const connectWebSocket = useCallback(() => {
    const wsUrl = process.env.NODE_ENV === "production" 
      ? `wss://api.trading-platform.com/ws`
      : `ws://localhost:3000/ws`;

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log("WebSocket connected");
      // Subscribe to symbols
      wsRef.current?.send(JSON.stringify({
        type: "subscribe",
        symbols: symbols
      }));
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case "market_data":
            setMarketData(prev => ({
              ...prev,
              [data.symbol]: data.data
            }));
            break;
            
          case "order_book":
            setOrderBook(prev => ({
              ...prev,
              [data.symbol]: data.data
            }));
            break;
            
          case "trade":
            setRecentTrades(prev => ({
              ...prev,
              [data.symbol]: [
                data.data,
                ...(prev[data.symbol] || []).slice(0, 49) // Keep last 50 trades
              ]
            }));
            break;
            
          case "error":
            console.error("WebSocket error:", data.message);
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    wsRef.current.onclose = () => {
      console.log("WebSocket disconnected");
      // Attempt to reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000);
    };
  }, [symbols]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  return {
    marketData,
    orderBook,
    recentTrades,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  };
}

export function useMarketData(symbol: string) {
  const { data: staticData } = useQuery({
    queryKey: ["market-data", symbol],
    queryFn: async () => {
      const response = await fetch(`/api/instruments/${symbol}/data`);
      if (!response.ok) throw new Error("Failed to fetch market data");
      return response.json();
    },
    refetchInterval: 30000, // Refresh static data every 30 seconds
  });

  const { marketData, isConnected } = useRealtimeMarketData([symbol]);

  return {
    ...staticData,
    realTimeData: marketData[symbol],
    isConnected
  };
}

export function useOrderBook(symbol: string) {
  const { orderBook, isConnected } = useRealtimeMarketData([symbol]);
  
  return {
    orderBook: orderBook[symbol],
    isConnected
  };
}

export function useRecentTrades(symbol: string) {
  const { recentTrades, isConnected } = useRealtimeMarketData([symbol]);
  
  return {
    trades: recentTrades[symbol] || [],
    isConnected
  };
}
