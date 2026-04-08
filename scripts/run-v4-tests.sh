#!/bin/bash

# Uniswap V4 Integration Test Runner
# Usage: ./scripts/run-v4-tests.sh [test-suite]
# Options: atomic, post-auction, factory, all

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if environment variables are set
check_env() {
    echo -e "${BLUE}Checking environment variables...${NC}"

    if [ -z "$BASE_RPC_URL" ]; then
        echo -e "${RED}❌ BASE_RPC_URL not set${NC}"
        echo "   Set it with: export BASE_RPC_URL='https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY'"
        exit 1
    fi

    if [ -z "$KEEPER_KEYSTORE" ] || [ -z "$KEEPER_PASSWORD" ]; then
        echo -e "${YELLOW}⚠️  KEEPER_KEYSTORE or KEEPER_PASSWORD not set${NC}"
        echo "   Some tests will be skipped"
        echo "   Set them with:"
        echo "     export KEEPER_KEYSTORE='/path/to/keystore.json'"
        echo "     export KEEPER_PASSWORD='your_password'"
    else
        echo -e "${GREEN}✅ Environment variables configured${NC}"
    fi

    echo ""
}

# Display test info
display_info() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║        Uniswap V4 Integration Test Runner            ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Network:${NC} Base Mainnet (Chain ID: 8453)"
    echo -e "${GREEN}Pool:${NC} B_T1-B_T2 (0.3% fee tier)"
    echo ""
}

# Run specific test suite
run_test() {
    local test_name=$1
    local test_file=$2

    echo -e "${BLUE}Running ${test_name}...${NC}"
    echo ""

    if npm run integration-tests -- "$test_file"; then
        echo ""
        echo -e "${GREEN}✅ ${test_name} PASSED${NC}"
        return 0
    else
        echo ""
        echo -e "${RED}❌ ${test_name} FAILED${NC}"
        return 1
    fi
}

# Main execution
main() {
    display_info
    check_env

    local test_suite="${1:-all}"
    local failed=0

    case "$test_suite" in
        atomic)
            echo -e "${YELLOW}═══ Atomic Swap Tests ═══${NC}"
            echo ""
            run_test "Atomic Swap Tests" "src/integration-tests/uniswapV4-atomic-swap.test.ts" || ((failed++))
            ;;

        post-auction)
            echo -e "${YELLOW}═══ Post-Auction Swap Tests ═══${NC}"
            echo ""
            run_test "Post-Auction Tests" "src/integration-tests/uniswapV4-post-auction.test.ts" || ((failed++))
            ;;

        factory)
            echo -e "${YELLOW}═══ Factory End-to-End Tests ═══${NC}"
            echo ""
            run_test "Factory E2E Tests" "src/integration-tests/uniswapV4-factory-e2e.test.ts" || ((failed++))
            ;;

        actual)
            echo -e "${YELLOW}═══ Actual Deployed Configuration Tests ═══${NC}"
            echo ""
            run_test "Actual Config Tests" "src/integration-tests/uniswapV4-actual-config.test.ts" || ((failed++))
            ;;

        all)
            echo -e "${YELLOW}═══ Running All V4 Tests ═══${NC}"
            echo ""

            run_test "Atomic Swap Tests" "src/integration-tests/uniswapV4-atomic-swap.test.ts" || ((failed++))
            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""

            run_test "Post-Auction Tests" "src/integration-tests/uniswapV4-post-auction.test.ts" || ((failed++))
            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""

            run_test "Factory E2E Tests" "src/integration-tests/uniswapV4-factory-e2e.test.ts" || ((failed++))
            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""

            run_test "Actual Config Tests" "src/integration-tests/uniswapV4-actual-config.test.ts" || ((failed++))
            ;;

        *)
            echo -e "${RED}Invalid test suite: $test_suite${NC}"
            echo ""
            echo "Usage: $0 [test-suite]"
            echo ""
            echo "Available test suites:"
            echo "  atomic       - Atomic swap integration tests"
            echo "  post-auction - Post-auction reward exchange tests"
            echo "  factory      - Factory end-to-end tests"
            echo "  actual       - Tests with your deployed configuration"
            echo "  all          - Run all tests (default)"
            echo ""
            exit 1
            ;;
    esac

    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"

    if [ $failed -eq 0 ]; then
        echo -e "${BLUE}║${GREEN}                  ALL TESTS PASSED                    ${BLUE}║${NC}"
        echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${GREEN}✨ Uniswap V4 integration is working correctly!${NC}"
        exit 0
    else
        echo -e "${BLUE}║${RED}              $failed TEST SUITE(S) FAILED               ${BLUE}║${NC}"
        echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${RED}⚠️  Check test logs above for details${NC}"
        exit 1
    fi
}

# Run main function
main "$@"
