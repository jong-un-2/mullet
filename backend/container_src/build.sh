#!/bin/bash
# Build Mars Substreams WASM module

set -e

echo "🔨 Building Mars Vaults Substreams"
echo "===================================="

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust not installed. Install from: https://rustup.rs/"
    exit 1
fi

# Check if wasm32 target is added
if ! rustup target list | grep -q "wasm32-unknown-unknown (installed)"; then
    echo "📦 Adding wasm32-unknown-unknown target..."
    rustup target add wasm32-unknown-unknown
fi

echo ""
echo "📦 Building WASM module..."
cargo build --target wasm32-unknown-unknown --release

if [ ! -f target/wasm32-unknown-unknown/release/mars_vaults_substreams.wasm ]; then
    echo "❌ Build failed - WASM file not found"
    exit 1
fi

WASM_SIZE=$(du -h target/wasm32-unknown-unknown/release/mars_vaults_substreams.wasm | cut -f1)
echo "✅ WASM module built successfully: $WASM_SIZE"

echo ""
echo "📋 Generating protobuf code..."
if command -v substreams &> /dev/null; then
    substreams protogen ./substreams.postgres.yaml --exclude-paths="sf/substreams,google" || true
    echo "✅ Protobuf code generated"
else
    echo "⚠️  substreams CLI not found - skipping protogen"
    echo "   Install from: https://substreams.streamingfast.io/getting-started/installing-the-cli"
fi

echo ""
echo "✅ Build complete!"
echo ""
echo "Next steps:"
echo "  1. Test: ./test-local.sh"
echo "  2. Deploy: ./deploy.sh"
