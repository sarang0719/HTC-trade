import pandas as pd
import pandas_ta as ta
import numpy as np

def generate_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Generate all requested technical features for the AI model using pandas-ta.
    """
    if df.empty or len(df) < 200:
        return df
        
    df = df.copy()
    
    # -- EMAs
    df['EMA_9'] = ta.ema(df['close'], length=9)
    df['EMA_20'] = ta.ema(df['close'], length=20)
    df['EMA_50'] = ta.ema(df['close'], length=50)
    df['EMA_100'] = ta.ema(df['close'], length=100)
    df['EMA_200'] = ta.ema(df['close'], length=200)
    
    # -- Oscillators & Momentum
    df['RSI'] = ta.rsi(df['close'], length=14)
    macd = ta.macd(df['close'])
    if macd is not None and not macd.empty:
        df['MACD'] = macd.iloc[:, 0]
        df['MACD_Signal'] = macd.iloc[:, 2]
        df['MACD_Hist'] = macd.iloc[:, 1]
    
    df['ATR'] = ta.atr(df['high'], df['low'], df['close'], length=14)
    
    adx = ta.adx(df['high'], df['low'], df['close'])
    if adx is not None and not adx.empty:
        df['ADX'] = adx.iloc[:, 0]
        
    df['CCI'] = ta.cci(df['high'], df['low'], df['close'], length=14)
    df['MOM'] = ta.mom(df['close'], length=10)
    
    # -- VWAP (Requires volume)
    # pandas-ta vwap requires high, low, close, volume, timestamp as index
    temp_df = df.set_index('timestamp')
    try:
        df['VWAP'] = ta.vwap(temp_df['high'], temp_df['low'], temp_df['close'], temp_df['volume']).values
    except Exception:
        df['VWAP'] = df['close'] # fallback
        
    # -- Bollinger Bands
    bbands = ta.bbands(df['close'], length=20)
    if bbands is not None and not bbands.empty:
        df['BB_Lower'] = bbands.iloc[:, 0]
        df['BB_Mid'] = bbands.iloc[:, 1]
        df['BB_Upper'] = bbands.iloc[:, 2]
        
    # -- Stochastic RSI
    stoch_rsi = ta.stochrsi(df['close'])
    if stoch_rsi is not None and not stoch_rsi.empty:
        df['STOCHRSI_K'] = stoch_rsi.iloc[:, 0]
        df['STOCHRSI_D'] = stoch_rsi.iloc[:, 1]
        
    df['ROC'] = ta.roc(df['close'], length=14)
    df['WILLR'] = ta.willr(df['high'], df['low'], df['close'], length=14)
    
    # -- Custom Features & Ratios for Ultra-High Accuracy
    df['Body_Size'] = df['close'] - df['open']
    df['Upper_Wick'] = df['high'] - df[['open', 'close']].max(axis=1)
    df['Lower_Wick'] = df[['open', 'close']].min(axis=1) - df['low']
    df['Candle_Range'] = df['high'] - df['low']
    df['Body_Ratio'] = np.where(df['Candle_Range'] > 0, abs(df['Body_Size']) / df['Candle_Range'], 0)
    df['Upper_Wick_Ratio'] = np.where(df['Candle_Range'] > 0, df['Upper_Wick'] / df['Candle_Range'], 0)
    df['Lower_Wick_Ratio'] = np.where(df['Candle_Range'] > 0, df['Lower_Wick'] / df['Candle_Range'], 0)
    
    # -- Institutional EMA Ratios & Velocity
    df['EMA_9_20_Diff'] = (df['EMA_9'] - df['EMA_20']) / df['close']
    df['EMA_20_50_Diff'] = (df['EMA_20'] - df['EMA_50']) / df['close']
    df['EMA_50_200_Diff'] = (df['EMA_50'] - df['EMA_200']) / df['close']
    
    # -- Volatility & Momentum Ratios
    df['ATR_Rel'] = np.where(df['close'] > 0, df['ATR'] / df['close'], 0)
    df['BB_Width'] = np.where(df['BB_Mid'] > 0, (df['BB_Upper'] - df['BB_Lower']) / df['BB_Mid'], 0)
    df['RSI_Vel'] = df['RSI'].diff()
    
    # -- Pure Vectorized Pattern Recognition (Zero TA-Lib warnings)
    body = (df['close'] - df['open']).abs()
    rng = df['high'] - df['low']
    rng_safe = np.where(rng > 0, rng, 1.0)
    upper_w = df['high'] - df[['open', 'close']].max(axis=1)
    lower_w = df[['open', 'close']].min(axis=1) - df['low']

    # Doji: body <= 10% of total candle range
    df['CDL_DOJI'] = np.where(body / rng_safe <= 0.10, 100, 0)

    # Hammer / Shooting Star: lower wick >= 2x body and upper wick <= 0.2 * body
    is_hammer = (lower_w >= 2 * body) & (upper_w <= 0.2 * body) & (body > 0)
    df['CDL_HAMMER'] = np.where(is_hammer, 100, 0)

    # Engulfing: current candle body engulfs previous candle body
    prev_open = df['open'].shift(1)
    prev_close = df['close'].shift(1)
    bull_engulf = (df['close'] > df['open']) & (prev_close < prev_open) & (df['close'] >= prev_open) & (df['open'] <= prev_close)
    bear_engulf = (df['close'] < df['open']) & (prev_close > prev_open) & (df['close'] <= prev_open) & (df['open'] >= prev_close)
    df['CDL_ENGULFING'] = np.where(bull_engulf, 100, np.where(bear_engulf, -100, 0))
            
    df.dropna(inplace=True)
    return df
