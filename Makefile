.PHONY: help install compile build test test-unit test-integration test-prices clean format start start-dry keystore fork-base

# Default target
.DEFAULT_GOAL := help

## help: Show this help message
help:
	@echo "Ajna Keeper - Available Commands"
	@echo ""
	@grep -E '^## ' $(MAKEFILE_LIST) | \
		sed 's/^## //' | \
		awk -F: '{printf "  %-20s %s\n", $$1, $$2}'
	@echo ""

## install: Install dependencies
install:
	@echo "Installing dependencies..."
	@yarn install --frozen-lockfile || (rm -f yarn.lock && yarn install)

## compile: Compile contracts and generate types
compile:
	@echo "Compiling contracts..."
	@yarn compile

## build: Install and compile everything
build: install compile
	@echo "Build complete!"

## test: Run all tests (unit + integration)
test: test-unit test-integration
	@echo "All tests complete!"

## test-unit: Run unit tests
test-unit:
	@echo "Running unit tests..."
	@yarn unit-tests

## test-integration: Run integration tests (requires hardhat node)
test-integration:
	@echo "Running integration tests..."
	@echo "Note: Run 'make fork-base' in another terminal first"
	@yarn integration-tests

## test-prices: Test price APIs (Alchemy and CoinGecko)
test-prices:
	@echo "Testing Alchemy Prices API..."
	@npx ts-node test-alchemy-prices.ts
	@echo ""
	@echo "Testing price fallback system..."
	@npx ts-node test-price-fallback.ts
	@echo ""
	@echo "Testing CANA price..."
	@npx ts-node test-cana-price.ts

## start: Start keeper with specified config (e.g., make start base-config.ts)
start:
	@config="$(CONFIG)$(filter-out $@,$(MAKECMDGOALS))"; \
	if [ -z "$$config" ]; then \
		echo "Usage: make start <config-file>"; \
		echo "Example: make start base-config.ts"; \
		echo "     or: make start CONFIG=base-config.ts"; \
		exit 1; \
	fi; \
	echo "Starting keeper with $$config..."; \
	yarn start --config $$config

## start-dry: Start keeper in dry-run mode (e.g., make start-dry base-config.ts)
start-dry:
	@config="$(CONFIG)$(filter-out $@,$(MAKECMDGOALS))"; \
	if [ -z "$$config" ]; then \
		echo "Usage: make start-dry <config-file>"; \
		echo "Example: make start-dry base-config.ts"; \
		echo "     or: make start-dry CONFIG=base-config.ts"; \
		exit 1; \
	fi; \
	echo "Starting keeper in DRY-RUN mode with $$config..."; \
	echo "Note: No transactions will be submitted"; \
	yarn start --config $$config

# Allow config file to be passed as argument without error
%:
	@:

## keystore: Create a new encrypted keystore
keystore:
	@echo "Creating new keystore..."
	@yarn create-keystore

## fork-base: Start local Base fork for testing
fork-base:
	@echo "Starting Base fork on localhost:8545..."
	@yarn fork-base

## format: Format code with prettier
format:
	@echo "Formatting code..."
	@yarn format

## clean: Remove build artifacts and dependencies
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf node_modules
	@rm -rf artifacts
	@rm -rf cache
	@rm -rf typechain-types
	@rm -f yarn.lock
	@echo "Clean complete!"

## clean-test: Remove test artifacts only
clean-test:
	@echo "Cleaning test artifacts..."
	@rm -f test-*.ts
	@echo "Test artifacts removed!"

## env-check: Verify .env configuration
env-check:
	@echo "Checking .env configuration..."
	@if [ ! -f .env ]; then \
		echo "⚠ .env file not found! Copy from .env.example"; \
		echo "  cp .env.example .env"; \
		exit 1; \
	fi
	@echo "✓ .env file exists"
	@grep -q "ALCHEMY_API_KEY" .env && echo "✓ ALCHEMY_API_KEY configured" || echo "⚠ ALCHEMY_API_KEY not set"
	@grep -q "GRAPH_API_KEY" .env && echo "✓ GRAPH_API_KEY configured" || echo "⚠ GRAPH_API_KEY not set"
	@grep -q "COINGECKO_API_KEY" .env && echo "✓ COINGECKO_API_KEY configured" || echo "⚠ COINGECKO_API_KEY not set (optional)"

## setup: Complete first-time setup
setup:
	@echo "Setting up Ajna Keeper..."
	@if [ ! -f .env ]; then \
		echo "Creating .env from .env.example..."; \
		cp .env.example .env; \
		echo "⚠ Please edit .env and add your API keys"; \
	fi
	@$(MAKE) build
	@echo ""
	@echo "Setup complete!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Edit .env and add your API keys"
	@echo "  2. Create a config file: cp example-base-config.ts config.ts"
	@echo "  3. Create a keystore: make keystore"
	@echo "  4. Run in dry-run mode: make start config.ts"
