# ─── Kishan Seva ML Service — Production Dockerfile ───
# Multi-stage build for a lean FastAPI + scikit-learn image
# Build:  docker build -t kishan-ml .
# Run:    docker run -p 8000:8000 --env-file .env kishan-ml

# ── Stage 1: Builder ──
FROM python:3.11-slim AS builder

WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Runtime ──
FROM python:3.11-slim

LABEL maintainer="Rohit Mandal <rohitmandal2004>"
LABEL description="Kishan Seva ML Prediction Service (FastAPI + Random Forest)"

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY app/ ./app/
COPY models/ ./models/
COPY data/centre_performance_features.csv ./data/centre_performance_features.csv

# Create non-root user for security
RUN adduser --disabled-password --no-create-home appuser
USER appuser

# Expose the default Uvicorn port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/docs')" || exit 1

# Run with Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
