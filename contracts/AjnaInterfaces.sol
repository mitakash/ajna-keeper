// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface IERC20Pool {
    /// @notice Returns the address of the pool's collateral token.
    function collateralAddress() external pure returns (address);

    /// @notice Returns the address of the pool's quote token.
    function quoteTokenAddress() external pure returns (address);

    /**
     *  @notice Returns the `collateralScale` immutable.
     *  @return The precision of the collateral `ERC20` token based on decimals.
     */
    function collateralScale() external view returns (uint256);

    /**
     *  @notice Called by actors to purchase collateral from the auction in exchange for quote token.
     *  @param  borrowerAddress_  Address of the borower take is being called upon.
     *  @param  maxAmount_        Max amount of collateral that will be taken from the auction (`WAD` precision for `ERC20` pools, max number of `NFT`s for `ERC721` pools).
     *  @param  callee_           Identifies where collateral should be sent and where quote token should be obtained.
     *  @param  data_             If provided, take will assume the callee implements `IERC*Taker`.  Take will send collateral to
     *                            callee before passing this data to `IERC*Taker.atomicSwapCallback`.  If not provided,
     *                            the callback function will not be invoked.
     *  @return collateralTaken_  Amount of collateral taken from the auction (`WAD` precision for `ERC20` pools, max number of `NFT`s for `ERC721` pools).
     */
    function take(
        address        borrowerAddress_,
        uint256        maxAmount_,
        address        callee_,
        bytes calldata data_
    ) external returns (uint256 collateralTaken_);
}

interface IERC20Taker {
    /**
     *  @notice Called by `Pool.take` allowing a taker to externally swap collateral for quote token.
     *  @param  collateralAmount The denormalized amount of collateral being taken (`WAD` precision).
     *  @param  quoteAmountDue   Denormalized amount of quote token required to purchase `collateralAmount` at the
     *                           current auction price (`WAD` precision).
     *  @param  data             Taker-provided calldata passed from taker's invocation to their callback.
     */
    function atomicSwapCallback(
        uint256        collateralAmount,
        uint256        quoteAmountDue,
        bytes calldata data
    ) external;
}

contract PoolDeployer {
    /// @dev SubsetHash => CollateralAddress => QuoteAddress => Pool Address mapping
    mapping(bytes32 => mapping(address => mapping(address => address))) public deployedPools;
}