FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    flask \
    flask-cors \
    requests \
    beautifulsoup4

COPY api/ /app/

EXPOSE 5003

CMD ["python3", "service.py"]
