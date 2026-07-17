import { useMemo } from "react";

// ── Symbol mapping: internal → TradingView ────────────────────────────────
const TV_SYMBOL: Record<string, string> = {
  // Crypto (Binance)
  BTCUSD:   "BINANCE:BTCUSDT",
  BTCUSDT:  "BINANCE:BTCUSDT",
  ETHUSDT:  "BINANCE:ETHUSDT",
  BNBUSDT:  "BINANCE:BNBUSDT",
  SOLUSDT:  "BINANCE:SOLUSDT",
  XRPUSDT:  "BINANCE:XRPUSDT",
  ADAUSDT:  "BINANCE:ADAUSDT",
  DOGEUSDT: "BINANCE:DOGEUSDT",
  DOTUSDT:  "BINANCE:DOTUSDT",
  AVAXUSDT: "BINANCE:AVAXUSDT",
  MATICUSDT:"BINANCE:MATICUSDT",
  LTCUSDT:  "BINANCE:LTCUSDT",
  LINKUSDT: "BINANCE:LINKUSDT",
  UNIUSDT:  "BINANCE:UNIUSDT",
  ATOMUSDT: "BINANCE:ATOMUSDT",
  TRXUSDT:  "BINANCE:TRXUSDT",
  SHIBUSDT: "BINANCE:SHIBUSDT",
  PEPEUSDT: "BINANCE:PEPEUSDT",
  NEARUSDT: "BINANCE:NEARUSDT",
  // Metals & Commodities
  XAUUSD:   "TVC:GOLD",
  XAGUSD:   "TVC:SILVER",
  WTIUSD:   "TVC:USOIL",
  BRENTUSD: "TVC:UKOIL",
  // Forex
  EURUSD:   "FX:EURUSD",
  GBPUSD:   "FX:GBPUSD",
  USDJPY:   "FX:USDJPY",
  USDCHF:   "FX:USDCHF",
  AUDUSD:   "FX:AUDUSD",
  NZDUSD:   "FX:NZDUSD",
  USDCAD:   "FX:USDCAD",
  EURJPY:   "FX:EURJPY",
  GBPJPY:   "FX:GBPJPY",
  EURGBP:   "FX:EURGBP",
  EURAUD:   "FX:EURAUD",
  GBPAUD:   "FX:GBPAUD",
  // Stocks
  AAPL:     "NASDAQ:AAPL",
  GOOGL:    "NASDAQ:GOOGL",
  MSFT:     "NASDAQ:MSFT",
  AMZN:     "NASDAQ:AMZN",
  TSLA:     "NASDAQ:TSLA",
  META:     "NASDAQ:META",
  NVDA:     "NASDAQ:NVDA",
  NFLX:     "NASDAQ:NFLX",
};

// ── Timeframe mapping: internal → TradingView interval ────────────────────
const TV_INTERVAL: Record<string, string> = {
  "1m":  "1",
  "2m":  "2",
  "3m":  "3",
  "5m":  "5",
  "15m": "15",
  "30m": "30",
  "1H":  "60",
  "4H":  "240",
  "1D":  "D",
  "1W":  "W",
  "1M":  "M",
};

interface TradingViewChartProps {
  symbol: string;
  timeframe?: string;
  height?: number | string;
}

export default function TradingViewChart({
  symbol,
  timeframe = "1m",
  height = "100%",
}: TradingViewChartProps) {
  // Build iframe URL from TradingView widgetembed
  const iframeSrc = useMemo(() => {
    const tvSym      = TV_SYMBOL[symbol] ?? `BINANCE:${symbol}`;
    const tvInterval = TV_INTERVAL[timeframe] ?? "1";

    const params = new URLSearchParams({
      frameElementId:   `tv_chart_${symbol}`,
      symbol:           tvSym,
      interval:         tvInterval,
      theme:            "dark",
      style:            "1",          // 1 = Candles
      locale:           "en",
      toolbar_bg:       "#0B1120",
      backgroundColor:  "#0B1120",
      gridColor:        "rgba(255,255,255,0.04)",
      hide_top_toolbar: "0",
      hide_legend:      "0",
      hide_side_toolbar:"1",
      allow_symbol_change: "0",
      save_image:       "0",
      withdateranges:   "0",
      hide_volume:      "0",
      details:          "0",
      hotlist:          "0",
      calendar:         "0",
      studies:          "[]",
      watchlist:        "[]",
    });

    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }, [symbol, timeframe]);

  return (
    <div
      style={{ width: "100%", height, minHeight: 0, position: "relative" }}
    >
      <iframe
        id={`tv_chart_${symbol}`}
        src={iframeSrc}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
          backgroundColor: "#0B1120",
        }}
        allowFullScreen
        allow="fullscreen"
        title="Live Market Chart"
        loading="eager"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
