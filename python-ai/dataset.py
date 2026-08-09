import ccxt
import pandas as pd
import time
from typing import Optional

def fetch_historical_data(symbol: str, timeframe: str = '5m', limit: int = 5000) -> pd.DataFrame:
    """
    Fetch historical OHLCV data from Binance using CCXT with pagination.
    """
    exchange = ccxt.binance({
        'enableRateLimit': True,
    })
    
    formatted_symbol = symbol
    if symbol in ["EURUSD", "GBPUSD"]:
        formatted_symbol = f"{symbol[:3]}/USDT"
    elif symbol in ["XAUUSD", "XAUTUSDC", "XAUTUSDT", "PAXGUSDT"]:
        formatted_symbol = "PAXG/USDT"
    elif symbol in ["BTCUSD", "BTCUSDT"]:
        formatted_symbol = "BTC/USDT"
    elif symbol in ["ETHUSD", "ETHUSDT"]:
        formatted_symbol = "ETH/USDT"
    elif not "/" in formatted_symbol:
        if formatted_symbol.endswith("USDT"):
            formatted_symbol = f"{formatted_symbol[:-4]}/USDT"
        else:
            formatted_symbol = f"{formatted_symbol}/USDT"
    
    print(f"Fetching {limit} historical candles for {formatted_symbol} ({timeframe})...")
    
    all_ohlcv = []
    # Calculate starting timestamp for past candles
    tf_ms = 60 * 1000
    if timeframe == "1m": tf_ms = 1 * 60 * 1000
    elif timeframe == "5m": tf_ms = 5 * 60 * 1000
    elif timeframe == "15m": tf_ms = 15 * 60 * 1000
    elif timeframe == "30m": tf_ms = 30 * 60 * 1000
    elif timeframe == "1H": tf_ms = 60 * 60 * 1000
    
    since = int(time.time() * 1000) - (limit * tf_ms)
    batch_size = 1000
    
    while len(all_ohlcv) < limit:
        fetch_count = min(batch_size, limit - len(all_ohlcv))
        try:
            ohlcv = exchange.fetch_ohlcv(formatted_symbol, timeframe, since=since, limit=fetch_count)
            if not ohlcv:
                break
            all_ohlcv.extend(ohlcv)
            since = ohlcv[-1][0] + 1
            time.sleep(exchange.rateLimit / 1000)
        except Exception as e:
            print(f"Error fetching data for {formatted_symbol}: {e}")
            break
            
    if not all_ohlcv:
        return pd.DataFrame()
        
    df = pd.DataFrame(all_ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
    df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
    df.drop_duplicates(subset=['timestamp'], inplace=True)
    
    for col in ['open', 'high', 'low', 'close', 'volume']:
        df[col] = pd.to_numeric(df[col], errors='coerce')
        
    return df

if __name__ == "__main__":
    df = fetch_historical_data("BTCUSDT", "5m", 100)
    print(df.tail())
