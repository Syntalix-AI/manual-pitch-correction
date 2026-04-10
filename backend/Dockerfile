FROM python:3.10-slim

WORKDIR /app

# Install system dependencies (FULL FIX)
RUN apt-get update && apt-get install -y \
    build-essential \
    libsndfile1 \
    libsndfile1-dev \
    libasound2 \
    ffmpeg \
    gfortran \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip BEFORE install
RUN pip install --upgrade pip setuptools wheel

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]