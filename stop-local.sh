#!/bin/bash

# A3T Local Development Stop Script
# This script stops all running services

echo "🛑 Stopping A3T Local Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local service_name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}🔄 Stopping $service_name on port $port...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null
        echo -e "${GREEN}✅ $service_name stopped${NC}"
    else
        echo -e "${BLUE}ℹ️  $service_name is not running on port $port${NC}"
    fi
}

# Kill services by port
kill_port 3000 "Scraper Backend"
kill_port 3002 "Frontend"

# Kill services by PID if files exist
if [ -f ".scraper_pid" ]; then
    SCRAPER_PID=$(cat .scraper_pid)
    if ps -p $SCRAPER_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}🔄 Stopping scraper backend (PID: $SCRAPER_PID)...${NC}"
        kill -9 $SCRAPER_PID 2>/dev/null
        echo -e "${GREEN}✅ Scraper backend stopped${NC}"
    fi
    rm .scraper_pid
fi

if [ -f ".frontend_pid" ]; then
    FRONTEND_PID=$(cat .frontend_pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}🔄 Stopping frontend (PID: $FRONTEND_PID)...${NC}"
        kill -9 $FRONTEND_PID 2>/dev/null
        echo -e "${GREEN}✅ Frontend stopped${NC}"
    fi
    rm .frontend_pid
fi

# Clean up any remaining node processes related to this project
echo -e "${YELLOW}🧹 Cleaning up any remaining project processes...${NC}"
pkill -f "simple-api.js" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

echo ""
echo -e "${GREEN}🎉 All A3T services have been stopped!${NC}"
echo ""
