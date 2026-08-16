import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple, Optional
import os
import joblib
from sklearn.ensemble import HistGradientBoostingClassifier

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'saved_models')
os.makedirs(MODEL_DIR, exist_ok=True)

def train_model(df: pd.DataFrame, target_col: str, model_name: str) -> Tuple[HistGradientBoostingClassifier, float]:
    """
    Train a gradient boosting model to predict next candle direction.
    Target should be: 1 (BUY), 0 (SELL), -1 (NO TRADE/CHOP)
    """
    features = [c for c in df.columns if c not in ['timestamp', target_col, 'open', 'high', 'low', 'close', 'volume']]
    
    X = df[features]
    y = df[target_col]
    
    # 80/20 train/test split
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    
    model = HistGradientBoostingClassifier(
        max_iter=1000,
        learning_rate=0.015,
        max_depth=12,
        min_samples_leaf=10,
        l2_regularization=0.6,
        class_weight='balanced',
        random_state=42,
        early_stopping=True,
        n_iter_no_change=45
    )
    
    model.fit(X_train, y_train)
    
    accuracy = model.score(X_test, y_test)
    print(f"Model {model_name} trained. Test Accuracy: {accuracy:.4f}")
    
    joblib.dump(model, os.path.join(MODEL_DIR, f"{model_name}.pkl"))
    joblib.dump(features, os.path.join(MODEL_DIR, f"{model_name}_features.pkl"))
    
    return model, accuracy

def load_model(model_name: str) -> Tuple[Optional[HistGradientBoostingClassifier], Optional[list]]:
    try:
        model = joblib.load(os.path.join(MODEL_DIR, f"{model_name}.pkl"))
        features = joblib.load(os.path.join(MODEL_DIR, f"{model_name}_features.pkl"))
        return model, features
    except FileNotFoundError:
        return None, None

def predict(model: HistGradientBoostingClassifier, features_list: list, df_row: pd.DataFrame) -> Dict[str, Any]:
    df_row = df_row.copy()
    for col in features_list:
        if col not in df_row.columns:
            df_row[col] = 0.0
            
    X = df_row[features_list]
    
    probs = model.predict_proba(X)[0]
    
    # HistGradientBoostingClassifier's classes_ property tells us the order
    classes = list(model.classes_)
    
    # Map back to our probabilities
    prob_dict = {classes[i]: probs[i] for i in range(len(classes))}
    
    # 0 -> SELL, 1 -> NO TRADE, 2 -> BUY
    prob_buy = prob_dict.get(2, 0.0)
    prob_sell = prob_dict.get(0, 0.0)
    prob_nt = prob_dict.get(1, 0.0)
    
    pred_class = max(prob_dict, key=lambda k: prob_dict[k])
    
    if pred_class == 2:
        signal = "BUY"
        conf = prob_buy
    elif pred_class == 0:
        signal = "SELL"
        conf = prob_sell
    else:
        signal = "NO TRADE"
        conf = prob_nt
        
    return {
        "signal": signal,
        "confidence": float(conf * 100),
        "probability_up": float(prob_buy * 100),
        "probability_down": float(prob_sell * 100)
    }
