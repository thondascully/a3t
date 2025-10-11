#!/bin/bash

# Test script for all API endpoints
# This script tests both the trader backend and scraper backend

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default URLs
TRADER_URL=${1:-"http://localhost:8080"}
SCRAPER_URL=${2:-"http://localhost:3000"}

echo "Testing API Endpoints"
echo "===================="
echo "Trader URL: $TRADER_URL"
echo "Scraper URL: $SCRAPER_URL"
echo ""

# Test function
test_endpoint() {
    local method=$1
    local url=$2
    local description=$3
    local data=$4
    
    echo -n "Testing $description... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$url")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        echo "  Response: $(echo "$body" | jq -r '.message // .status // "OK"' 2>/dev/null || echo "Valid JSON")"
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        echo "  Error: $(echo "$body" | jq -r '.error // .message // "Unknown error"' 2>/dev/null || echo "$body")"
    fi
    echo ""
}

# Test Trader Backend Endpoints
echo -e "${YELLOW}=== TRADER BACKEND TESTS ===${NC}"
echo ""

# Health check
test_endpoint "GET" "$TRADER_URL/health" "Health Check"

# Bot status
test_endpoint "GET" "$TRADER_URL/bot/status" "Bot Status"

# Bot control
test_endpoint "POST" "$TRADER_URL/bot/start" "Start Bot" '{"userId": "test-user"}'
test_endpoint "POST" "$TRADER_URL/bot/stop" "Stop Bot" '{"userId": "test-user"}'

# Wallet endpoints
test_endpoint "GET" "$TRADER_URL/wallet/address" "Get Deposit Address"
test_endpoint "GET" "$TRADER_URL/wallet/balance" "Get Wallet Balance"
test_endpoint "POST" "$TRADER_URL/wallet/withdraw" "Withdraw Funds" '{"userId": "test-user", "to_address": "0x0000000000000000000000000000000000000000"}'

# Test Scraper Backend Endpoints
echo -e "${YELLOW}=== SCRAPER BACKEND TESTS ===${NC}"
echo ""

# Health check
test_endpoint "GET" "$SCRAPER_URL/api/health" "Scraper Health Check"

# Backtest endpoint
test_endpoint "POST" "$SCRAPER_URL/api/backtest" "Backtest Data" '{"addresses": ["0x1234567890123456789012345678901234567890"], "category": "politics", "startBalance": 1000, "positionPercentage": 0.02}'

# Leaderboard endpoint
test_endpoint "GET" "$SCRAPER_URL/api/leaderboard?category=politics&timePeriod=week&limit=10" "Leaderboard Data"

# Whale positions
test_endpoint "GET" "$SCRAPER_URL/api/whale-positions?address=0x1234567890123456789012345678901234567890&category=politics" "Whale Positions"

echo -e "${YELLOW}=== TEST COMPLETED ===${NC}"
echo ""
echo "If all tests pass, your API endpoints are properly connected!"
echo "If any tests fail, check that:"
echo "1. Both backend services are running"
echo "2. The URLs are correct"
echo "3. The services are accessible from this machine"
