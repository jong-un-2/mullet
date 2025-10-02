# ============================================================
# Mars Vaults Substreams - Cloudflare Container
# ============================================================
# This container runs the Substreams Sink to continuously index
# Mars vault events from Solana into PostgreSQL (Neon)
#
# Build context: backend/container_src/
# ============================================================

# ============================================================
# Stage 1: Rust Builder - Build WASM module
# ============================================================
FROM rust:1.84-slim-bookworm as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    curl \
    git \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy Cargo files for dependency caching
COPY Cargo.toml Cargo.lock ./

# Create dummy source to build dependencies (cached layer)
RUN mkdir -p src && \
    echo "fn main() {}" > src/main.rs && \
    echo "pub fn lib() {}" > src/lib.rs && \
    cargo build --release && \
    rm -rf src

# Copy actual source code
COPY src ./src
COPY proto ./proto
COPY build.rs ./

# Add WASM target and build
RUN rustup target add wasm32-unknown-unknown && \
    touch src/lib.rs && \
    cargo build --target wasm32-unknown-unknown --release

# ============================================================
# Stage 2: Runtime - Minimal Debian with Substreams Sink
# ============================================================
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install substreams-sink-postgres binary
RUN curl -L https://github.com/streamingfast/substreams-sink-postgres/releases/download/v4.7.0/substreams-sink-postgres_Linux_x86_64.tar.gz \
    | tar -xzf - -C /usr/local/bin && \
    chmod +x /usr/local/bin/substreams-sink-postgres

WORKDIR /app

# Copy built WASM module from builder
COPY --from=builder /build/target/wasm32-unknown-unknown/release/*.wasm ./

# Copy Substreams package and configurations
COPY mars-vaults-substreams-graph-v1.0.0.spkg ./
COPY substreams.yaml ./
COPY schema.sql ./

# Create non-root user
RUN useradd -m -u 1000 substreams && \
    mkdir -p /app/logs && \
    chown -R substreams:substreams /app

# Switch to non-root user
USER substreams

# Expose Prometheus metrics port
EXPOSE 9102

# Health check on metrics endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:9102/metrics || exit 1

# Default environment variables (overridden by Cloudflare)
ENV RUST_LOG=info \
    SUBSTREAMS_ENDPOINT=mainnet.sol.streamingfast.io:443 \
    START_BLOCK=370500000

# Entry point: Run Substreams Sink PostgreSQL
# Note: Environment variables will be injected by Cloudflare Container
CMD ["sh", "-c", "\
    substreams-sink-postgres run \
    ${DATABASE_URL} \
    mars-vaults-substreams-graph-v1.0.0.spkg \
    --endpoint=${SUBSTREAMS_ENDPOINT} \
    --plaintext=false \
    --final-blocks-only \
    --on-module-hash-mistmatch=warn \
    --undo-buffer-size=12 \
    --start-block=${START_BLOCK} \
    graph_out \
"]
