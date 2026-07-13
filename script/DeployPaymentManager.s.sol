// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { BaseDeployScript } from "./BaseDeployScript.sol";
import { PaymentManager } from "contracts/PaymentManager.sol";
import { IAggregatorV3Interface } from "contracts/interfaces/IAggregatorV3Interface.sol";

/// @title DeployPaymentManager
/// @notice Deploys the PaymentManager presale contract.
///         Validates constructor parameters, prints the deployed address,
///         and verifies: owner (deployer), token decimals (RLKO + USDT),
///         the Chainlink BNB/USD feed, and initiates the 2-step ownership
///         transfer to the configured treasury (Ownable2Step).
contract DeployPaymentManager is BaseDeployScript {
    function run() external {
        Deployment memory d = _loadDeployment();

        address saleToken = vm.envOr("SALE_TOKEN", d.rlko);
        if (saleToken == address(0)) saleToken = _tryEnvAddress("SALE_TOKEN");
        address usdt = _resolveUsdt(d);
        address feed = _resolveFeed();
        address treasury = _treasury();
        address deployer = _broadcaster();

        require(saleToken != address(0), "SALE_TOKEN cannot be zero");
        require(usdt != address(0), "USDT cannot be zero");
        require(feed != address(0), "BNB_USD_FEED cannot be zero");
        require(_hasCode(saleToken), "SALE_TOKEN has no code");
        require(_hasCode(usdt), "USDT has no code");

        uint8 saleDecimals = _verifyTokenDecimals(saleToken, d.rlkoDecimals != 0 ? d.rlkoDecimals : 18);
        uint8 usdtDecimals = _verifyTokenDecimals(usdt, USDT_DECIMALS);

        (uint8 feedDec, int256 price) = _verifyFeed(feed);
        console.log("Oracle price (8 dec):");
        console.log(uint256(price));
        console.log("Oracle decimals:");
        console.log(feedDec);

        vm.startBroadcast();
        PaymentManager pm = new PaymentManager(saleToken, usdt, feed);
        vm.stopBroadcast();

        require(address(pm.SALE_TOKEN()) == saleToken, "SALE_TOKEN mismatch");
        require(address(pm.USDT()) == usdt, "USDT mismatch");
        require(address(pm.BNB_USD_FEED()) == feed, "BNB_USD_FEED mismatch");

        require(pm.owner() == deployer, "owner != deployer");

        address expectedOwner = deployer;
        if (treasury != address(0)) {
            require(treasury != deployer, "TREASURY equals deployer (no-op)");
            require(treasury != address(pm), "TREASURY equals PaymentManager");
            vm.startBroadcast();
            pm.transferOwnership(treasury);
            vm.stopBroadcast();
            console.log("[INFO] Ownership transfer initiated to treasury (2-step; treasury must call acceptOwnership).");
            expectedOwner = treasury;
        }

        console.log("=== PAYMENT MANAGER DEPLOYMENT ===");
        console.log("Network :");
        console.log(_networkName());
        console.log("Address :");
        console.log(address(pm));
        console.log("SALE_TOKEN:");
        console.log(saleToken);
        console.log("  decimals:");
        console.log(saleDecimals);
        console.log("USDT:");
        console.log(usdt);
        console.log("  decimals:");
        console.log(usdtDecimals);
        console.log("BNB_USD_FEED:");
        console.log(feed);
        console.log("Owner:");
        console.log(pm.owner());
        console.log("  expected:");
        console.log(expectedOwner);
        console.log("Treasury:");
        console.log(treasury == address(0) ? address(0) : treasury);

        d.paymentManager = address(pm);
        d.usdt = usdt;
        d.bnbUsdFeed = feed;
        d.deployer = deployer;
        d.treasury = treasury;
        d.oracleDecimals = feedDec;
        if (d.rlko == address(0)) d.rlko = saleToken;
        if (d.rlkoDecimals == 0) d.rlkoDecimals = saleDecimals;
        _saveDeployment(d);
    }
}
