import pandas as pd
import numpy as np
from dataset import fetch_historical_data
from feature_engine import generate_features
from model import train_model

def prepare_target(df: pd.DataFrame) -> pd.DataFrame:
    """
    Target: Predict high-probability next candle direction.
    2 = BUY (next close > next open + 0.15 * ATR)
    0 = SELL (next close < next open - 0.15 * ATR)
    1 = NO TRADE / NEUTRAL (low-volatility noise)
    """
    df = df.copy()
    df['next_open'] = df['open'].shift(-1)
    df['next_close'] = df['close'].shift(-1)
    
    threshold = df['ATR'] * 0.12 if 'ATR' in df.columns else df['close'] * 0.0002
    
    conditions = [
        (df['next_close'] - df['next_open'] >= threshold),
        (df['next_open'] - df['next_close'] >= threshold)
    ]
    choices = [2, 0] # 2 = BUY, 0 = SELL
    df['target'] = np.select(conditions, choices, default=1) # 1 = NO TRADE / CHOP
    
    df.dropna(inplace=True)
    df.drop(columns=['next_open', 'next_close'], inplace=True)
    return df

def run_training(symbol: str, timeframe: str = '5m'):
    print(f"--- Training High-Precision Model for {symbol} ({timeframe}) ---")
    df = fetch_historical_data(symbol, timeframe, limit=3000)
    if df.empty:
        print(f"No data fetched for {symbol} ({timeframe}).")
        return
        
    df = generate_features(df)
    df = prepare_target(df)
    
    model_name = f"{symbol}_{timeframe}"
    model, acc = train_model(df, 'target', model_name)
    
    print(f"Training complete for {model_name}. Test Accuracy: {acc * 100:.2f}%")

if __name__ == "__main__":
    markets = ["BTCUSDT", "XAUTUSDT", "ETHUSDT", "EURUSD", "GBPUSD"]
    timeframes = ["1m", "5m", "15m"]
    
    for m in markets:
        for tf in timeframes:
            try:
                run_training(m, tf)
            except Exception as e:
                print(f"Skipping {m}_{tf}: {e}")
