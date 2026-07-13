// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { BaseDeployScript } from "./BaseDeployScript.sol";
import { MockERC20 } from "contracts/mocks/MockERC20.sol";

/// @title DeployRLKO
/// @notice Deploys the RLKO (Relcko) ERC20 token via MockERC20.
///         Validates constructor parameters, prints the deployed address,
///         and verifies owner (deployer holds full supply) and decimals.
///         Chainlink feed / treasury / stage config are N/A for a standalone
///         token and are reported as such.
contract DeployRLKO is BaseDeployScript {
    function run() external {
        Deployment memory d = _loadDeployment();

        string memory name = vm.envOr("RLKO_NAME", string("Relcko Token"));
        string memory symbol = vm.envOr("RLKO_SYMBOL", string("RLKO"));
        uint8 decimals = uint8(vm.envOr("RLKO_DECIMALS", uint256(18)));
        uint256 supply = vm.envOr("RLKO_SUPPLY", uint256(1_000_000_000 * 1e18));
        address treasury = _treasury();
        address deployer = _broadcaster();

        require(bytes(name).length > 0, "RLKO_NAME cannot be empty");
        require(bytes(symbol).length > 0, "RLKO_SYMBOL cannot be empty");
        require(decimals > 0 && decimals <= 18, "RLKO_DECIMALS must be 1..18");
        require(supply > 0, "RLKO_SUPPLY must be > 0");

        vm.startBroadcast();
        MockERC20 rlko = new MockERC20(name, symbol, decimals);
        rlko.mint(deployer, supply);
        vm.stopBroadcast();

        require(rlko.balanceOf(deployer) == supply, "RLKO: deployer balance != supply");
        require(rlko.decimals() == decimals, "RLKO: decimals mismatch");

        console.log("=== RLKO DEPLOYMENT ===");
        console.log("Network :");
        console.log(_networkName());
        console.log("Address :");
        console.log(address(rlko));
        console.log("Name    :");
        console.log(name);
        console.log("Symbol  :");
        console.log(symbol);
        console.log("Decimals:");
        console.log(decimals);
        console.log("Supply  :");
        console.log(supply);
        console.log("Owner (deployer holds full supply):");
        console.log(deployer);
        console.log("[INFO] Chainlink feed / treasury / stage config: N/A for ERC20 token");

        d.rlko = address(rlko);
        d.rlkoName = name;
        d.rlkoSymbol = symbol;
        d.rlkoDecimals = decimals;
        d.rlkoSupply = supply;
        d.deployer = deployer;
        d.treasury = treasury;
        _saveDeployment(d);
    }
}
