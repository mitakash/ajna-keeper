# Create V4 interfaces directory
echo "Creating contracts/interfaces/v4 directory..."
mkdir -p contracts/interfaces/v4

# IPoolManager.sol
echo "Creating IPoolManager.sol..."
cat > contracts/interfaces/v4/IPoolManager.sol << 'EOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { PoolKey } from "./PoolKey.sol";
import { BalanceDelta } from "./BalanceDelta.sol";
import { Currency } from "./Currency.sol";
import { PoolId } from "./PoolId.sol";

interface IPoolManager {
    struct SwapParams {
        bool zeroForOne;
        int256 amountSpecified;
        uint160 sqrtPriceLimitX96;
    }

    function unlock(bytes calldata data) external returns (bytes memory);
    
    function swap(
        PoolKey memory key,
        SwapParams memory params,
        bytes calldata hookData
    ) external returns (BalanceDelta);
    
    function settle() external payable returns (uint256);
    
    function take(
        Currency currency,
        address to,
        uint256 amount
    ) external;
    
    function getSlot0(PoolId id) external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 protocolFee,
        uint24 lpFee
    );
    
    function getLiquidity(PoolId id) external view returns (uint128);
}
EOF

# IUnlockCallback.sol
echo "Creating IUnlockCallback.sol..."
cat > contracts/interfaces/v4/IUnlockCallback.sol << 'EOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IUnlockCallback {
    function unlockCallback(bytes calldata data) external returns (bytes memory);
}
EOF

# IHooks.sol
echo "Creating IHooks.sol..."
cat > contracts/interfaces/v4/IHooks.sol << 'EOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IHooks {}
EOF

# PoolKey.sol
echo "Creating PoolKey.sol..."
cat > contracts/interfaces/v4/PoolKey.sol << 'EOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { Currency } from "./Currency.sol";
import { IHooks } from "./IHooks.sol";

struct PoolKey {
    Currency currency0;
    Currency currency1;
    uint24 fee;
    int24 tickSpacing;
    IHooks hooks;
}
EOF

# Currency.sol
echo "Creating Currency.sol..."
cat > contracts/interfaces/v4/Currency.sol << 'EOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

type Currency is address;

library CurrencyLibrary {
    function unwrap(Currency currency) internal pure returns (address) {
        return Currency.unwrap(currency);
    }
}
EOF

# BalanceDelta.sol
echo "Creating BalanceDelta.sol..."
cat > contracts/interfaces/v4/BalanceDelta.sol << 'EOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

type BalanceDelta is int256;

library BalanceDeltaLibrary {
    function amount0(BalanceDelta delta) internal pure returns (int128) {
        return int128(BalanceDelta.unwrap(delta) >> 128);
    }

    function amount1(BalanceDelta delta) internal pure returns (int128) {
        return int128(BalanceDelta.unwrap(delta));
    }
}
EOF

# PoolId.sol
echo "Creating PoolId.sol..."
cat > contracts/interfaces/v4/PoolId.sol << 'EOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { PoolKey } from "./PoolKey.sol";

type PoolId is bytes32;

library PoolIdLibrary {
    function toId(PoolKey memory poolKey) internal pure returns (PoolId) {
        return PoolId.wrap(keccak256(abi.encode(poolKey)));
    }
}
EOF

# StateLibrary.sol
echo "Creating StateLibrary.sol..."
cat > contracts/interfaces/v4/StateLibrary.sol << 'EOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { IPoolManager } from "./IPoolManager.sol";
import { PoolId } from "./PoolId.sol";

library StateLibrary {
    function getSlot0(IPoolManager manager, PoolId id) internal view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 protocolFee,
        uint24 lpFee
    ) {
        return manager.getSlot0(id);
    }
    
    function getLiquidity(IPoolManager manager, PoolId id) internal view returns (uint128) {
        return manager.getLiquidity(id);
    }
}
EOF

echo ""
echo "✅ All V4 interface files created successfully!"
echo ""
echo "📁 Files created:"
echo "   contracts/interfaces/v4/IPoolManager.sol"
echo "   contracts/interfaces/v4/IUnlockCallback.sol"
echo "   contracts/interfaces/v4/IHooks.sol"
echo "   contracts/interfaces/v4/PoolKey.sol"
echo "   contracts/interfaces/v4/Currency.sol"
echo "   contracts/interfaces/v4/BalanceDelta.sol"
echo "   contracts/interfaces/v4/PoolId.sol"
echo "   contracts/interfaces/v4/StateLibrary.sol"
echo ""
echo "🎯 Next steps:"
echo "   1. Copy UniswapV4KeeperTaker.sol (updated imports)"
echo "   2. Copy AjnaKeeperTakerFactory.sol"
echo "   3. Run: npx hardhat compile"
echo ""