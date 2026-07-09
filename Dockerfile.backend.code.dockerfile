FROM python:3.11-slim

WORKDIR /app

# System deps: cần cho onnxruntime, lightgbm, một số lib native
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files trước để tận dụng Docker layer cache
COPY pyproject.toml ./
RUN pip install --no-cache-dir pip-tools && \
    pip install --no-cache-dir -e .

# Copy source code
COPY backend/ ./backend/
COPY ai/ ./ai/
COPY security/ ./security/
COPY shared/ ./shared/
COPY mcp/ ./mcp/

# Non-root user cho security
RUN useradd -m armor-user
USER armor-user

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]