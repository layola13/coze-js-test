#!/bin/bash

# Build and start the OpenAI Proxy Server

echo "🚀 Starting OpenAI Proxy Server for Coze"

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env with your Coze API credentials before starting the server."
    echo ""
    echo "Required variables:"
    echo "  - COZE_API_KEY: Your Coze API key"
    echo "  - COZE_BOT_ID: Your Coze bot ID"
    echo "  - COZE_WORKFLOW_ID: Your Coze workflow ID (optional)"
    echo ""
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Start the server
echo "🌟 Starting server..."
npm start
