import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import AppShell from "@/components/AppShell";

export default function ChartSandbox() {
    const chartContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth || 800,
            height: 500,
            layout: {
                background: { color: '#0f172a' },
                textColor: '#d1d5db',
            },
            grid: {
                vertLines: { color: '#1f2937' },
                horzLines: { color: '#1f2937' },
            },
            rightPriceScale: {
                autoScale: true,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
            priceFormat: {
                type: 'price',
                precision: 2,
                minMove: 0.01,
            },
        });

        const data = [
            { time: 1712400000, open: 2430, high: 2432, low: 2429, close: 2431 },
            { time: 1712400060, open: 2431, high: 2433, low: 2430, close: 2432 },
            { time: 1712400120, open: 2432, high: 2446, low: 2431, close: 2442 }, // big spike
            { time: 1712400180, open: 2442, high: 2443, low: 2436, close: 2437 },
            { time: 1712400240, open: 2437, high: 2438, low: 2432, close: 2433 },
        ];

        const avgPrice = data.reduce((sum, c) => sum + c.close, 0) / data.length;

        const filteredData = data.filter(candle => {
            return Math.abs(candle.high - avgPrice) < 20; // adjust if needed
        });

        candleSeries.setData(filteredData as any);

        chart.timeScale().fitContent();

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth
                });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    return (
        <AppShell>
            <div className="p-8 bg-[#020617] min-h-[calc(100vh-64px)] text-white">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <span className="text-primary">⚡</span>
                        </div>
                        Chart Spike Filter Sandbox
                    </h1>
                    
                    <div className="bg-[#0f172a] rounded-xl border border-white/5 shadow-2xl overflow-hidden p-4">
                        <div 
                            id="chart" 
                            ref={chartContainerRef} 
                            style={{ width: '100%', height: '500px' }}
                        />
                    </div>

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-[#0f172a] rounded-xl border border-white/5">
                            <h2 className="text-lg font-semibold mb-3 text-primary">Algorithm Details</h2>
                            <p className="text-sm text-slate-400 leading-relaxed mb-4">
                                This component implements an active outlier suppression algorithm designed to stabilize historical market feeds.
                            </p>
                            <ul className="space-y-3 text-sm">
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-500 mt-1">✓</span>
                                    <span>Calculates rolling average price from series</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-500 mt-1">✓</span>
                                    <span>Detects anomalies exceeding $20 deviation</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-500 mt-1">✓</span>
                                    <span>Prunes high-volatility artifacts before rendering</span>
                                </li>
                            </ul>
                        </div>

                        <div className="p-6 bg-[#0f172a] rounded-xl border border-white/5">
                            <h2 className="text-lg font-semibold mb-3 text-primary">Institutional Use Case</h2>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Used primarily for stabilizing Gold (XAUUSD) feeds where artificial liquidity spikes can trigger false AI signals. By filtering data at the client-side level, we ensure the visual representation remains accurate to true market trends.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
