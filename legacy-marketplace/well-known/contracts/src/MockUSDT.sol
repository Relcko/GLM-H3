// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDT
 * @dev Mock USDT token for testing purposes
 */
contract MockUSDT is ERC20, Ownable {
    uint8 private _decimals;

    constructor() ERC20("Mock USDT", "USDT") Ownable(msg.sender) {
        _decimals = 18;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // Faucet function for testing - anyone can get test tokens
    function faucet(uint256 amount) external {
        require(amount <= 10000 * 10**_decimals, "Max 10000 tokens per request");
        _mint(msg.sender, amount);
    }
}
