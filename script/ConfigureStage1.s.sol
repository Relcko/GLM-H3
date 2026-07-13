// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { BaseDeployScript } from "./BaseDeployScript.sol";
import { PaymentManager } from "contracts/PaymentManager.sol";

/// @title ConfigureStage1
/// @notice Adds and activates Stage 1 on an already-deployed PaymentManager.
///         Validates stage parameters, prints the configuration, verifies the
///         caller is the contract owner (treasury if ownership was transferred),
///         and verifies the resulting stage configuration on-chain.
contract ConfigureStage1 is BaseDeployScript {
    function run() external {
        Deployment memory d = _loadDeployment();

        address pmAddr = vm.envOr("PAYMENT_MANAGER", d.paymentManager);
        require(pmAddr != address(0), "PAYMENT_MANAGER zero (deploy first)");
        require(_hasCode(pmAddr), "PAYMENT_MANAGER has no code");

        PaymentManager pm = PaymentManager(payable(pmAddr));

        uint256 price = vm.envOr("STAGE1_PRICE", d.stagePrice);
        uint256 supply = vm.envOr("STAGE1_SUPPLY", d.stageSupply);
        uint256 minU = vm.envOr("STAGE1_MIN_PER_USER", d.stageMin);
        uint256 maxU = vm.envOr("STAGE1_MAX_PER_USER", d.stageMax);

        require(price > 0, "STAGE1_PRICE must be > 0");
        require(supply > 0, "STAGE1_SUPPLY must be > 0");
        require(minU > 0, "STAGE1_MIN_PER_USER must be > 0");
        require(maxU > 0 && maxU >= minU, "STAGE1 limits invalid (max >= min)");

        address owner = pm.owner();
        address broadcaster = _broadcaster();

        require(owner != address(0), "PaymentManager owner is zero");
        require(owner == broadcaster, "broadcaster is not PM owner (use treasury key)");

        uint256 countBefore = pm.stageCount();

        if (countBefore > 0) {
            console.log("[SKIP] stages already configured (countBefore > 0) - skipping addStage");
            console.log("Existing stage count:");
            console.log(countBefore);
        } else {
            vm.startBroadcast();
            pm.addStage(price, supply, minU, maxU);
            pm.activateStage(countBefore);
            vm.stopBroadcast();

            require(pm.stageCount() == countBefore + 1, "stageCount not incremented");
            require(pm.currentStage() == countBefore, "currentStage mismatch");
            (uint256 ap, uint256 as_, uint256 asold,,,) = pm.currentStageInfo();
            require(ap == price, "stage price mismatch");
            require(as_ == supply, "stage supply mismatch");
            require(asold == 0, "stage sold should be 0");
            require(pm.tokensRemaining() == supply, "tokensRemaining mismatch");
        }

        console.log("=== STAGE 1 CONFIGURED ===");
        console.log("Network :");
        console.log(_networkName());
        console.log("PM:");
        console.log(pmAddr);
        console.log("StageId :");
        console.log(countBefore);
        console.log("Price   :");
        console.log(price);
        console.log("Supply  :");
        console.log(supply);
        console.log("Min/User:");
        console.log(minU);
        console.log("Max/User:");
        console.log(maxU);
        console.log("Owner   :");
        console.log(owner);

        d.paymentManager = pmAddr;
        d.stageId = countBefore;
        d.stagePrice = price;
        d.stageSupply = supply;
        d.stageMin = minU;
        d.stageMax = maxU;
        d.treasury = _treasury();
        d.deployer = broadcaster;
        _saveDeployment(d);
    }
}
