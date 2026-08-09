from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
from feature_engine import generate_features
from model import load_model, predict
import uvicorn
import os

app = FastAPI(title="Next Candle Prediction AI")

class PredictionRequest(BaseModel):
    market: str
    timeframe: str
    candles: list  # list of dicts: [{'timestamp':..., 'open':..., 'high':..., 'low':..., 'close':..., 'volume':...}]

def analyze_trend(df: pd.DataFrame) -> str:
    """Analyze the overall trend based on EMAs."""
    if 'EMA_20' not in df.columns or 'EMA_50' not in df.columns:
        return "Neutral"
    
    last = df.iloc[-1]
    if last['EMA_20'] > last['EMA_50']:
        return "Bullish"
    elif last['EMA_20'] < last['EMA_50']:
        return "Bearish"
    return "Neutral"

def get_reasons(df: pd.DataFrame, signal: str) -> list:
    reasons = []
    last = df.iloc[-1]
    
    if signal == "BUY":
        if last.get('EMA_20', 0) > last.get('EMA_50', 0):
            reasons.append("EMA20 above EMA50")
        if last.get('RSI', 50) < 30:
            reasons.append(f"RSI Oversold ({last['RSI']:.1f})")
        if last.get('MACD_Hist', 0) > 0:
            reasons.append("MACD Bullish Flow")
        if last.get('CDL_ENGULFING', 0) > 0:
            reasons.append("Bullish Engulfing Pattern")
    elif signal == "SELL":
        if last.get('EMA_20', 0) < last.get('EMA_50', 0):
            reasons.append("EMA20 below EMA50")
        if last.get('RSI', 50) > 70:
            reasons.append(f"RSI Overbought ({last['RSI']:.1f})")
        if last.get('MACD_Hist', 0) < 0:
            reasons.append("MACD Bearish Flow")
        if last.get('CDL_ENGULFING', 0) < 0:
            reasons.append("Bearish Engulfing Pattern")
            
    if not reasons:
        reasons.append("Volume & Momentum Analysis")
        
    return reasons

def assess_risk(confidence: float) -> str:
    if confidence >= 85:
        return "Low"
    elif confidence >= 75:
        return "Medium"
    else:
        return "High"

@app.post("/api/predict")
async def get_prediction(req: PredictionRequest):
    if len(req.candles) < 200:
        raise HTTPException(status_code=400, detail="Require at least 200 candles to compute indicators.")
        
    # Map frontend symbols to the trained symbols
    market_mapping = {
        "BTCUSD": "BTCUSDT",
        "XAUUSD": "XAUTUSDT",
        "XAUTUSDC": "XAUTUSDT"
    }
    
    mapped_market = market_mapping.get(req.market, req.market)
    model_name = f"{mapped_market}_{req.timeframe}"
    
    model, features = load_model(model_name)
    
    if not model or not features:
        raise HTTPException(status_code=404, detail=f"Model for {model_name} not found. Please train it first.")
        
    df = pd.DataFrame(req.candles)
    
    # Ensure numeric columns
    for col in ['open', 'high', 'low', 'close', 'volume']:
        df[col] = pd.to_numeric(df[col])
        
    df = generate_features(df)
    
    if df.empty:
        raise HTTPException(status_code=500, detail="Feature generation failed.")
        
    # Get the latest row
    latest_row = df.iloc[[-1]]
    
    prediction_result = predict(model, features, latest_row)
    
    # Risk Filter: Overwrite to NO TRADE if confidence < 70%
    if prediction_result["confidence"] < 70:
        prediction_result["signal"] = "NO TRADE"
        
    trend = analyze_trend(df)
    reasons = get_reasons(df, prediction_result["signal"])
    risk = assess_risk(prediction_result["confidence"])
    
    strength = "Strong" if prediction_result["confidence"] >= 85 else "Normal" if prediction_result["confidence"] >= 75 else "Weak"
    if prediction_result["signal"] == "NO TRADE":
        strength = "N/A"
        
    return {
        "market": req.market,
        "signal": prediction_result["signal"],
        "confidence": round(prediction_result["confidence"], 1),
        "probability_up": round(prediction_result["probability_up"], 1),
        "probability_down": round(prediction_result["probability_down"], 1),
        "trend": trend,
        "strength": strength,
        "risk": risk,
        "reason": reasons
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("api:app", host="127.0.0.1", port=port, reload=True)
