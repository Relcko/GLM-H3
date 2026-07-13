// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockUSDT
/// @notice Testnet-only USDT mock. 18 decimals, mintable only by owner.
///         Not for production use.
contract MockUSDT is ERC20, Ownable {
    constructor() ERC20("Tether USD Test", "USDT") Ownable(msg.sender) {}

    /// @notice Mint tokens to `to`. Only callable by the contract owner.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
