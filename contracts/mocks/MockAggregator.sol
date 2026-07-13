// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title MockAggregator
/// @notice Mock Chainlink aggregator for testing. Not for production use.
contract MockAggregator {
    uint8 public constant decimals = 8;
    int256 private _price;
    uint80 private _roundId;
    uint256 private _updatedAt;
    bool private _shouldRevert;
    bool private _stale;

    function setPrice(int256 price) external {
        _price = price;
        _roundId++;
        _updatedAt = block.timestamp;
        _stale = false;
    }

    function setStale(bool stale) external {
        _stale = stale;
    }

    function setShouldRevert(bool shouldRevert) external {
        _shouldRevert = shouldRevert;
    }

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        if (_shouldRevert) revert("mock-revert");
        if (_stale) return (_roundId, _price, _updatedAt, _updatedAt, _roundId - 1);
        return (_roundId, _price, _updatedAt, _updatedAt, _roundId);
    }
}
