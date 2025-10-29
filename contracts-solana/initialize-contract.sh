#!/bin/bash

###############################################################################
# Mars Protocol - Contract Initialization Script
# 
# This script handles all contract initialization tasks:
# 1. Initialize GlobalState
# 2. Create shares mint
# 3. Initialize Vault
# 4. Configure fee tiers
# 5. Set protocol fee
# 6. Update platform fee wallet
# 7. Update global state parameters
# 8. Verify all configurations
#
# Usage: ./initialize-contract.sh [OPTIONS]
# 
# Options:
#   --init-global-state     Initialize GlobalState PDA
#   --create-shares-mint    Create shares mint token
#   --init-vault            Initialize Kamino vault
#   --set-fee-tiers         Configure transaction fee tiers
#   --set-protocol-fee      Set protocol fee fraction
#   --set-platform-wallet   Create and set platform fee wallet
#   --update-params         Update global state parameters
#   --all                   Execute all initialization steps
#   
#   --vault-id <ADDRESS>    Kamino vault address (required for --init-vault)
#   --platform-fee <BPS>    Platform fee in basis points (default: 2500 = 25%)
#   --protocol-fee <N/D>    Protocol fee fraction (default: 1/100 = 1%)
#   --keypair <PATH>        Admin keypair path (default: phantom-wallet.json)
#   --env <ENV>             Environment (default: mainnet-beta)
#   --help                  Show this help message
#
# Examples:
#   ./initialize-contract.sh --all
#   ./initialize-contract.sh --init-global-state --set-fee-tiers
#   ./initialize-contract.sh --init-vault --vault-id A2ws...
#
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Default configuration
DO_INIT_GLOBAL_STATE=false
DO_CREATE_SHARES_MINT=false
DO_INIT_VAULT=false
DO_SET_FEE_TIERS=false
DO_SET_PROTOCOL_FEE=false
DO_SET_PLATFORM_WALLET=false
DO_UPDATE_PARAMS=false
DO_ALL=false

VAULT_ID=""
BASE_TOKEN_MINT="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"  # USDC mainnet
PLATFORM_FEE_BPS=2500
PROTOCOL_FEE_NUM=1
PROTOCOL_FEE_DENOM=100
KEYPAIR="phantom-wallet.json"
ENV="mainnet-beta"

# Global state parameters
REBALANCE_THRESHOLD=80
CROSS_CHAIN_FEE_BPS=30
MAX_ORDER_AMOUNT=100000000000

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --init-global-state)
      DO_INIT_GLOBAL_STATE=true
      shift
      ;;
    --create-shares-mint)
      DO_CREATE_SHARES_MINT=true
      shift
      ;;
    --init-vault)
      DO_INIT_VAULT=true
      shift
      ;;
    --set-fee-tiers)
      DO_SET_FEE_TIERS=true
      shift
      ;;
    --set-protocol-fee)
      DO_SET_PROTOCOL_FEE=true
      shift
      ;;
    --set-platform-wallet)
      DO_SET_PLATFORM_WALLET=true
      shift
      ;;
    --update-params)
      DO_UPDATE_PARAMS=true
      shift
      ;;
    --all)
      DO_ALL=true
      shift
      ;;
    --vault-id)
      VAULT_ID="$2"
      shift 2
      ;;
    --platform-fee)
      PLATFORM_FEE_BPS="$2"
      shift 2
      ;;
    --protocol-fee)
      IFS='/' read -r PROTOCOL_FEE_NUM PROTOCOL_FEE_DENOM <<< "$2"
      shift 2
      ;;
    --keypair)
      KEYPAIR="$2"
      shift 2
      ;;
    --env)
      ENV="$2"
      shift 2
      ;;
    --help)
      head -n 40 "$0" | grep "^#" | sed 's/^# //'
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# If --all is set, enable all operations
if [ "$DO_ALL" = true ]; then
  DO_INIT_GLOBAL_STATE=true
  DO_CREATE_SHARES_MINT=true
  DO_INIT_VAULT=true
  DO_SET_FEE_TIERS=true
  DO_SET_PROTOCOL_FEE=true
  # Platform wallet and params update are optional, ask user
