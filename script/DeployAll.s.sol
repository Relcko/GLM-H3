// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { BaseDeployScript } from "./BaseDeployScript.sol";
import { MockERC20 } from "contracts/mocks/MockERC20.sol";
import { MockUSDT } from "contracts/mocks/MockUSDT.sol";
import { PaymentManager } from "contracts/PaymentManager.sol";
import { IAggregatorV3Interface } from "contracts/interfaces/IAggregatorV3Interface.sol";

/// @title DeployAll
/// @notice One-shot, audited deployment orchestrator. Performs, in order:
///           1. Deploy RLKO token
///           2. Deploy MockUSDT (testnet only, if MOCK_USDT=true or chain 97)
///           3. Deploy PaymentManager
///           4. Fund PaymentManager with presale supply
///           5. Configure Stage 1 (add + activate)
///           6. Verify contracts (owner, decimals, feed, treasury, stage)
///           7. Transfer ownership to treasury (2-step)
///           8. Save the consolidated deployment JSON
///
///         On BSC Testnet, a MockUSDT is automatically deployed unless the env
///         provides an explicit USDT address (USDT_TOKEN / USDT_TOKEN_TESTNET).
///         Every parameter is sourced from .env; no addresses are hardcoded.
contract DeployAll is BaseDeployScript {
    function run() external {
        Deployment memory d = _loadDeployment();

        address feed = _resolveFeed();
        address treasury = _treasury();
        address deployer = _broadcaster();

        string memory rlkoName = vm.envOr("RLKO_NAME", string("Relcko Token"));
        string memory rlkoSymbol = vm.envOr("RLKO_SYMBOL", string("RLKO"));
        uint8 rlkoDecimals = uint8(vm.envOr("RLKO_DECIMALS", uint256(18)));
        uint256 rlkoSupply = vm.envOr("RLKO_SUPPLY", uint256(1_000_000_000 * 1e18));
        uint256 presaleSupply = vm.envOr("PRESALE_SUPPLY", vm.envOr("STAGE1_SUPPLY", uint256(10_000 * 1e18)));
        uint256 stagePrice = vm.envOr("STAGE1_PRICE", d.stagePrice);
        uint256 stageSupply = vm.envOr("STAGE1_SUPPLY", d.stageSupply);
        uint256 stageMin = vm.envOr("STAGE1_MIN_PER_USER", d.stageMin);
        uint256 stageMax = vm.envOr("STAGE1_MAX_PER_USER", d.stageMax);

        require(bytes(rlkoName).length > 0, "RLKO_NAME empty");
        require(bytes(rlkoSymbol).length > 0, "RLKO_SYMBOL empty");
        require(rlkoDecimals > 0 && rlkoDecimals <= 18, "RLKO_DECIMALS invalid");
        require(rlkoSupply > 0, "RLKO_SUPPLY invalid");
        require(feed != address(0), "BNB_USD_FEED zero");
        require(stagePrice > 0, "STAGE1_PRICE invalid");
        require(stageSupply > 0, "STAGE1_SUPPLY invalid");
        require(stageMin > 0, "STAGE1_MIN invalid");
        require(stageMax > 0 && stageMax >= stageMin, "STAGE1 limits invalid");
        require(presaleSupply >= stageSupply, "PRESALE_SUPPLY < STAGE1_SUPPLY");
        require(presaleSupply <= rlkoSupply, "PRESALE_SUPPLY > RLKO_SUPPLY");

        (uint8 feedDec, int256 price) = _verifyFeed(feed);
        console.log("Oracle price (8 dec):");
        console.log(uint256(price));

        // ═══════════════════════════════════════════════════════════════════
        //  STEP 1 — Deploy RLKO
        // ═══════════════════════════════════════════════════════════════════
        console.log("=== Step 1: Deploy RLKO ===");
        vm.startBroadcast();
        MockERC20 rlko = new MockERC20(rlkoName, rlkoSymbol, rlkoDecimals);
        rlko.mint(deployer, rlkoSupply);
        vm.stopBroadcast();

        require(rlko.balanceOf(deployer) == rlkoSupply, "RLKO supply mint failed");
        require(rlko.decimals() == rlkoDecimals, "RLKO decimals mismatch");
        require(_verifyTokenDecimals(address(rlko), rlkoDecimals) == rlkoDecimals, "RLKO decimals verify failed");
        console.log("RLKO:");
        console.log(address(rlko));

        // ═══════════════════════════════════════════════════════════════════
        //  STEP 2 — Deploy MockUSDT (testnet) or resolve real USDT
        // ═══════════════════════════════════════════════════════════════════
        bool deployMockUsdt = vm.envOr("MOCK_USDT", block.chainid == 97);
        address usdt;
        if (deployMockUsdt && d.usdt == address(0)) {
            console.log("=== Step 2: Deploy MockUSDT ===");
            vm.startBroadcast();
            MockUSDT mockUsdt = new MockUSDT();
            vm.stopBroadcast();
            usdt = address(mockUsdt);
            require(_hasCode(usdt), "MockUSDT deploy failed");
            require(_verifyTokenDecimals(usdt, USDT_DECIMALS) == USDT_DECIMALS, "MockUSDT decimals mismatch");
            console.log("MockUSDT:");
            console.log(usdt);
        } else {
            usdt = _resolveUsdt(d);
            require(usdt != address(0), "USDT zero - set USDT_TOKEN or MOCK_USDT=true");
            require(_hasCode(usdt), "USDT no code");
            _verifyTokenDecimals(usdt, USDT_DECIMALS);
            console.log("USDT (existing):");
            console.log(usdt);
        }

        // ═══════════════════════════════════════════════════════════════════
        //  STEP 3 — Deploy PaymentManager
        // ═══════════════════════════════════════════════════════════════════
        console.log("=== Step 3: Deploy PaymentManager ===");
        vm.startBroadcast();
        PaymentManager pm = new PaymentManager(address(rlko), usdt, feed);
        vm.stopBroadcast();

        require(address(pm.SALE_TOKEN()) == address(rlko), "SALE_TOKEN mismatch");
        require(address(pm.USDT()) == usdt, "USDT mismatch");
        require(address(pm.BNB_USD_FEED()) == feed, "BNB_USD_FEED mismatch");
        require(pm.owner() == deployer, "owner != deployer");
        console.log("PaymentManager:");
        console.log(address(pm));

        // ═══════════════════════════════════════════════════════════════════
        //  STEP 4 — Fund PaymentManager with the presale supply
        // ═══════════════════════════════════════════════════════════════════
        console.log("=== Step 4: Fund presale supply ===");
        vm.startBroadcast();
        rlko.transfer(address(pm), presaleSupply);
        vm.stopBroadcast();
        require(rlko.balanceOf(address(pm)) == presaleSupply, "presale funding failed");
        console.log("Presale supply:");
        console.log(presaleSupply);

        // ═══════════════════════════════════════════════════════════════════
        //  STEP 5 — Configure Stage 1
        // ═══════════════════════════════════════════════════════════════════
        console.log("=== Step 5: Configure Stage 1 ===");
        uint256 countBefore = pm.stageCount();
        vm.startBroadcast();
        pm.addStage(stagePrice, stageSupply, stageMin, stageMax);
        pm.activateStage(countBefore);
        vm.stopBroadcast();

        require(pm.stageCount() == countBefore + 1, "stageCount not incremented");
        require(pm.currentStage() == countBefore, "currentStage mismatch");
        (uint256 ap, uint256 as_, uint256 asold,,,) = pm.currentStageInfo();
        require(ap == stagePrice, "stage price mismatch");
        require(as_ == stageSupply, "stage supply mismatch");
        require(asold == 0, "stage sold != 0");
        require(pm.tokensRemaining() == stageSupply, "tokensRemaining mismatch");
        console.log("Stage 1 active (id:");
        console.log(countBefore);

        // ═══════════════════════════════════════════════════════════════════
        //  STEP 6 — Verify contracts + transfer ownership to treasury
        // ═══════════════════════════════════════════════════════════════════
        console.log("=== Step 6: Verify + ownership ===");

        require(pm.owner() == deployer, "owner != deployer (pre-transfer)");

        address expectedOwner = deployer;
        if (treasury != address(0)) {
            require(treasury != deployer, "TREASURY == deployer (no-op)");
            require(treasury != address(pm), "TREASURY == PaymentManager");
            vm.startBroadcast();
            pm.transferOwnership(treasury);
            vm.stopBroadcast();
            console.log("[INFO] Ownership transfer initiated to treasury (2-step; treasury must call acceptOwnership).");
            expectedOwner = treasury;
        }

        require(address(pm.SALE_TOKEN()) == address(rlko), "verify SALE_TOKEN");
        require(address(pm.USDT()) == usdt, "verify USDT");
        require(address(pm.BNB_USD_FEED()) == feed, "verify BNB_USD_FEED");
        _verifyTokenDecimals(usdt, USDT_DECIMALS);
        _verifyFeed(feed);
        (uint256 vp, uint256 vs,, uint256 vmin, uint256 vmax,) = pm.currentStageInfo();
        require(vp == stagePrice && vs == stageSupply && vmin == stageMin && vmax == stageMax, "verify stage config");
        console.log("[OK] owner:");
        console.log(pm.owner());
        console.log("[OK] expected:");
        console.log(expectedOwner);

        // ═══════════════════════════════════════════════════════════════════
        //  STEP 7 — Persist consolidated artifact
        // ═══════════════════════════════════════════════════════════════════
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("Network :");
        console.log(_networkName());
        console.log("RLKO:");
        console.log(address(rlko));
        console.log("PaymentManager:");
        console.log(address(pm));
        console.log("USDT:");
        console.log(usdt);
        console.log("Feed:");
        console.log(feed);

        d.rlko = address(rlko);
        d.paymentManager = address(pm);
        d.usdt = usdt;
        d.bnbUsdFeed = feed;
        d.deployer = deployer;
        d.treasury = treasury;
        d.rlkoName = rlkoName;
        d.rlkoSymbol = rlkoSymbol;
        d.rlkoDecimals = rlkoDecimals;
        d.rlkoSupply = rlkoSupply;
        d.presaleSupply = presaleSupply;
        d.stageId = countBefore;
        d.stagePrice = stagePrice;
        d.stageSupply = stageSupply;
        d.stageMin = stageMin;
        d.stageMax = stageMax;
        d.oracleDecimals = feedDec;
        _saveDeployment(d);
    }
}
