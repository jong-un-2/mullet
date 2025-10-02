# ============================================================
# Mars Vaults Substreams - Cloudflare Container
# ============================================================
# This container runs the Substreams Sink to continuously index
# Mars vault events from Solana into PostgreSQL (Neon)
# ============================================================

# Using DaoCloud mirror to avoid Docker Hub connectivity issues
FROM docker.m.daocloud.io/library/rust:1.90-slim-bookworm AS builder

# Install dependencies
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

# Create dummy main.rs to build dependencies
RUN mkdir -p src && \
    echo "fn main() {}" > src/main.rs && \
    echo "pub fn lib() {}" > src/lib.rs

# Build dependencies (cached layer)
RUN cargo build --release && \
    rm -rf src

# Copy actual source code
COPY src ./src
COPY proto ./proto
COPY build.rs ./

# Build the WASM module
RUN rustup target add wasm32-unknown-unknown && \
    cargo build --target wasm32-unknown-unknown --release

# ============================================================
# Runtime stage - Minimal image
# ============================================================
FROM docker.m.daocloud.io/library/debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    postgresql-client \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install substreams CLI
RUN curl -L https://github.com/streamingfast/substreams/releases/download/v1.10.0/substreams_linux_x86_64.tar.gz \
    | tar -xzf - -C /usr/local/bin && \
    chmod +x /usr/local/bin/substreams

# Install substreams-sink-sql (supports both PostgreSQL and other SQL databases)
RUN curl -L https://github.com/streamingfast/substreams-sink-sql/releases/download/v4.7.0/substreams-sink-sql_Linux_x86_64.tar.gz \
    | tar -xzf - -C /usr/local/bin && \
    chmod +x /usr/local/bin/substreams-sink-sql

WORKDIR /app

# Copy Substreams package from builder
COPY --from=builder /build/target/wasm32-unknown-unknown/release/*.wasm ./target/wasm32-unknown-unknown/release/

# Copy Substreams configuration and package
COPY substreams.yaml ./
COPY schema.sql ./

# Copy startup script if needed
COPY deploy-production.sh ./start.sh
RUN chmod +x start.sh

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:9102/metrics || exit 1

# Expose Prometheus metrics port
EXPOSE 9102

# Run as non-root user
RUN useradd -m -u 1000 substreams && \
    chown -R substreams:substreams /app
USER substreams

# Environment variables (will be overridden by Cloudflare)
ENV RUST_LOG=info
ENV SUBSTREAMS_ENDPOINT=mainnet.sol.streamingfast.io:443
ENV START_BLOCK=370500000
ENV OUTPUT_MODULE=map_vault_events

# Start the sink using from-proto method (Relational Mappings)
# This automatically creates table structure from protobuf definitions
CMD substreams-sink-sql from-proto \
    "${DATABASE_URL}" \
    "substreams.yaml" \
    "${OUTPUT_MODULE}" \
    --start-block="${START_BLOCK}" \
    --final-blocks-only \
    --on-module-hash-mistmatch=warn \
    --undo-buffer-size=12
