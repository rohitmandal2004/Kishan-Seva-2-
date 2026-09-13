# ML Service — Model Files

Trained model binaries (`*.pkl`, `*.joblib`, `*.h5`, `*.pt`) are **excluded from git** via `.gitignore`.  
Do not commit them — they can be large and should be treated as build artifacts.

## Why they're excluded

- Binary blobs bloat git history permanently.  
- Model files change frequently during experimentation.  
- They should be reproducible from source data + training code.

## How to regenerate

```bash
cd ml-service
pip install -r requirements.txt

# Train the Random Forest wait-time prediction model
python train.py

# The trained model is saved to: ml-service/models/rf_model.pkl
```

## How to download a pre-trained model (SIH demo)

For the SIH 2026 demo, a pre-trained model snapshot is available at:

```
# (Replace with your actual storage URL once uploaded)
curl -L "https://storage.example.com/kishan-seva/rf_model.pkl" \
     -o ml-service/models/rf_model.pkl
```

Or download from the project's GitHub Releases page if published there.

## Model details

| File | Algorithm | Input features | Output |
|------|-----------|----------------|--------|
| `rf_model.pkl` | Random Forest Regressor | day_of_week, hour_of_day, current_queue_length, active_counters, avg_quantity_qtl, avg_service_time_min, no_show_count, weather_condition | predicted_wait_mins |

## Connecting the model to the app

The FastAPI service in `ml-service/` serves the model at `/predict_wait_time`.  
Set `VITE_ML_SERVICE_URL` in your `.env` to the deployed service URL:

```env
VITE_ML_SERVICE_URL=https://your-ml-service.onrender.com
```

Free-tier deployment options:
- [Render.com](https://render.com) — free tier, always-on web service
- [Railway.app](https://railway.app) — $5/month free credit
- [Fly.io](https://fly.io) — free allowance
