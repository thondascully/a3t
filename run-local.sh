#!/bin/bash

# A3T Local Development Startup Script
# This script starts all necessary services for local development

echo "🚀 Starting A3T Local Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}⚠️  Port $1 is already in use${NC}"
        return 1
    else
        return 0
    fi
}

# Function to kill processes on specific ports
kill_port() {
    echo -e "${YELLOW}🔄 Stopping any existing services on port $1...${NC}"
    lsof -ti:$1 | xargs kill -9 2>/dev/null || true
}

# Function to wait for service to be ready
wait_for_service() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    echo -e "${BLUE}⏳ Waiting for $service_name to start on port $port...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:$port" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is ready!${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $service_name failed to start after $max_attempts seconds${NC}"
    return 1
}

# Check if we're in the right directory
if [ ! -f "README.md" ]; then
    echo -e "${RED}❌ Please run this script from the project root directory${NC}"
    exit 1
fi

echo -e "${BLUE}📁 Project directory: $(pwd)${NC}"

# Stop any existing services
kill_port 3000
kill_port 3002

# Start Scraper Backend
echo -e "${BLUE}🔧 Starting Scraper Backend...${NC}"
cd scraper-backend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing scraper backend dependencies...${NC}"
    npm install
fi

# Start the scraper backend in background
npm start &
SCRAPER_PID=$!
cd ..

# Wait for scraper backend to be ready
wait_for_service 3000 "Scraper Backend"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start scraper backend${NC}"
    exit 1
fi

# Start Frontend
echo -e "${BLUE}🎨 Starting Frontend...${NC}"
cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm install
fi

# Start the frontend in background
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to be ready
wait_for_service 3002 "Frontend"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start frontend${NC}"
    exit 1
fi

# Test the integration
echo -e "${BLUE}🧪 Testing API integration...${NC}"
if curl -s "http://localhost:3000/api/leaderboard?category=overall&limit=1" | grep -q "success"; then
    echo -e "${GREEN}✅ Leaderboard API is working!${NC}"
else
    echo -e "${YELLOW}⚠️  Leaderboard API test failed, but services are running${NC}"
fi

# Save PIDs for cleanup
echo $SCRAPER_PID > .scraper_pid
echo $FRONTEND_PID > .frontend_pid

echo ""
echo -e "${GREEN}🎉 A3T Local Development Environment is ready!${NC}"
echo ""
echo -e "${BLUE}📍 Services:${NC}"
echo -e "   • ${GREEN}Scraper Backend:${NC} http://localhost:3000"
echo -e "   • ${GREEN}Frontend App:${NC}    http://localhost:3002"
echo ""
echo -e "${BLUE}🔗 API Endpoints:${NC}"
echo -e "   • ${GREEN}Health Check:${NC}    http://localhost:3000/api/health"
echo -e "   • ${GREEN}Leaderboard:${NC}     http://localhost:3000/api/leaderboard"
echo -e "   • ${GREEN}Categories:${NC}      http://localhost:3000/api/categories"
echo -e "   • ${GREEN}Backtest:${NC}        http://localhost:3000/api/backtest"
echo ""
echo -e "${YELLOW}💡 To stop all services, run: ./stop-local.sh${NC}"
echo ""