fi

# Helper functions
log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

log_section() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

log_step() {
  echo -e "${MAGENTA}▶ $1${NC}"
}

pause_for_confirmation() {
  echo ""
  read -p "Press Enter to continue or Ctrl+C to abort..."
  echo ""
}

# Check if any action is selected
check_actions() {
  if [ "$DO_INIT_GLOBAL_STATE" = false ] && \
     [ "$DO_CREATE_SHARES_MINT" = false ] && \
     [ "$DO_INIT_VAULT" = false ] && \
     [ "$DO_SET_FEE_TIERS" = false ] && \
     [ "$DO_SET_PROTOCOL_FEE" = false ] && \
     [ "$DO_SET_PLATFORM_WALLET" = false ] && \
     [ "$DO_UPDATE_PARAMS" = false ]; then
    log_error "No action selected. Use --help to see available options."
    exit 1
  fi
}

# Check prerequisites
check_prerequisites() {
  log_section "Checking Prerequisites"
  
  if [ ! -f "$KEYPAIR" ]; then
    log_error "Keypair file not found: $KEYPAIR"
    exit 1
  fi
  
  if ! command -v npm &> /dev/null; then
    log_error "npm not found. Please install Node.js and npm."
    exit 1
  fi
  
  if ! command -v solana &> /dev/null; then
    log_error "solana CLI not found. Please install Solana CLI."
    exit 1
  fi
  
  ADMIN_PUBKEY=$(solana address -k "$KEYPAIR")
  PROGRAM_ID=$(solana address -k target/deploy/mars-keypair.json 2>/dev/null || echo "Unknown")
  
  log_success "Prerequisites check passed"
  echo "  • Environment: $ENV"
  echo "  • Admin: $ADMIN_PUBKEY"
  echo "  • Program ID: $PROGRAM_ID"
}

# Show execution plan
show_execution_plan() {
  log_section "Execution Plan"
  
  echo "📋 The following operations will be performed:"
  echo ""
  
  [ "$DO_INIT_GLOBAL_STATE" = true ] && echo "  ✓ Initialize GlobalState PDA"
  [ "$DO_CREATE_SHARES_MINT" = true ] && echo "  ✓ Create shares mint token"
  [ "$DO_INIT_VAULT" = true ] && echo "  ✓ Initialize Vault (vault_id: ${VAULT_ID:-NOT SET})"
  [ "$DO_SET_FEE_TIERS" = true ] && echo "  ✓ Configure transaction fee tiers"
  [ "$DO_SET_PROTOCOL_FEE" = true ] && echo "  ✓ Set protocol fee ($PROTOCOL_FEE_NUM/$PROTOCOL_FEE_DENOM)"
  [ "$DO_SET_PLATFORM_WALLET" = true ] && echo "  ✓ Create and set platform fee wallet"
  [ "$DO_UPDATE_PARAMS" = true ] && echo "  ✓ Update global state parameters"
  
  echo ""
  log_warning "Review the plan carefully before proceeding"
  pause_for_confirmation
}

# 1. Initialize GlobalState
initialize_global_state() {
  if [ "$DO_INIT_GLOBAL_STATE" = false ]; then
    return
  fi
  
  log_section "Step 1: Initialize GlobalState"
  
  log_step "Running init command..."
  npm run script init -- --env "$ENV" --keypair "$KEYPAIR"
  
  log_success "GlobalState initialized successfully"
  
  # Query and display
  echo ""
  log_info "Querying GlobalState..."
  sleep 2
  npx ts-node ops/query/kamino-query-global-state.ts 2>/dev/null || log_warning "Could not query state (may need to wait for confirmation)"
}

