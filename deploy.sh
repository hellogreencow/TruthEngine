#!/bin/bash
# Truth Engine Deployment Script

echo "Truth Engine Deployment"
echo "======================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Function to display a step
step() {
    echo ""
    echo "➡️ $1"
    echo "-------------------------------------------"
}

# Build and deploy the application
step "Building and deploying Truth Engine..."
docker-compose build
docker-compose up -d

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Truth Engine has been deployed successfully!"
    echo "📊 The application is running at: http://localhost:3000"
    echo ""
    echo "ℹ️ Additional Information:"
    echo "   - To view logs: docker-compose logs -f"
    echo "   - To stop the application: docker-compose down"
    echo "   - Ollama is accessible at: http://localhost:11434"
    echo ""
    
    # Check if qwen2.5:7b model is available in Ollama
    echo "🔍 Checking if qwen2.5:7b model is available in Ollama..."
    if curl -s http://localhost:11434/api/tags | grep -q "qwen2.5:7b"; then
        echo "✅ qwen2.5:7b model is available in Ollama."
    else
        echo "⚠️ qwen2.5:7b model is not detected in Ollama."
        echo "   Please run the following command to pull the model:"
        echo "   docker exec -it truth-engine-ollama-1 ollama pull qwen2.5:7b"
    fi
else
    echo ""
    echo "❌ Deployment failed. Please check the error messages above."
fi