#!/bin/bash

# A3T - Automated Polymarket Copy-Trading Agent
# Development Startup Script

echo "🚀 Starting A3T Development Environment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from env.example..."
    cp env.example .env
    echo "📝 Please edit .env file with your configuration before running again."
    exit 1
fi

# Start Scraper Backend (Node.js)
echo "📊 Starting Scraper Backend..."
cd scraper-backend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing scraper dependencies..."
    npm install
fi
npm start &
SCRAPER_PID=$!
cd ..

# Wait a moment for scraper to start
sleep 3

# Start Trading Engine (Python)
echo "🤖 Starting Trading Engine..."
cd trader
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "📦 Installing trading engine dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements_simple.txt

echo "🔧 Starting Flask trading API..."
python src/simple_main.py &
TRADER_PID=$!
cd ..

# Wait a moment for trading engine to start
sleep 3

# Start Frontend (Next.js)
echo "🎨 Starting Frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ A3T Development Environment Started!"
echo ""
echo "🌐 Services running:"
echo "   • Frontend: http://localhost:3000"
echo "   • Scraper API: http://localhost:3000/api"
echo "   • Trading Engine: http://localhost:8080"
echo ""
echo "📝 To stop all services, run: ./stop-dev.sh"
echo ""

# Save PIDs for cleanup
echo $SCRAPER_PID > .scraper.pid
echo $TRADER_PID > .trader.pid
echo $FRONTEND_PID > .frontend.pid

# Wait for user input to stop
read -p "Press Enter to stop all services..."

# Cleanup function
cleanup() {
    echo "🛑 Stopping services..."
    
    if [ -f .scraper.pid ]; then
        kill $(cat .scraper.pid) 2>/dev/null
        rm .scraper.pid
    fi
    
    if [ -f .trader.pid ]; then
        kill $(cat .trader.pid) 2>/dev/null
        rm .trader.pid
    fi
    
    if [ -f .frontend.pid ]; then
        kill $(cat .frontend.pid) 2>/dev/null
        rm .frontend.pid
    fi
    
    echo "✅ All services stopped."
}

# Set up signal handlers
trap cleanup EXIT INT TERM
