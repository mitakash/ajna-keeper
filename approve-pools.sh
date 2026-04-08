#!/bin/bash

# Approve B_T2-B_T4 pool
echo "Approving B_T2 for B_T2-B_T4 pool..."
cast send 0xd8A0af85E2539e22953287b436255422724871AB \
  "approve(address,uint256)" \
  0x8948e6a77a70afb07a84f769605a3f4a8d4ee7ef \
  115792089237316195423570985008687907853269984665640564039457584007913129639935 \
  --keystore /Users/bigdellis/keystore-files/keeper-keystore2.json \
  --rpc-url https://base-mainnet.g.alchemy.com/v2/BGrpE_7pmP_VQwKMWN6hz

echo ""
echo "Approving B_T2 for factory..."
cast send 0xd8A0af85E2539e22953287b436255422724871AB \
  "approve(address,uint256)" \
  0x286F8c091933C7767baF5f9D03CD302E64efAaAE \
  115792089237316195423570985008687907853269984665640564039457584007913129639935 \
  --keystore /Users/bigdellis/keystore-files/keeper-keystore2.json \
  --rpc-url https://base-mainnet.g.alchemy.com/v2/BGrpE_7pmP_VQwKMWN6hz

echo ""
echo "✅ All approvals complete!"