# 2. Create shares mint
create_shares_mint() {
  if [ "$DO_CREATE_SHARES_MINT" = false ]; then
    return
  fi
  
  log_section "Step 2: Create Shares Mint"
  
  if [ -f "shares-mint-keypair.json" ]; then
    SHARES_MINT=$(solana address -k shares-mint-keypair.json)
    log_warning "Shares mint keypair already exists: $SHARES_MINT"
    read -p "Do you want to create a new one? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      log_info "Using existing shares mint: $SHARES_MINT"
      return
    fi
    mv shares-mint-keypair.json "shares-mint-keypair.json.backup.$(date +%s)"
    log_info "Backed up existing keypair"
  fi
  
  log_step "Generating shares mint keypair..."
  solana-keygen new --no-bip39-passphrase --outfile shares-mint-keypair.json
  
  SHARES_MINT=$(solana address -k shares-mint-keypair.json)
  
  log_step "Creating shares mint on-chain..."
  npx ts-node ops/deployment/create-shares-mint.ts
  
  log_success "Shares mint created successfully"
  echo "  • Mint Address: $SHARES_MINT"
  echo "  • Decimals: 6"
  echo "  • Mint Authority: $(solana address -k "$KEYPAIR")"
}

# 3. Initialize Vault
initialize_vault() {
  if [ "$DO_INIT_VAULT" = false ]; then
    return
  fi
  
  log_section "Step 3: Initialize Vault"
  
  if [ -z "$VAULT_ID" ]; then
    log_error "Vault ID is required. Use --vault-id <ADDRESS>"
    exit 1
  fi
  
  if [ ! -f "shares-mint-keypair.json" ]; then
    log_error "Shares mint keypair not found. Run --create-shares-mint first."
    exit 1
  fi
  
  SHARES_MINT=$(solana address -k shares-mint-keypair.json)
  
  log_step "Initializing Vault with:"
  echo "  • Vault ID: $VAULT_ID"
  echo "  • Base Token: $BASE_TOKEN_MINT (USDC)"
  echo "  • Shares Mint: $SHARES_MINT"
  echo "  • Platform Fee: $PLATFORM_FEE_BPS bps ($(bc <<< "scale=2; $PLATFORM_FEE_BPS/100")%)"
  echo ""
  
  npm run script initialize-vault -- \
    --env "$ENV" \
    --keypair "$KEYPAIR" \
    --vault_id "$VAULT_ID" \
    --base_token_mint "$BASE_TOKEN_MINT" \
    --shares_mint "$SHARES_MINT" \
    --fee_bps "$PLATFORM_FEE_BPS"
  
  log_success "Vault initialized successfully"
}

# 4. Set fee tiers
set_fee_tiers() {
  if [ "$DO_SET_FEE_TIERS" = false ]; then
    return
  fi
  
  log_section "Step 4: Configure Fee Tiers"
  
  log_step "Setting transaction fee tiers:"
  echo "  • Tier 1: Amount ≥ 0     → 3 bps (0.03%)"
  echo "  • Tier 2: Amount ≥ 100   → 2 bps (0.02%)"
  echo "  • Tier 3: Amount ≥ 1,000 → 1 bps (0.01%)"
  echo ""
  
  npm run script set-fee-tiers -- --env "$ENV" --keypair "$KEYPAIR"
  
  log_success "Fee tiers configured successfully"
}

