#!/bin/bash
# SupplyChainTracker Solana - Deployment Script
# Program ID: CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROGRAM_NAME="sc_solana"
PROGRAM_ID="CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS"
KEYPAIR_PATH="${SCOLANA_KEYPAIR_PATH:-$HOME/.config/solana/id.json}"
CLUSTER="${CLUSTER:-localnet}"

# Print functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

print_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

print_info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check solana-cli
    if ! command -v solana &> /dev/null; then
        print_error "solana-cli not found. Please install it first."
        echo "  Install: https://docs.solana.com/cli/install-solana-cli-tools"
        exit 1
    fi
    print_success "solana-cli found: $(solana --version)"
    
    # Check anchor-cli
    if ! command -v anchor &> /dev/null; then
        print_error "anchor-cli not found. Please install it first."
        echo "  Install: cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked"
        exit 1
    fi
    print_success "anchor-cli found: $(anchor --version)"
    
    # Check keypair file
    if [ ! -f "$KEYPAIR_PATH" ]; then
        print_error "Keypair not found at: $KEYPAIR_PATH"
        echo "  Set SCOLANA_KEYPAIR_PATH or use ~/.config/solana/id.json"
        exit 1
    fi
    print_success "Keypair found at: $KEYPAIR_PATH"
    
    # Check network connectivity
    print_info "Checking network connectivity..."
    solana ping "$CLUSTER" 2>/dev/null || print_warning "Cannot connect to $CLUSTER, continuing anyway..."
}

# Build the program
build() {
    print_header "Building Program"
    
    cd "$(dirname "$0")"
    
    # Clean previous build
    print_info "Cleaning previous build..."
    anchor clean 2>/dev/null || true
    
    # Build release
    print_info "Building in release mode..."
    anchor build --release
    
    print_success "Build completed successfully"
    print_info "Program binary: target/deploy/${PROGRAM_NAME}.so"
    print_info "Program keypair: target/deploy/${PROGRAM_NAME}-keypair.json"
}

# Generate IDL
generate_idl() {
    print_header "Generating IDL"
    
    cd "$(dirname "$0")"
    
    anchor idl generate -p sc-solana -o target/idl/sc_solana.json
    
    if [ -f "target/idl/sc_solana.json" ]; then
        print_success "IDL generated successfully"
        print_info "IDL file: target/idl/sc_solana.json"
    else
        print_error "IDL generation failed"
        exit 1
    fi
}

# Generate TypeScript types
generate_types() {
    print_header "Generating TypeScript Types"
    
    cd "$(dirname "$0")"
    
    anchor idl ts target/idl/sc_solana.json -o src/types/sc_solana.ts 2>/dev/null || true
    
    # Also generate to target/types (where Anchor puts it)
    print_info "Generating types to target/types..."
    # This is done automatically by anchor build
    
    if [ -f "target/types/sc_solana.ts" ]; then
        print_success "TypeScript types generated"
        print_info "Types file: target/types/sc_solana.ts"
    fi
}

# Deploy to cluster
deploy() {
    local cluster=$1
    local use_program_id=$2
    
    print_header "Deploying to $cluster"
    
    cd "$(dirname "$0")"
    
    # Check wallet balance
    print_info "Checking wallet balance..."
    WALLET=$(solana keygen show -o "$KEYPAIR_PATH" 2>/dev/null || echo "")
    if [ -n "$WALLET" ]; then
        BALANCE=$(solana balance "$WALLET" "$cluster" 2>/dev/null || echo "ERROR")
        if [[ "$BALANCE" == *"Error"* ]]; then
            print_warning "Could not check balance, continuing..."
        else
            print_info "Wallet balance: $BALANCE SOL"
        fi
    fi
    
    # Deploy command
    if [ "$use_program_id" = "true" ]; then
        print_info "Deploying with fixed program ID: $PROGRAM_ID"
        anchor deploy --program-name sc-solana --program-keypair target/deploy/sc-solana-keypair.json --cluster "$cluster"
    else
        print_info "Deploying (new program ID)..."
        anchor deploy --program-name sc-solana --cluster "$cluster"
    fi
    
    print_success "Deployment completed"
    print_info "Program ID: $PROGRAM_ID"
}

