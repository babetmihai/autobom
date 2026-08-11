FROM camenduru/tostui-trellis2:latest

WORKDIR /content/TRELLIS.2

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.12-dev build-essential \
    && rm -rf /var/lib/apt/lists/*
RUN ln -sf /usr/local/cuda-12.8/compat/libcuda.so /usr/lib/x86_64-linux-gnu/libcuda.so
RUN pip install --break-system-packages --ignore-installed flask flask-cors scipy
USER camenduru
