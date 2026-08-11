FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    assimp-utils \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    flask \
    flask-cors \
    trimesh \
    pillow \
    numpy \
    scipy

COPY api/ /app/

EXPOSE 5002

CMD ["python3", "service.py"]
