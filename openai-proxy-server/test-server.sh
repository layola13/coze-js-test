#!/bin/bash

# Quick test script to verify the proxy server is working

echo "🧪 Quick Test Script for OpenAI Proxy Server"
echo "=============================================="

# Check if server is running
echo "🔍 Checking if server is running..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Server is running"
else
    echo "❌ Server is not running. Please start it with: npm run dev"
    exit 1
fi

echo ""
echo "🏥 Health Check:"
curl -s http://localhost:3000/health | jq '.' 2>/dev/null || curl -s http://localhost:3000/health

echo ""
echo ""
echo "📋 Available Models:"
curl -s http://localhost:3000/v1/models | jq '.data[]' 2>/dev/null || curl -s http://localhost:3000/v1/models

echo ""
echo ""
echo "💬 Testing Chat Completion:"
curl -s -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-model-type: chat" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {"role": "user", "content": "Say hello in JSON format"}
    ]
  }' | jq '.choices[0].message.content' 2>/dev/null || echo "Raw response:"

echo ""
echo ""
echo "🎯 Test complete! Use the following with your OpenAI SDK:"
echo ""
echo "import OpenAI from 'openai';"
echo ""
echo "const openai = new OpenAI({"
echo "  apiKey: 'proxy-key',"
echo "  baseURL: 'http://localhost:3000/v1'"
echo "});"
echo ""
echo "const response = await openai.chat.completions.create({"
echo "  model: 'gpt-3.5-turbo',"
echo "  messages: [{ role: 'user', content: 'Hello!' }]"
echo "});"
