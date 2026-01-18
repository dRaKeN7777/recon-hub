# Build stage to compile subfinder (handles architecture automatically)
FROM golang:1.24 AS builder
RUN go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest

# Final stage
FROM python:3.11-slim

WORKDIR /app
COPY backend /app

# Copy subfinder binary from builder stage
COPY --from=builder /go/bin/subfinder /usr/local/bin/subfinder

# Install system dependencies
RUN apt-get update && apt-get install -y nmap whois && rm -rf /var/lib/apt/lists/*

RUN pip install -r requirements.txt
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
