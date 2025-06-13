// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { IERC20Pool, PoolDeployer } from "../AjnaInterfaces.sol";
import { IERC20 } from "../OneInchInterfaces.sol";
import { IAjnaKeeperTaker } from "../interfaces/IAjnaKeeperTaker.sol";

/// @notice Factory contract that routes take requests to appropriate taker implementations
/// @dev Maintains backward compatibility while enabling multi-DEX support
contract AjnaKeeperTakerFactory {
    /// @dev Hash used for all ERC20 pools, used for pool validation
    bytes32 public constant ERC20_NON_SUBSET_HASH = keccak256("ERC20_NON_SUBSET_HASH");
    /// @dev Actor allowed to take auctions using this factory
    address public immutable owner;
    /// @dev Identifies the Ajna deployment, used to validate pools
    PoolDeployer public immutable poolFactory;
    /// @dev Maps LiquiditySource to taker contract addresses
    mapping(IAjnaKeeperTaker.LiquiditySource => address) public takerContracts;
    /// @dev Maps taker addresses to their supported sources for validation
    mapping(address => IAjnaKeeperTaker.LiquiditySource[]) public takerSources;

    // Events
    event TakerUpdated(IAjnaKeeperTaker.LiquiditySource indexed source, address indexed oldTaker, address indexed newTaker);
    event TakeExecuted(address indexed pool, address indexed borrower, IAjnaKeeperTaker.LiquiditySource indexed source, address taker);
    // AUDIT FIX: Add new event for monitoring recovery
    event TokenRecovered(IAjnaKeeperTaker.LiquiditySource indexed source, address indexed token, address indexed taker);

    // Errors
    error Unauthorized();          // sig: 0x82b42900
    error InvalidPool();           // sig: 0x2083cd40
    error UnsupportedSource();     // sig: 0xf54a7ed9
    error TakerNotSet();           // sig: 0x1f2a2005
    error InvalidTaker();          // sig: 0x8baa579f

    /// @param ajnaErc20PoolFactory Ajna ERC20 pool factory for this deployment
    constructor(PoolDeployer ajnaErc20PoolFactory) {
        owner = msg.sender;
        poolFactory = ajnaErc20PoolFactory;
    }

    /// @notice Owner can set or update taker contracts for specific liquidity sources
    /// @param source The liquidity source this taker will handle
    /// @param takerAddress Address of the taker contract implementing IAjnaKeeperTaker
    function setTaker(IAjnaKeeperTaker.LiquiditySource source, address takerAddress) external onlyOwner {
        // AUDIT FIX: Revert on invalid source early
        require(source != IAjnaKeeperTaker.LiquiditySource.None, "Invalid source");
        
        address oldTaker = takerContracts[source];
        
        if (takerAddress != address(0)) {
            // AUDIT FIX: Use try/catch for safe external calls to untrusted contracts
            try IAjnaKeeperTaker(takerAddress).isSourceSupported(source) returns (bool supported) {
                require(supported, "Source not supported");
            } catch {
                revert InvalidTaker();
            }

            try IAjnaKeeperTaker(takerAddress).owner() returns (address takerOwner) {
                require(takerOwner == owner, "Owner mismatch");
            } catch {
                revert InvalidTaker();
            }
        }
        
        takerContracts[source] = takerAddress;
        emit TakerUpdated(source, oldTaker, takerAddress);
    }

    /// @notice Routes take requests to the appropriate taker implementation
    /// @param pool ERC20 pool with an active auction
    /// @param borrowerAddress Identifies the liquidation to take
    /// @param auctionPrice Last known price of the auction, in `WAD` precision
    /// @param maxAmount Limit collateral to take from the auction, in `WAD` precision
    /// @param source Identifies the source of liquidity to use for the swap
    /// @param swapRouter Address of the router to use for the swap
    /// @param swapDetails Source-specific data needed to perform the swap
    function takeWithAtomicSwap(
        IERC20Pool pool,
        address borrowerAddress,
        uint256 auctionPrice,
        uint256 maxAmount,
        IAjnaKeeperTaker.LiquiditySource source,
        address swapRouter,
        bytes calldata swapDetails
    ) external onlyOwner {
        // Validate pool is from our Ajna deployment
        if (!_validatePool(pool)) revert InvalidPool();
        // Get the appropriate taker for this source
        address takerAddress = takerContracts[source];
        if (takerAddress == address(0)) revert TakerNotSet();
        
        // Delegate to the specific taker implementation
        IAjnaKeeperTaker taker = IAjnaKeeperTaker(takerAddress);
        taker.takeWithAtomicSwap(
            pool,
            borrowerAddress,
            auctionPrice,
            maxAmount,
            source,
            swapRouter,
            swapDetails
        );
        emit TakeExecuted(address(pool), borrowerAddress, source, takerAddress);
    }

    /// @notice Owner may call to recover tokens from any taker contract
    /// @param source The liquidity source whose taker should recover tokens
    /// @param token The ERC20 token to recover
    function recoverFromTaker(IAjnaKeeperTaker.LiquiditySource source, IERC20 token) external onlyOwner {
        address takerAddress = takerContracts[source];
        if (takerAddress == address(0)) revert TakerNotSet();
        
        // AUDIT FIX: Use try/catch for safe external call and enhanced error handling
        try IAjnaKeeperTaker(takerAddress).recover(token) {
            // Success, emit event for monitoring
            emit TokenRecovered(source, address(token), takerAddress);
        } catch Error(string memory reason) {
            revert(reason);
        } catch {
            revert("Recovery failed");
        }
    }

    /// @notice Returns all configured taker addresses and their sources
    /// @return sources Array of liquidity sources with configured takers
    /// @return takers Array of taker addresses corresponding to sources
    function getConfiguredTakers() external view returns (
        IAjnaKeeperTaker.LiquiditySource[] memory sources,
        address[] memory takers
    ) {
        // Count non-zero takers
        uint256 count = 0;
        for (uint8 i = 1; i < 5; i++) { // Skip None(0), check OneInch(1) through Curve(4)
            if (takerContracts[IAjnaKeeperTaker.LiquiditySource(i)] != address(0)) {
                count++;
            }
        }
        
        // Populate arrays
        sources = new IAjnaKeeperTaker.LiquiditySource[](count);
        takers = new address[](count);
        uint256 index = 0;
        
        for (uint8 i = 1; i < 5; i++) {
            address takerAddr = takerContracts[IAjnaKeeperTaker.LiquiditySource(i)];
            if (takerAddr != address(0)) {
                sources[index] = IAjnaKeeperTaker.LiquiditySource(i);
                takers[index] = takerAddr;
                index++;
            }
        }
    }

    /// @notice Checks if a liquidity source has a configured taker
    /// @param source The liquidity source to check
    /// @return hasConfiguration True if a taker is configured for this source
    function hasConfiguredTaker(IAjnaKeeperTaker.LiquiditySource source) external view returns (bool hasConfiguration) {
        return takerContracts[source] != address(0);
    }

    /// @dev Validates that the pool is from our Ajna deployment
    function _validatePool(IERC20Pool pool) private view returns(bool) {
        return poolFactory.deployedPools(ERC20_NON_SUBSET_HASH, pool.collateralAddress(), pool.quoteTokenAddress()) == address(pool);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
}