# 5. Set protocol fee
set_protocol_fee() {
  if [ "$DO_SET_PROTOCOL_FEE" = false ]; then
    return
  fi
  
  log_section "Step 5: Set Protocol Fee"
  
  PROTOCOL_FEE_PERCENT=$(bc <<< "scale=2; $PROTOCOL_FEE_NUM*100/$PROTOCOL_FEE_DENOM")
  
  log_step "Setting protocol fee:"
  echo "  • Numerator: $PROTOCOL_FEE_NUM"
  echo "  • Denominator: $PROTOCOL_FEE_DENOM"
  echo "  • Percentage: $PROTOCOL_FEE_PERCENT%"
  echo ""
  
  npm run script set-protocol-fee-fraction -- \
    --env "$ENV" \
    --keypair "$KEYPAIR" \
    -n "$PROTOCOL_FEE_NUM" \
    -d "$PROTOCOL_FEE_DENOM"
  
  log_success "Protocol fee configured successfully"
}

# 6. Create and set platform fee wallet
set_platform_fee_wallet() {
  if [ "$DO_SET_PLATFORM_WALLET" = false ]; then
    return
  fi
  
  log_section "Step 6: Platform Fee Wallet Setup"
  
  if [ -f "platform-fee-wallet.json" ]; then
    PLATFORM_FEE_WALLET=$(solana address -k platform-fee-wallet.json)
    log_warning "Platform fee wallet keypair already exists: $PLATFORM_FEE_WALLET"
    read -p "Do you want to create a new one? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      log_info "Using existing platform fee wallet"
      read -p "Update contract to use this wallet? (y/N): " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return
      fi
    else
      mv platform-fee-wallet.json "platform-fee-wallet.json.backup.$(date +%s)"
      log_info "Backed up existing keypair"
    fi
  fi
  
  if [ ! -f "platform-fee-wallet.json" ]; then
    log_step "Generating platform fee wallet keypair..."
    solana-keygen new --no-bip39-passphrase --outfile platform-fee-wallet.json
  fi
  
  PLATFORM_FEE_WALLET=$(solana address -k platform-fee-wallet.json)
  
  log_step "Updating platform fee wallet in contract..."
  npm run script update-platform-fee-wallet -- \
    --env "$ENV" \
    --keypair "$KEYPAIR" \
    -w "$PLATFORM_FEE_WALLET"
  
  log_success "Platform fee wallet configured successfully"
  echo "  • Wallet Address: $PLATFORM_FEE_WALLET"
  echo ""
  log_warning "IMPORTANT: Backup platform-fee-wallet.json securely!"
}

# 7. Update global state parameters
update_global_state_params() {
  if [ "$DO_UPDATE_PARAMS" = false ]; then
    return
  fi
  
  log_section "Step 7: Update Global State Parameters"
  
  log_step "Updating parameters:"
  echo "  • Rebalance Threshold: $REBALANCE_THRESHOLD%"
  echo "  • Cross Chain Fee: $CROSS_CHAIN_FEE_BPS bps ($(bc <<< "scale=2; $CROSS_CHAIN_FEE_BPS/100")%)"
  echo "  • Max Order Amount: $MAX_ORDER_AMOUNT"
  echo ""
  
  npm run script update-global-state-params -- \
    --env "$ENV" \
    --keypair "$KEYPAIR" \
    -rt "$REBALANCE_THRESHOLD" \
    -cfb "$CROSS_CHAIN_FEE_BPS" \
    -moa "$MAX_ORDER_AMOUNT"
  
  log_success "Global state parameters updated successfully"
}

# 8. Verify all configurations
verify_configuration() {
  log_section "Verification: Contract Configuration"
  
  log_step "Querying contract state..."
  echo ""
  
  npx ts-node ops/query/kamino-query-global-state.ts
  
  log_success "Configuration verification complete"
}

