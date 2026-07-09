FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .

ENV PORT=7860
ENV CAFE_DB_PATH=/data/cyber_cafe.db

EXPOSE 7860
CMD ["python", "app.py"]
