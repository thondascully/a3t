#!/bin/bash

# Test script for Polymarket Trading Bot API
# Usage: ./test_api.sh [APP_URL]

# Default URL (replace with your actual app URL)
APP_URL=${1:-"http://localhost:8080"}

echo "Testing Polymarket Trading Bot API at: $APP_URL"
echo "================================================"

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s "$APP_URL/health" | jq '.' || echo "Health check failed"
echo ""

# Test wallet address
echo "2. Testing wallet address..."
curl -s "$APP_URL/wallet/address" | jq '.' || echo "Wallet address check failed"
echo ""

# Test wallet balance
echo "3. Testing wallet balance..."
curl -s "$APP_URL/wallet/balance" | jq '.' || echo "Wallet balance check failed"
echo ""

# Test configuration
echo "4. Testing configuration..."
curl -s "$APP_URL/config" | jq '.' || echo "Configuration check failed"
echo ""

# Test risk assessment
echo "5. Testing risk assessment..."
curl -s -X POST "$APP_URL/risk/assess" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "0x1234567890123456789012345678901234567890",
    "value": "0.01"
  }' | jq '.' || echo "Risk assessment failed"
echo ""

echo "Testing completed!"
