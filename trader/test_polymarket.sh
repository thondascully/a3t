#!/bin/bash

# Test script for Polymarket Trading Bot API
# Usage: ./test_polymarket.sh [APP_URL]

# Default URL (replace with your actual app URL)
APP_URL=${1:-"http://localhost:8080"}

echo "Testing Polymarket Trading Bot API at: $APP_URL"
echo "================================================"

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s "$APP_URL/health" | jq '.' || echo "Health check failed"
echo ""

# Test configuration
echo "2. Testing configuration..."
curl -s "$APP_URL/config" | jq '.' || echo "Configuration check failed"
echo ""

# Test Polymarket balance
echo "3. Testing Polymarket balance..."
curl -s "$APP_URL/polymarket/balance" | jq '.' || echo "Polymarket balance check failed"
echo ""

# Test market info (example market ID)
echo "4. Testing market info..."
curl -s "$APP_URL/polymarket/market/example-market-id" | jq '.' || echo "Market info check failed"
echo ""

# Test bet placement (this will likely fail until implementation is complete)
echo "5. Testing bet placement..."
curl -s -X POST "$APP_URL/polymarket/bet" \
  -H "Content-Type: application/json" \
  -d '{
    "market_id": "example-market-id",
    "outcome": 1,
    "amount_usdc": 10.0,
    "price": 0.65
  }' | jq '.' || echo "Bet placement test failed"
echo ""

# Test invalid bet (should return error)
echo "6. Testing invalid bet (negative amount)..."
curl -s -X POST "$APP_URL/polymarket/bet" \
  -H "Content-Type: application/json" \
  -d '{
    "market_id": "example-market-id",
    "outcome": 1,
    "amount_usdc": -10.0,
    "price": 0.65
  }' | jq '.' || echo "Invalid bet test failed"
echo ""

echo "Polymarket testing completed!"
echo ""
echo "Note: Some tests may fail until the full Polymarket integration is implemented."
echo "The structure is in place, but you'll need to:"
echo "1. Get actual Polymarket contract addresses"
echo "2. Implement the actual bet placement logic"
echo "3. Test with real USDC on Polygon testnet first"
