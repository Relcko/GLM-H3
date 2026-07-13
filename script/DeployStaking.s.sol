// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { BaseDeployScript } from "./BaseDeployScript.sol";
import { Staking } from "contracts/Staking.sol";

/// @title DeployStaking
/// @notice Deploy the Staking contract to the current chain (testnet or mainnet).
///         Reads RLKO address from the deployment artifact and sets up default plans.
contract DeployStaking is BaseDeployScript {
    function run() external {
        Deployment memory d = _loadDeployment();

        address rlko = d.rlko;
        require(rlko != address(0), "RLKO address not found in artifact - deploy RLKO first");
        require(_hasCode(rlko), "RLKO has no code");

        address deployer = _broadcaster();

        // Plans from lib/staking/config.ts (durations in days, returns in BPS)
        uint256[] memory planDays = new uint256[](7);
        planDays[0] = 30;
        planDays[1] = 90;
        planDays[2] = 180;
        planDays[3] = 365;
        planDays[4] = 730;
        planDays[5] = 1095;
        planDays[6] = 1460;

        uint256[] memory planReturns = new uint256[](7);
        planReturns[0] = 504;    // 5.04%
        planReturns[1] = 550;    // 5.50%
        planReturns[2] = 688;    // 6.88%
        planReturns[3] = 917;    // 9.17%
        planReturns[4] = 1375;   // 13.75%
        planReturns[5] = 1834;   // 18.34%
        planReturns[6] = 3668;   // 36.68%

        uint256 withdrawPenalty = 2500; // 25% in BPS

        console.log("=== Deploy Staking ===");
        console.log("Network:");
        console.log(_networkName());
        console.log("RLKO:");
        console.log(rlko);

        vm.startBroadcast();
        Staking staking = new Staking(rlko, withdrawPenalty, planDays, planReturns);
        vm.stopBroadcast();

        require(_hasCode(address(staking)), "Staking deploy failed - no bytecode");
        require(address(staking._token()) == rlko, "Staking token mismatch");
        require(staking._withdrawPenalty() == withdrawPenalty, "Staking penalty mismatch");

        (uint256[] memory durations,) = staking.getAllPlans();
        uint256 planCount = durations.length;
        require(planCount == 7, "Staking plan count mismatch");

        console.log("Staking:");
        console.log(address(staking));
        console.log("Plans deployed:");
        console.log(planCount);
        console.log("=== DEPLOYMENT COMPLETE ===");

        d.staking = address(staking);
        d.stakingToken = rlko;
        _saveDeployment(d);
    }
}
