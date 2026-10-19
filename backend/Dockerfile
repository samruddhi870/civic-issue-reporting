# CivicConnect backend - multi-stage: base -> test -> runtime
FROM python:3.11-slim AS base
WORKDIR /app
ENV PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn
COPY . .
RUN mkdir -p uploads && sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

# Jenkins "Backend Tests" stage:  docker build --target test backend
# Seeds a fresh DB (tests rely on seed users/issues) then runs pytest.
FROM base AS test
RUN pip install --no-cache-dir pytest
RUN python seed.py && python -m pytest -q -p no:cacheprovider

# Final image (default target)
FROM base AS runtime
EXPOSE 5000
ENV FLASK_ENV=production
ENTRYPOINT ["./entrypoint.sh"]
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--threads", "4", "app:app"]
