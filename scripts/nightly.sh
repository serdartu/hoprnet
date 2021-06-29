#!/bin/bash
set -e #u

source scripts/testnet.sh
source scripts/cleanup.sh

# ----- Nightly integration / network test. --------

if [ -z "${RPC:-}" ] && [ "${RPC_NETWORK:-}" = "goerli" ]; then
  RPC=https://eth-goerli.gateway.pokt.network/v1/6021a2b6928ff9002e6c7f2f
elif [ -z "${RPC:-}" ] && [ "${RPC_NETWORK:-}" = "xdai" ]; then
  RPC=https://still-patient-forest.xdai.quiknode.pro/f0cdbd6455c0b3aea8512fc9e7d161c1c0abf66a/
elif [ "${RPC_NETWORK:-}" != "xdai" ] && [ "${RPC_NETWORK:-}" != "goerli" ]; then
  echo "Missing supported RPC_NETWORK"
  exit 1
fi

# Get version from package.json
RELEASE=$(node -p -e "require('./packages/hoprd/package.json').version")
IMG="gcr.io/hoprassociation/hoprd:$RELEASE"

echo "Cleaning up devops before running nightly testnet"
cleanup
echo "Starting nightly testnet"
start_testnet nightly 2 $IMG "${RPC}"
echo "Testnet up and running. Leaving it for 20 mins"
sleep 72000 # 20mins
echo "Testnet has run for 20m, time to kill it."
gcloud_get_logs nightly-node-2 $IMG > node-2.txt
cleanup
