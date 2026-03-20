#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROGRAM_ID="${1:-8qJjY3qeJc9cTGw3GRW7xVfN32B2j3YkM3p6N5cm6QkM}"

echo "[1/4] Building Anchor program"
cd "$ROOT_DIR/sol-program"
anchor build

echo "[2/4] Deploying to Devnet"
anchor deploy --provider.cluster Devnet

echo "[3/4] Updating Program ID references"
cd "$ROOT_DIR"

if [ -f "sol-dapp-web/.env.local" ]; then
  sed -i.bak "s/^NEXT_PUBLIC_PROGRAM_ID=.*/NEXT_PUBLIC_PROGRAM_ID=${PROGRAM_ID}/" "sol-dapp-web/.env.local" || true
fi

if [ -f "ai-engine/.env" ]; then
  if grep -q "^PROGRAM_ID=" "ai-engine/.env"; then
    sed -i.bak "s/^PROGRAM_ID=.*/PROGRAM_ID=${PROGRAM_ID}/" "ai-engine/.env"
  else
    echo "PROGRAM_ID=${PROGRAM_ID}" >> "ai-engine/.env"
  fi
fi

if [ -f "sol-dapp-app/.env" ]; then
  if grep -q "^EXPO_PUBLIC_PROGRAM_ID=" "sol-dapp-app/.env"; then
    sed -i.bak "s/^EXPO_PUBLIC_PROGRAM_ID=.*/EXPO_PUBLIC_PROGRAM_ID=${PROGRAM_ID}/" "sol-dapp-app/.env"
  else
    echo "EXPO_PUBLIC_PROGRAM_ID=${PROGRAM_ID}" >> "sol-dapp-app/.env"
  fi
fi

echo "[4/4] Done"
echo "Program ID set to ${PROGRAM_ID}"
