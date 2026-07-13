// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IAggregatorV3Interface
/// @author Chainlink
/// @notice Minimal Chainlink price feed interface for BNB/USD oracle.
interface IAggregatorV3Interface {
    /// @notice Number of decimals in the price answer.
    function decimals() external view returns (uint8);

    /// @notice Latest round data from the price feed.
    /// @return roundId Round ID
    /// @return answer Price
    /// @return startedAt Timestamp when the round started
    /// @return updatedAt Timestamp when the round was last updated
    /// @return answeredInRound Round ID of the answer
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}
