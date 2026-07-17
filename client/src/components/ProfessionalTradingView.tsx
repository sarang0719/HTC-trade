import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Settings
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface MarketOverview {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  activePositions: number;
  totalPnL: number;
  winRate: number;
  totalTrades: number;
}

interface Position {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

interface MarketSentiment {
  fearGreed: number;
  volatilityIndex: number;
  marketMood: "BULLISH" | "BEARISH" | "NEUTRAL";
}

export default function ProfessionalTradingView() {
  const [marketOverview, setMarketOverview] = useState<MarketOverview | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [sentiment, setSentiment] = useState<MarketSentiment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate data fetching
    const fetchData = async () => {
      setLoading(true);
      try {
        // Mock data - replace with actual API calls
        setMarketOverview({
          totalValue: 125430.50,
          dayChange: 2340.80,
          dayChangePercent: 1.91,
          activePositions: 8,
          totalPnL: 5420.30,
          winRate: 68.5,
          totalTrades: 147
        });

        setPositions([
          {
            id: "1",
            symbol: "AAPL",
            side: "LONG",
            quantity: 100,
            entryPrice: 175.20,
            currentPrice: 178.45,
            pnl: 325.00,
            pnlPercent: 1.86
          },
          {
            id: "2", 
            symbol: "TSLA",
            side: "SHORT",
            quantity: 50,
            entryPrice: 245.80,
            currentPrice: 242.15,
            pnl: 182.50,
            pnlPercent: 1.48
          }
        ]);

        setSentiment({
          fearGreed: 65,
          volatilityIndex: 18.5,
          marketMood: "BULLISH"
        });
      } catch (error) {
        console.error("Failed to fetch trading data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${marketOverview?.totalValue.toLocaleString()}</div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              {marketOverview?.dayChange && marketOverview.dayChange > 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-500" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500" />
              )}
              <span className={marketOverview?.dayChange && marketOverview.dayChange > 0 ? "text-green-500" : "text-red-500"}>
                {marketOverview?.dayChangePercent?.toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marketOverview?.activePositions}</div>
            <p className="text-xs text-muted-foreground">
              Total P&L: <span className={marketOverview?.totalPnL && marketOverview.totalPnL > 0 ? "text-green-500" : "text-red-500"}>
                ${marketOverview?.totalPnL?.toLocaleString()}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marketOverview?.winRate?.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {marketOverview?.totalTrades} total trades
            </p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Market Sentiment</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sentiment?.marketMood}</div>
            <p className="text-xs text-muted-foreground">
              Fear & Greed: {sentiment?.fearGreed}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Trading Interface */}
      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="risk">Risk Management</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Active Positions</CardTitle>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {positions.map((position) => (
                  <div key={position.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-semibold">{position.symbol}</p>
                        <p className="text-sm text-muted-foreground">{position.side}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm">{position.quantity} @ ${position.entryPrice}</p>
                        <p className="text-xs text-muted-foreground">Entry Price</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm">${position.currentPrice}</p>
                      <p className="text-xs text-muted-foreground">Current Price</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${position.pnl > 0 ? "text-green-500" : "text-red-500"}`}>
                        ${position.pnl.toFixed(2)}
                      </p>
                      <p className={`text-xs ${position.pnlPercent > 0 ? "text-green-500" : "text-red-500"}`}>
                        {position.pnlPercent.toFixed(2)}%
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">Close</Button>
                      <Button variant="outline" size="sm">Modify</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Order Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active orders</p>
                <Button className="mt-4">Place New Order</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Market Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Technical Indicators</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>RSI (14)</span>
                      <span className="font-mono">65.4</span>
                    </div>
                    <div className="flex justify-between">
                      <span>MACD</span>
                      <span className="font-mono text-green-500">Bullish</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Moving Average (50)</span>
                      <span className="font-mono">178.2</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Market Overview</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Volatility Index</span>
                      <span className="font-mono">{sentiment?.volatilityIndex}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Market Cap</span>
                      <span className="font-mono">$2.8T</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Volume 24h</span>
                      <span className="font-mono">$124.5B</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Risk Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Position Limits</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Max Position Size</span>
                        <span className="font-mono">$10,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Daily Loss</span>
                        <span className="font-mono">$1,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Leverage</span>
                        <span className="font-mono">2:1</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Current Risk</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Exposure</span>
                        <span className="font-mono">$45,230</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Margin Used</span>
                        <span className="font-mono">$12,615</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Risk Score</span>
                        <Badge variant="secondary">Medium</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
