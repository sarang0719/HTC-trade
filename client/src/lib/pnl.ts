/**
 * Core Profit and Loss Calculation System 
 * Matches Quotex-style fixed options math
 */

export function calculatePnL(trade: any, currentPrice: number) {
  // Map our DB schema to the requested variables
  const entryPrice = parseFloat(trade.strikePrice as string);
  const amount = parseFloat(trade.amount as string);
  const payout = parseFloat(trade.payoutRatio as string || "0.85");
  const type = trade.side; // 'BUY' or 'SELL'

  const profit = amount * payout;

  let isWin = false;

  if (type === "BUY") {
    isWin = currentPrice > entryPrice;
  } else {
    isWin = currentPrice < entryPrice;
  }

  return {
    isWin,
    pnl: isWin ? profit : -amount
  };
}

export function getFinalResult(trade: any, finalPrice: number) {
  const entryPrice = parseFloat(trade.strikePrice as string);
  const amount = parseFloat(trade.amount as string);
  const payout = parseFloat(trade.payoutRatio as string || "0.85");
  const type = trade.side;

  const profit = amount * payout;

  let isWin = false;

  if (type === "BUY") {
    isWin = finalPrice > entryPrice;
  } else {
    isWin = finalPrice < entryPrice;
  }

  return {
    result: isWin ? "WIN" : "LOSS",
    returnAmount: isWin ? amount + profit : 0
  };
}
