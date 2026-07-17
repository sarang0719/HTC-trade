import { useEffect, useState, useRef } from "react";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { calculatePnL } from "@/lib/pnl";

interface QuotexOverlayProps {
  chartRef: React.MutableRefObject<IChartApi | null>;
  seriesRef: React.MutableRefObject<ISeriesApi<"Candlestick" | "Bar" | "Area" | "Line" | "Baseline"> | null>;
  activeTrades: any[]; 
  livePrice: number | null;
}

export default function QuotexOverlay({ chartRef, seriesRef, activeTrades, livePrice }: QuotexOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Map<number, { entryY: number; currentX: number; expiryX: number }>>(new Map());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!chartRef.current || !seriesRef.current || activeTrades.length === 0) {
      setPositions(new Map());
      return;
    }

    let rafId: number;
    let isActive = true;

    const loop = () => {
      if (!isActive || !containerRef.current || !chartRef.current || !seriesRef.current) return;
      
      const chart = chartRef.current;
      const series = seriesRef.current;
      const ts = chart.timeScale();
      const currentNow = Date.now();
      setNow(currentNow);

      const newPos = new Map();
      const data = series.data();

      // Math needed to extrapolate future X coordinates perfectly
      let pxPerSecond = 0;
      let lastTimeMs = 0;
      let lastX = 0;

      if (data && data.length > 1) {
         const lastP = data[data.length - 1] as any;
         const prevP = data[data.length - 2] as any;
         
         const x1 = ts.timeToCoordinate(prevP.time);
         const x2 = ts.timeToCoordinate(lastP.time);
         
         if (x1 !== null && x2 !== null) {
            const timeDiff = Number(lastP.time) - Number(prevP.time);
            if (timeDiff > 0) {
               pxPerSecond = (x2 - x1) / timeDiff;
               lastTimeMs = Number(lastP.time) * 1000;
               lastX = x2;
            }
         }
      }

      for (const trade of activeTrades) {
         const strikePrice = parseFloat(trade.strikePrice);
         // 1. Entry Y
         const entryY = series.priceToCoordinate(strikePrice);
         if (entryY === null) continue; // Off screen horizontally (can still exist in DOM if outside, handled by overflow-hidden)

         // 2. Current X (Real-time tracking dot)
         let currentX = 0;
         const nowUnixMs = currentNow;

         // Try to use native lightweight charts bounds first
         const coordNow = ts.timeToCoordinate(Math.floor(nowUnixMs/1000) as UTCTimestamp);
         if (coordNow !== null) {
            currentX = coordNow;
         } else if (nowUnixMs > lastTimeMs && pxPerSecond > 0) {
            // Extrapolate future position past latest visible candle
            const diffSeconds = (nowUnixMs - lastTimeMs) / 1000;
            currentX = lastX + (diffSeconds * pxPerSecond);
         } else {
            // Fallback safety (keep at last known candle basically)
            currentX = lastX;
         }

         // 3. Expiry X (Vertical line)
         const expiresAtMs = new Date(trade.expiresAt).getTime();
         let expiryX = 0;
         const coordExp = ts.timeToCoordinate(Math.floor(expiresAtMs/1000) as UTCTimestamp);
         
         if (coordExp !== null) {
            expiryX = coordExp;
         } else if (expiresAtMs > lastTimeMs && pxPerSecond > 0) {
            const diffSeconds = (expiresAtMs - lastTimeMs) / 1000;
            expiryX = lastX + (diffSeconds * pxPerSecond);
         } else {
            expiryX = lastX + 100; // Arbitrary forward point if math fails completely
         }

         newPos.set(trade.id, { entryY, currentX, expiryX });
      }

      setPositions(newPos);
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    
    // Auto-update instantly during chart pan / zoom
    const tfChange = () => { if (isActive) loop(); };
    chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(tfChange);
    chartRef.current.timeScale().subscribeSizeChange(tfChange);

    return () => {
      isActive = false;
      cancelAnimationFrame(rafId);
      if (chartRef.current) {
        chartRef.current.timeScale().unsubscribeVisibleLogicalRangeChange(tfChange);
        chartRef.current.timeScale().unsubscribeSizeChange(tfChange);
      }
    };
  }, [activeTrades, chartRef, seriesRef]);

  if (activeTrades.length === 0) return null;

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden z-[10]">
      {activeTrades.map(trade => {
         const pos = positions.get(trade.id);
         if (!pos) return null;

         const expiresAt = new Date(trade.expiresAt).getTime();
         const msLeft = expiresAt - now;
         
         const secLeft = Math.max(0, Math.ceil(msLeft / 1000));
         const isExpired = secLeft === 0;

         const side = trade.side as "BUY" | "SELL";
         const currentPx = livePrice ?? parseFloat(trade.strikePrice);
         
         // Use the newly implemented exact logic from the user
         const { isWin, pnl: profitAmount } = calculatePnL(trade, currentPx);

         // Live Floating P&L Calculation
         const livePnlDisplay = isWin ? `+$${profitAmount.toFixed(2)}` : `-$${Math.abs(profitAmount).toFixed(2)}`;
         const pnlColor = isWin ? "#10b981" : "#f43f5e";
         const pnlBg = isWin ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)";
         
         // Quotex typically uses distinct colors for Buy/Sell entry,
         // but on expiry resolution and live tracking, uses Win/Loss colors.
         const markerColor = side === "BUY" ? "#10b981" : "#3b82f6"; // Emerald / Blue Base
         let activeColor = isExpired ? pnlColor : markerColor;

         // Ensure Marker doesn't pass Expiry line visually
         const renderX = Math.min(pos.currentX, pos.expiryX);

         return (
            <div key={trade.id} className="absolute top-0 left-0 w-full h-full pointer-events-none">
               
               {/* Vertical Dashed Line at Expiry */}
               <div 
                 className="absolute top-0 bottom-0 border-l-[1.5px] border-dashed flex flex-col items-center justify-end pb-12"
                 style={{ 
                   left: `${pos.expiryX}px`, 
                   borderColor: "rgba(255,255,255,0.4)",
                 }}
               >
                 <div 
                    className="bg-black/60 text-white text-[9px] uppercase tracking-wider font-bold px-2 py-1 rounded-[4px] border border-white/20 whitespace-nowrap"
                    style={{ transform: "translate(-50%, 0)" }}
                 >
                   End of Trade
                 </div>
               </div>

               {/* Tracking Entry Marker Dot & Countdown Box */}
               <div 
                 className="absolute flex items-center justify-start gap-1.5 whitespace-nowrap will-change-transform" 
                 style={{ 
                   left: `${renderX}px`, 
                   top: `${pos.entryY}px`,
                   // Transform keeps dot centered precisely on exact X/Y coordinate
                   transform: "translate(-6px, -50%)" 
                 }}
               >
                  {/* The Circular Dot */}
                  <div 
                     className="w-3 h-3 rounded-full shadow-[0_0_12px_rgba(0,0,0,0.8)] border-[2.5px] border-[#161a25] flex-shrink-0 z-20 relative transition-colors duration-300"
                     style={{ backgroundColor: activeColor }}
                  />
                  
                  {/* The Real-Time Dynamic Floating P&L Box */}
                  <div 
                     className={`flex items-center text-[11px] font-bold px-2 py-1 rounded shadow-[0_4px_10px_rgba(0,0,0,0.5)] border
                        transition-all duration-300 ease-out will-change-transform
                        ${isExpired ? "animate-bounce scale-110" : "scale-100"}
                     `}
                     style={{
                       backgroundColor: isExpired ? "rgba(10, 15, 25, 0.95)" : pnlBg, 
                       borderColor: pnlColor,
                       color: pnlColor,
                       backdropFilter: "blur(6px)",
                       transformOrigin: "left center"
                     }}
                  >
                     {!isExpired ? (
                        <div className="flex items-center gap-1.5 tabular-nums tracking-wide">
                          <span className="font-mono text-white/60">${parseFloat(trade.amount).toFixed(0)}</span>
                          <span className="w-[1px] h-[10px] bg-white/20" />
                          <span className="font-mono">{livePnlDisplay}</span>
                          <span className="w-[1px] h-[10px] bg-white/20" />
                          <span className="w-10 text-center text-white/90">
                             {Math.floor(secLeft/60).toString().padStart(2, "0")}:{ (secLeft%60).toString().padStart(2, "0") }
                          </span>
                        </div>
                     ) : (
                        <div className="flex items-center gap-1 tabular-nums tracking-wide pr-1">
                           <span className="font-mono">
                             {isWin ? `+$${profitAmount.toFixed(2)}` : `-$${Math.abs(profitAmount).toFixed(2)}`}
                           </span>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         );
      })}
    </div>
  );
}
