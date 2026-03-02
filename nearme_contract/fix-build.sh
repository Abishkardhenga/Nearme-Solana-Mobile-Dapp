#!/bin/bash

echo "🔧 Fixing Solana/Anchor Build Environment"
echo "========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Remove problematic blake3 from cache
echo -e "\n${YELLOW}Step 1: Clearing problematic cargo cache...${NC}"
rm -rf ~/.cargo/registry/src/index.crates.io-6f17d22bba15001f/blake3-1.8.3
echo -e "${GREEN}✓ Cache cleared${NC}"

# 2. Update Rust to latest stable
echo -e "\n${YELLOW}Step 2: Updating Rust toolchain...${NC}"
rustup update stable
rustup default stable
echo -e "${GREEN}✓ Rust updated${NC}"

# 3. Update Solana
echo -e "\n${YELLOW}Step 3: Updating Solana CLI...${NC}"
sh -c "$(curl -sSfL https://release.solana.com/stable/install)" || {
    echo -e "${RED}✗ Solana update failed${NC}"
    echo "Trying alternative install method..."
    brew install solana || echo "Please install Solana manually from https://docs.solana.com/cli/install-solana-cli-tools"
}
echo -e "${GREEN}✓ Solana updated${NC}"

# 4. Update Anchor
echo -e "\n${YELLOW}Step 4: Updating Anchor CLI...${NC}"
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked --force || {
    echo -e "${RED}✗ Anchor update failed${NC}"
    echo "You may need to install Anchor manually"
}
echo -e "${GREEN}✓ Anchor updated${NC}"

# 5. Clean cargo registry
echo -e "\n${YELLOW}Step 5: Cleaning cargo registry...${NC}"
cargo clean
rm -rf ~/.cargo/registry/index/*
rm -rf ~/.cargo/registry/cache/*
echo -e "${GREEN}✓ Registry cleaned${NC}"

# 6. Verify versions
echo -e "\n${YELLOW}Verifying installation...${NC}"
echo "Rust version:"
rustc --version
echo "Cargo version:"
cargo --version
echo "Solana version:"
solana --version
echo "Anchor version:"
anchor --version

echo -e "\n${GREEN}=========================================${NC}"
echo -e "${GREEN}✓ Environment setup complete!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. cd nearme_contract"
echo "2. anchor build"
echo "3. anchor test"
