#!/bin/bash
set -e

echo "🐳 Testing Mars Substreams Docker Build"
echo "========================================"

cd /Users/joung-un/mars-projects/backend

echo ""
echo "📋 Checking required files..."
echo ""

# Check if all required files exist
REQUIRED_FILES=(
    "Dockerfile"
    "container_src/Cargo.toml"
    "container_src/Cargo.lock"
    "container_src/build.rs"
    "container_src/src/lib.rs"
    "container_src/proto/vault_events.proto"
    "container_src/substreams.yaml"
    "container_src/schema.sql"
    "container_src/start-container.sh"
    "container_src/.env.substreams"
)

MISSING_FILES=0
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - NOT FOUND"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

echo ""
if [ $MISSING_FILES -gt 0 ]; then
    echo "❌ Missing $MISSING_FILES required files"
    exit 1
fi

echo "✅ All required files present"
echo ""
echo "🔨 Starting Docker build..."
echo "Build context: $(pwd)"
echo ""

# Build the Docker image
docker build -t mars-substreams:test \
    --build-arg RUST_LOG=info \
    --build-arg START_BLOCK=376601697 \
    -f Dockerfile \
    . 2>&1 | tail -30

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Docker build successful!"
    echo ""
    echo "Image info:"
    docker images mars-substreams:test
    echo ""
    echo "To run the container:"
    echo "  docker run --rm -it mars-substreams:test"
else
    echo ""
    echo "❌ Docker build failed"
    exit 1
fi