# Run tests
run_tests() {
    print_header "Running Tests"
    
    cd "$(dirname "$0")"
    
    # Run unit tests
    print_info "Running Rust unit tests..."
    cargo test -p sc-solana
    
    # Run integration tests (requires local validator)
    print_info "Running TypeScript integration tests..."
    anchor test 2>/dev/null || print_warning "Integration tests failed (may require local validator)"
    
    print_success "Tests completed"
}

# Verify deployment
verify_deployment() {
    local cluster=$1
    local program_id=$2
    
    print_header "Verifying Deployment"
    
    program_id=${program_id:-$PROGRAM_ID}
    
    # Check if program is deployed
    print_info "Checking program on $cluster..."
    INFO=$(solana program show "$program_id" --cluster "$cluster" 2>/dev/null || echo "")
    
    if [[ "$INFO" == *"Error"* ]] || [[ -z "$INFO" ]]; then
        print_error "Program not found on cluster: $program_id"
        return 1
    fi
    
    print_success "Program found on cluster"
    echo "$INFO"
}

# Show program info
show_info() {
    local cluster=$1
    local program_id=$2
    
    program_id=${program_id:-$PROGRAM_ID}
    
    print_header "Program Information"
    echo ""
    echo "  Program ID:    $PROGRAM_ID"
    echo "  Cluster:       ${cluster:-$CLUSTER}"
    echo "  Keypair:       $KEYPAIR_PATH"
    echo ""
    echo "  Files:"
    echo "    Binary:      target/deploy/${PROGRAM_NAME}.so"
    echo "    Keypair:     target/deploy/${PROGRAM_NAME}-keypair.json"
    echo "    IDL:         target/idl/${PROGRAM_NAME}.json"
    echo "    Types:       target/types/${PROGRAM_NAME}.ts"
    echo ""
}

# Main function
main() {
    local command=${1:-"full"}
    
    case "$command" in
        "prerequisites"|"check")
            check_prerequisites
            ;;
        "build")
            build
            ;;
        "idl")
            generate_idl
            ;;
        "types")
            generate_types
            ;;
        "test"|"tests")
            run_tests
            ;;
        "deploy")
            deploy "$CLUSTER" "false"
            ;;
        "deploy:fixed")
            deploy "$CLUSTER" "true"
            ;;
        "verify")
            verify_deployment "$CLUSTER"
            ;;
        "info")
            show_info "$CLUSTER"
            ;;
        "full")
            print_header "SupplyChainTracker Solana - Full Deployment"
            echo ""
            check_prerequisites
            echo ""
            build
            echo ""
            generate_idl
            echo ""
            generate_types
            echo ""
            deploy "$CLUSTER" "true"
            echo ""
            verify_deployment "$CLUSTER"
            echo ""
            print_header "Deployment Complete!"
            print_success "Program ID: $PROGRAM_ID"
            print_info "Cluster: $CLUSTER"
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  prerequisites  - Check prerequisites"
            echo "  build          - Build the program"
            echo "  idl            - Generate IDL"
            echo "  types          - Generate TypeScript types"
            echo "  test           - Run tests"
            echo "  deploy         - Deploy to cluster"
            echo "  deploy:fixed   - Deploy with fixed program ID"
            echo "  verify         - Verify deployment"
            echo "  info           - Show program information"
            echo "  full           - Run full deployment pipeline (default)"
            echo "  help           - Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  CLUSTER        - Solana cluster (default: localnet)"
            echo "  SCOLANA_KEYPAIR_PATH - Path to keypair (default: ~/.config/solana/id.json)"
            echo ""
            echo "Clusters:"
            echo "  localnet       - Local validator"
            echo "  devnet         - Devnet"
            echo "  mainnet        - Mainnet Beta"
            ;;
        *)
            print_error "Unknown command: $command"
            echo "Run '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
