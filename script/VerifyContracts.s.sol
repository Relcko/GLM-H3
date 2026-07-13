// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { BaseDeployScript } from "./BaseDeployScript.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { PaymentManager } from "contracts/PaymentManager.sol";
import { IAggregatorV3Interface } from "contracts/interfaces/IAggregatorV3Interface.sol";

/// @title VerifyContracts
/// @notice Reads the deployment artifact and performs a full, read-only
///         on-chain verification of every deployed contract:
///           • RLKO token (code, name, symbol, decimals, supply)
///           • PaymentManager (wiring, owner, treasury)
///           • Chainlink BNB/USD feed (decimals, price, round, staleness)
///           • Stage 1 configuration
///         Emits BscScan `forge verify-contract` commands for manual Etherscan
///         verification. Requires no broadcast (read-only).
contract VerifyContracts is BaseDeployScript {
    function run() external {
        Deployment memory d = _loadDeployment();

        require(d.paymentManager != address(0), "No PaymentManager in artifact; deploy first");
        require(d.chainId == block.chainid, "Artifact chainId != current network");

        console.log("=== VERIFICATION REPORT ===");
        console.log("Network :");
        console.log(_networkName());
        console.log("ChainId :");
        console.log(block.chainid);

        bool allGood = true;

        // ── 1. Verify RLKO token ──────────────────────────────────────────
        console.log("--- RLKO Token ---");
        if (d.rlko != address(0) && _hasCode(d.rlko)) {
            console.log("Address :");
            console.log(d.rlko);

            (bool nOk, bytes memory nData) = d.rlko.staticcall(abi.encodeWithSignature("name()"));
            string memory n = (nOk && nData.length >= 32) ? abi.decode(nData, (string)) : "(unreadable)";

            (bool sOk, bytes memory sData) = d.rlko.staticcall(abi.encodeWithSignature("symbol()"));
            string memory s = (sOk && sData.length >= 32) ? abi.decode(sData, (string)) : "(unreadable)";

            uint8 dec = _safeDecimals(d.rlko);
            uint256 total = _safeTotalSupply(d.rlko);

            console.log("Name    :");
            console.log(n);
            console.log("Symbol  :");
            console.log(s);
            console.log("Decimals:");
            console.log(dec);
            console.log("Supply  :");
            console.log(total);

            if (d.rlkoDecimals != 0 && dec != d.rlkoDecimals) {
                console.log("[FAIL] RLKO decimals != artifact");
                allGood = false;
            } else {
                console.log("[OK] decimals");
            }
        } else {
            console.log("[WARN] RLKO address missing or has no code");
        }

        // ── 2. Verify PaymentManager ──────────────────────────────────────
        console.log("--- PaymentManager ---");
        require(_hasCode(d.paymentManager), "PaymentManager has no code");
        console.log("Address :");
        console.log(d.paymentManager);

        PaymentManager pm = PaymentManager(payable(d.paymentManager));

        address saleToken = address(pm.SALE_TOKEN());
        address usdt = address(pm.USDT());
        address feed = address(pm.BNB_USD_FEED());
        address owner = pm.owner();

        if (!_logMatch("SALE_TOKEN", saleToken, d.rlko)) allGood = false;
        if (!_logMatch("USDT", usdt, d.usdt)) allGood = false;
        if (!_logMatch("BNB_USD_FEED", feed, d.bnbUsdFeed)) allGood = false;

        address expectedOwner = (d.treasury != address(0)) ? d.treasury : d.deployer;
        if (owner == expectedOwner) {
            console.log("[OK] owner == expected");
        } else if (d.treasury != address(0) && owner == d.deployer) {
            console.log("[WARN] ownership transfer pending (treasury must acceptOwnership)");
            allGood = false;
        } else {
            console.log("[FAIL] owner mismatch");
            console.log("  actual  :");
            console.log(owner);
            console.log("  expected:");
            console.log(expectedOwner);
            allGood = false;
        }

        // ── 3. Verify Chainlink feed ──────────────────────────────────────
        console.log("--- Chainlink BNB/USD Feed ---");
        if (_hasCode(feed)) {
            (uint8 feedDec, int256 price) = _verifyFeed(feed);
            console.log("Decimals:");
            console.log(feedDec);
            console.log("Price (8 dec):");
            console.log(uint256(price));
            if (feedDec != ORACLE_DECIMALS) allGood = false;
        } else {
            console.log("[FAIL] feed has no code");
            allGood = false;
        }

        // ── 4. Verify Stage configuration ─────────────────────────────────
        console.log("--- Stage Configuration ---");
        uint256 stageCount = pm.stageCount();
        console.log("Stage count:");
        console.log(stageCount);
        if (stageCount > 0) {
            uint256 active = pm.currentStage();
            (uint256 sPrice, uint256 sSupply, uint256 sSold, uint256 sMin, uint256 sMax,) = pm.currentStageInfo();
            console.log("Active stage:");
            console.log(active);
            console.log("Price  :");
            console.log(sPrice);
            console.log("Supply :");
            console.log(sSupply);
            console.log("Sold   :");
            console.log(sSold);
            console.log("Max/usr:");
            console.log(sMax);

            if (d.stagePrice != 0) {
                if (!_check("stage price", sPrice == d.stagePrice)) allGood = false;
                if (!_check("stage supply", sSupply == d.stageSupply)) allGood = false;
                if (!_check("stage max", sMax == d.stageMax)) allGood = false;
            }
        } else {
            console.log("[INFO] no stages configured yet");
        }

        // ── 5. BscScan verification commands ──────────────────────────────
        console.log("=== BSCSCAN VERIFICATION COMMANDS ===");
        if (d.rlko != address(0)) {
            string memory cid = vm.toString(block.chainid);
            console.log("# RLKO");
            console.log(
                string.concat(
                    "forge verify-contract ",
                    vm.toString(d.rlko),
                    " contracts/mocks/MockERC20.sol:MockERC20 --chain-id ",
                    cid,
                    " --watch"
                )
            );
        }
        console.log("# PaymentManager");
        console.log(
            string.concat(
                "forge verify-contract ",
                vm.toString(d.paymentManager),
                " contracts/PaymentManager.sol:PaymentManager --chain-id ",
                vm.toString(block.chainid),
                " --constructor-args $(cast abi-encode \"constructor(address,address,address)\" ",
                vm.toString(saleToken),
                " ",
                vm.toString(usdt),
                " ",
                vm.toString(feed),
                ") --watch"
            )
        );

        console.log("=== SUMMARY ===");
        console.log(allGood ? "ALL CHECKS PASSED" : "VERIFICATION FAILED - review warnings/failures above");
        require(allGood, "Verification failed");
    }

    function _logMatch(string memory label, address actual, address expected) internal view returns (bool ok) {
        console.log(label);
        console.log(actual);
        console.log("  expected:");
        console.log(expected);
        ok = actual == expected;
        console.log(ok ? "  [OK] match" : "  [FAIL] mismatch");
    }

    function _check(string memory label, bool ok) internal view returns (bool) {
        console.log(ok ? "[OK] " : "[FAIL] ");
        console.log(label);
        return ok;
    }

    function _safeDecimals(address token) internal view returns (uint8 dec) {
        (bool ok, bytes memory data) = token.staticcall(abi.encodeWithSignature("decimals()"));
        dec = (ok && data.length >= 32) ? abi.decode(data, (uint8)) : 0;
    }

    function _safeTotalSupply(address token) internal view returns (uint256 total) {
        (bool ok, bytes memory data) = token.staticcall(abi.encodeWithSignature("totalSupply()"));
        total = (ok && data.length >= 32) ? abi.decode(data, (uint256)) : 0;
    }
}
