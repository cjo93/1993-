FROM python:3.11-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY unified_field_v0/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY unified_field_v0/ /app
ENV PORT=8080
EXPOSE 8080

CMD ["uvicorn","app:app","--host","0.0.0.0","--port","8080"]
