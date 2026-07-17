const fs = require('fs');
const glob = require('glob');

const files = [
  "client/src/components/AIConsentModal.tsx",
  "client/src/components/SmartAutoPilot.tsx",
  "client/src/components/StrategyPanel.tsx",
  "client/src/lib/auto-bot.ts",
  "client/src/lib/candle-predictor.ts",
  "client/src/lib/strategy-engine.ts",
  "client/src/pages/AIInsights.tsx",
  "client/src/pages/AdminDashboard.tsx",
  "client/src/pages/MarketDetail.tsx",
  "client/src/pages/Markets.tsx",
  "client/src/pages/Strategy.tsx",
  "client/src/pages/WalletPage.tsx"
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/QuantEdge v12\.0/g, 'QUANTEDGE V12.1 · SMC');
  content = content.replace(/QuantEdge v12\.1/g, 'QUANTEDGE V12.1 · SMC');
  content = content.replace(/QuantEdge Pro v9\.0/g, 'QUANTEDGE V12.1 · SMC');
  content = content.replace(/QuantEdge v9\.0/g, 'QUANTEDGE V12.1 · SMC');
  content = content.replace(/QuantEdge Pro/g, 'QUANTEDGE V12.1 · SMC');
  content = content.replace(/QuantEdge AI v12\.1/g, 'QUANTEDGE V12.1 · SMC');
  content = content.replace(/QuantEdge/g, 'QUANTEDGE V12.1 · SMC');
  // cleanup double SMC
  content = content.replace(/QUANTEDGE V12\.1 · SMC · SMC/g, 'QUANTEDGE V12.1 · SMC');
  content = content.replace(/QUANTEDGE V12\.1 · SMC V12\.1 · SMC/g, 'QUANTEDGE V12.1 · SMC');
  fs.writeFileSync(file, content);
}
console.log("Replaced successfully!");
