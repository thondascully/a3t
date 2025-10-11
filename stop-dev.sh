#!/bin/bash

# A3T - Stop Development Environment

echo "🛑 Stopping A3T Development Environment..."

# Stop services using saved PIDs
if [ -f .scraper.pid ]; then
    echo "📊 Stopping Scraper Backend..."
    kill $(cat .scraper.pid) 2>/dev/null
    rm .scraper.pid
fi

if [ -f .trader.pid ]; then
    echo "🤖 Stopping Trading Engine..."
    kill $(cat .trader.pid) 2>/dev/null
    rm .trader.pid
fi

if [ -f .frontend.pid ]; then
    echo "🎨 Stopping Frontend..."
    kill $(cat .frontend.pid) 2>/dev/null
    rm .frontend.pid
fi

# Kill any remaining processes on the ports
echo "🧹 Cleaning up remaining processes..."

# Kill processes on port 3000 (Frontend/Scraper)
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Kill processes on port 8080 (Trading Engine)
lsof -ti:8080 | xargs kill -9 2>/dev/null

echo "✅ All services stopped."