# Show final summary
show_final_summary() {
  log_section "🎉 Initialization Complete!"
  
  ADMIN_PUBKEY=$(solana address -k "$KEYPAIR")
  PROGRAM_ID=$(solana address -k target/deploy/mars-keypair.json 2>/dev/null || echo "Unknown")
  
  echo "📊 Summary of Initialized Components:"
  echo ""
  
  if [ "$DO_INIT_GLOBAL_STATE" = true ]; then
    echo "✅ GlobalState:"
    echo "   • PDA: (calculated on-chain)"
    echo "   • Admin: $ADMIN_PUBKEY"
    echo ""
  fi
  
  if [ "$DO_CREATE_SHARES_MINT" = true ] && [ -f "shares-mint-keypair.json" ]; then
    SHARES_MINT=$(solana address -k shares-mint-keypair.json)
    echo "✅ Shares Mint:"
    echo "   • Address: $SHARES_MINT"
    echo "   • Decimals: 6"
    echo ""
  fi
  
  if [ "$DO_INIT_VAULT" = true ]; then
    echo "✅ Vault:"
    echo "   • Vault ID: $VAULT_ID"
    echo "   • Base Token: $BASE_TOKEN_MINT (USDC)"
    echo "   • Platform Fee: $PLATFORM_FEE_BPS bps ($(bc <<< "scale=2; $PLATFORM_FEE_BPS/100")%)"
    echo ""
  fi
  
  if [ "$DO_SET_FEE_TIERS" = true ]; then
    echo "✅ Fee Tiers: 3 tiers configured (0.01% - 0.03%)"
    echo ""
  fi
  
  if [ "$DO_SET_PROTOCOL_FEE" = true ]; then
    PROTOCOL_FEE_PERCENT=$(bc <<< "scale=2; $PROTOCOL_FEE_NUM*100/$PROTOCOL_FEE_DENOM")
    echo "✅ Protocol Fee: $PROTOCOL_FEE_NUM/$PROTOCOL_FEE_DENOM ($PROTOCOL_FEE_PERCENT%)"
    echo ""
  fi
  
  if [ "$DO_SET_PLATFORM_WALLET" = true ] && [ -f "platform-fee-wallet.json" ]; then
    PLATFORM_FEE_WALLET=$(solana address -k platform-fee-wallet.json)
    echo "✅ Platform Fee Wallet: $PLATFORM_FEE_WALLET"
    echo ""
  fi
  
  if [ "$DO_UPDATE_PARAMS" = true ]; then
    echo "✅ Global Parameters Updated:"
    echo "   • Rebalance Threshold: $REBALANCE_THRESHOLD%"
    echo "   • Cross Chain Fee: $CROSS_CHAIN_FEE_BPS bps"
    echo "   • Max Order Amount: $MAX_ORDER_AMOUNT"
    echo ""
  fi
  
  echo "🔗 Program Information:"
  echo "   • Program ID: $PROGRAM_ID"
  echo "   • Environment: $ENV"
  echo "   • Solscan: https://solscan.io/account/$PROGRAM_ID"
  echo ""
  
  echo "📝 Important Files to Backup:"
  echo "   • Admin keypair: $KEYPAIR"
  [ -f "shares-mint-keypair.json" ] && echo "   • Shares mint: shares-mint-keypair.json"
  [ -f "platform-fee-wallet.json" ] && echo "   • Platform fee wallet: platform-fee-wallet.json"
  echo ""
  
  log_success "All initialization tasks completed successfully! 🚀"
  echo ""
  log_info "Run './initialize-contract.sh --help' to see all available options"
}

# Main execution
main() {
  echo ""
  echo "╔═══════════════════════════════════════════════════════════════╗"
  echo "║                                                               ║"
  echo "║       Mars Protocol - Contract Initialization Script         ║"
  echo "║              Configure and Initialize Contract                ║"
  echo "║                                                               ║"
  echo "╚═══════════════════════════════════════════════════════════════╝"
  echo ""
  
  check_actions
  check_prerequisites
  show_execution_plan
  
  # Execute initialization steps
  initialize_global_state
  create_shares_mint
  initialize_vault
  set_fee_tiers
  set_protocol_fee
  set_platform_fee_wallet
  update_global_state_params
  
  # Verify configuration
  verify_configuration
  
  # Show final summary
  show_final_summary
}

# Run main function
main "$@"
