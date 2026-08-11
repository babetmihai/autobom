FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    torch \
    torchvision \
    --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir \
    flask \
    flask-cors \
    pillow \
    numpy \
    requests \
    transformers

COPY api/ /app/

EXPOSE 5004

CMD ["python3", "service.py"]
