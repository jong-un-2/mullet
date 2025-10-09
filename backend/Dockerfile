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
    netcat-openbsd \
    coreutils \
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
COPY proto/ ./proto/

# Copy environment configuration (contains sensitive credentials)
COPY .env.substreams ./

# Copy container startup script
COPY start-container.sh ./start-container.sh
RUN chmod +x start-container.sh

# Expose health check port
EXPOSE 9102

# Accept non-sensitive build arguments from wrangler.toml [containers.image_vars]
ARG RUST_LOG=debug
ARG SUBSTREAMS_ENDPOINT=mainnet.sol.streamingfast.io:443
ARG START_BLOCK=372182088
ARG OUTPUT_MODULE=map_vault_events

# Run as non-root user
RUN useradd -m -u 1000 substreams && \
    chown -R substreams:substreams /app && \
    chmod 600 /app/.env.substreams
USER substreams

# Set non-sensitive environment variables from build args
ENV RUST_LOG=${RUST_LOG}
ENV SUBSTREAMS_ENDPOINT=${SUBSTREAMS_ENDPOINT}
ENV START_BLOCK=${START_BLOCK}
ENV OUTPUT_MODULE=${OUTPUT_MODULE}

# Sensitive data (DATABASE_URL, API keys) should be provided at runtime
# via Cloudflare secrets or container environment injection

# Start the container with monitoring and health check
CMD ["./start-container.sh"]
