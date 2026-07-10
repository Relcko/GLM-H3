// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "PaymentManager.sol";
import "./mocks/MockERC20.sol";
import "./mocks/MockAggregator.sol";

contract PaymentManagerTest is Test {
    MockERC20 usdt;
    MockERC20 saleToken;
    MockAggregator aggregator;
    PaymentManager pm;

    address payable internal constant OWNER = payable(address(0xdead));
    address internal constant USER = address(0xbeef);
    address internal constant USER2 = address(0xcafe);

    uint256 internal constant PRICE = 0_500_000_000_000_000_000;    // 0.5 USDT
    uint256 internal constant SUPPLY = 10_000_000_000_000_000_000_000; // 10 000 tokens
    uint256 internal constant MIN    = 10_000_000_000_000_000_000;   // 10 USDT
    uint256 internal constant MAX    = 1_000_000_000_000_000_000_000; // 1 000 USDT

    uint256 internal constant BNB_PRICE = 600_000_000_000_000_000_000_000_000_000; // 1 BNB = 60 000 USDT (18 dec)

    function setUp() public {
        usdt = new MockERC20("USDT", "USDT", 18);
        saleToken = new MockERC20("RLKO", "RLKO", 18);
        aggregator = new MockAggregator();

        aggregator.setPrice(60_000 * 1e8); // 60 000 USD per BNB (8 dec)

        vm.prank(OWNER);
        pm = new PaymentManager(address(saleToken), address(usdt), address(aggregator));

        usdt.mint(USER,    10_000 * 1e18);
        usdt.mint(USER2,   10_000 * 1e18);
        saleToken.mint(address(pm), SUPPLY * 3);

        _addAndActivateStage();
    }

    function _addAndActivateStage() internal {
        vm.prank(OWNER);
        pm.addStage(PRICE, SUPPLY, MIN, MAX);
        vm.prank(OWNER);
        pm.activateStage(0);
    }

    function _approveUsdt(address who, uint256 amount) internal {
        vm.prank(who);
        usdt.approve(address(pm), amount);
    }

    // ──────────────────────────────────────────────────
    //  BUY WITH USDT
    // ──────────────────────────────────────────────────

    function testBuyWithUSDT_Success() public {
        _approveUsdt(USER, 100 * 1e18);
        vm.prank(USER);
        pm.buyWithToken(address(usdt), 100 * 1e18);

        uint256 expectedTokens = (100 * 1e18 * 1e18) / PRICE; // 200 tokens
        assertEq(pm.userInvestment(USER), 100 * 1e18);
        assertEq(pm.totalRaised(), 100 * 1e18);
        assertEq(pm.totalTokensSold(), expectedTokens);
        assertEq(pm.tokensRemaining(), SUPPLY - expectedTokens);
    }

    // ──────────────────────────────────────────────────
    //  BUY WITH BNB
    // ──────────────────────────────────────────────────

    function testBuyWithBNB_Success() public {
        uint256 bnbAmount = 0.1 ether;
        vm.prank(USER);
        pm.buyWithNative{value: bnbAmount}();

        uint256 expectedUsdt = (bnbAmount * uint256(60_000 * 1e8)) / 1e8;
        uint256 expectedTokens = (expectedUsdt * 1e18) / PRICE;

        assertGt(pm.userInvestment(USER), 0);
        assertEq(pm.userInvestment(USER), expectedUsdt);
        assertEq(pm.totalRaised(), expectedUsdt);
        assertEq(pm.totalTokensSold(), expectedTokens);
    }

    function testBuyWithBNB_WithEmergencyOverride() public {
        uint256 overrideRate = 60_000 * 1e18;
        vm.prank(OWNER);
        pm.setNativeToUsdtRate(overrideRate);

        uint256 bnbAmount = 0.1 ether;
        vm.prank(USER);
        pm.buyWithNative{value: bnbAmount}();

        uint256 expectedUsdt = (bnbAmount * overrideRate) / 1e18;
        uint256 expectedTokens = (expectedUsdt * 1e18) / PRICE;

        assertEq(pm.userInvestment(USER), expectedUsdt);
    }

    function testBuyWithBNB_WithOverrideAfterOracleFail() public {
        aggregator.setShouldRevert(true);
        vm.prank(OWNER);
        pm.setNativeToUsdtRate(60_000 * 1e18);

        uint256 bnbAmount = 0.1 ether;
        vm.prank(USER);
        pm.buyWithNative{value: bnbAmount}();

        assertGt(pm.userInvestment(USER), 0);
    }

    // ──────────────────────────────────────────────────
    //  ORACLE — ERROR PATHS
    // ──────────────────────────────────────────────────

    function testOracle_StaleDate() public {
        aggregator.setPrice(60_000 * 1e8);
        aggregator.setStale(true);

        vm.prank(USER);
        vm.expectRevert(PaymentManager.StaleOracleData.selector);
        pm.buyWithNative{value: 0.1 ether}();
    }

    function testOracle_ZeroPrice() public {
        aggregator.setPrice(0);

        vm.prank(USER);
        vm.expectRevert(PaymentManager.InvalidOraclePrice.selector);
        pm.buyWithNative{value: 0.1 ether}();
    }

    function testOracle_NegativePrice() public {
        aggregator.setPrice(-1);

        vm.prank(USER);
        vm.expectRevert(PaymentManager.InvalidOraclePrice.selector);
        pm.buyWithNative{value: 0.1 ether}();
    }

    function testOracle_Revert() public {
        aggregator.setShouldRevert(true);

        vm.prank(USER);
        vm.expectRevert(PaymentManager.OracleUnavailable.selector);
        pm.buyWithNative{value: 0.1 ether}();
    }

    // ──────────────────────────────────────────────────
    //  STAGE ACTIVATION / DEACTIVATION
    // ──────────────────────────────────────────────────

    function testStageActivation() public {
        vm.prank(OWNER);
        pm.addStage(PRICE, SUPPLY, MIN, MAX);
        vm.prank(OWNER);
        pm.activateStage(1);

        assertEq(pm.currentStage(), 1);
        (,,,,, bool active) = pm.currentStageInfo();
        assertTrue(active);
    }

    function testStageDeactivatesPreviousOnNewActivation() public {
        vm.prank(OWNER);
        pm.addStage(PRICE, SUPPLY, MIN, MAX);
        vm.prank(OWNER);
        pm.activateStage(1);

        vm.prank(OWNER);
        pm.activateStage(0);

        assertEq(pm.currentStage(), 0);
        (,,,,, bool active) = pm.currentStageInfo();
        assertTrue(active);
    }

    function testActivateInvalidStage() public {
        vm.prank(OWNER);
        vm.expectRevert(PaymentManager.InvalidStage.selector);
        pm.activateStage(99);
    }

    function testActivateAlreadyActiveStage() public {
        vm.prank(OWNER);
        vm.expectRevert(PaymentManager.StageAlreadyActive.selector);
        pm.activateStage(0);
    }

    // ──────────────────────────────────────────────────
    //  STAGE COMPLETION / OVERSELLING PREVENTION
    // ──────────────────────────────────────────────────

    function testStageCompletion_OversellingPrevention() public {
        // Set up a stage with a tiny supply
        vm.prank(OWNER);
        pm.addStage(PRICE, 100 * 1e18, MIN, MAX);
        vm.prank(OWNER);
        pm.activateStage(1);

        _approveUsdt(USER,  1000 * 1e18);
        _approveUsdt(USER2, 1000 * 1e18);

        // Buy 90 tokens for USER  (45 USDT)
        vm.prank(USER);
        pm.buyWithToken(address(usdt), 45 * 1e18);

        // Buy 10 remaining tokens for USER2 (5 USDT)
        vm.prank(USER2);
        pm.buyWithToken(address(usdt), 5 * 1e18);

        // Stage should be sold out
        assertEq(pm.tokensRemaining(), 0);

        // USER2 tries to buy more — should revert
        vm.expectRevert(PaymentManager.ExceedsStageSupply.selector);
        vm.prank(USER2);
        pm.buyWithToken(address(usdt), 1 * 1e18);
    }

    // ──────────────────────────────────────────────────
    //  MIN / MAX PURCHASE
    // ──────────────────────────────────────────────────

    function testMinPurchase_Under() public {
        _approveUsdt(USER, MIN);
        vm.prank(USER);
        vm.expectRevert(PaymentManager.BelowUserMinimum.selector);
        pm.buyWithToken(address(usdt), MIN / 2);
    }

    function testMinPurchase_Exact() public {
        _approveUsdt(USER, MIN);
        vm.prank(USER);
        pm.buyWithToken(address(usdt), MIN);

        assertEq(pm.userInvestment(USER), MIN);
    }

    function testMaxPurchase_Over() public {
        _approveUsdt(USER, MAX + 1 * 1e18);
        vm.prank(USER);
        vm.expectRevert(PaymentManager.ExceedsUserLimit.selector);
        pm.buyWithToken(address(usdt), MAX + 1 * 1e18);
    }

    function testMaxPurchase_Cumulative() public {
        _approveUsdt(USER, MAX);
        vm.prank(USER);
        pm.buyWithToken(address(usdt), MAX / 2);

        _approveUsdt(USER, MAX);
        vm.prank(USER);
        pm.buyWithToken(address(usdt), MAX / 2);

        vm.expectRevert(PaymentManager.ExceedsUserLimit.selector);
        vm.prank(USER);
        pm.buyWithToken(address(usdt), 1 * 1e18);
    }

    // ──────────────────────────────────────────────────
    //  PAUSE / RESUME
    // ──────────────────────────────────────────────────

    function testPause_BuyingBlocked() public {
        vm.prank(OWNER);
        pm.pause();

        _approveUsdt(USER, MIN);
        vm.prank(USER);
        vm.expectRevert();
        pm.buyWithToken(address(usdt), MIN);

        vm.expectRevert();
        vm.prank(USER);
        pm.buyWithNative{value: 0.1 ether}();
    }

    function testResume_BuyingAllowed() public {
        vm.prank(OWNER);
        pm.pause();
        vm.prank(OWNER);
        pm.unpause();

        _approveUsdt(USER, MIN);
        vm.prank(USER);
        pm.buyWithToken(address(usdt), MIN);

        assertEq(pm.userInvestment(USER), MIN);
    }

    function testPause_OnlyOwner() public {
        vm.prank(USER);
        vm.expectRevert();
        pm.pause();
    }

    // ──────────────────────────────────────────────────
    //  WITHDRAW
    // ──────────────────────────────────────────────────

    function testWithdrawFunds_USDT() public {
        _approveUsdt(USER, 100 * 1e18);
        vm.prank(USER);
        pm.buyWithToken(address(usdt), 100 * 1e18);

        uint256 balanceBefore = usdt.balanceOf(OWNER);
        vm.prank(OWNER);
        pm.withdrawFunds(address(usdt));
        uint256 balanceAfter = usdt.balanceOf(OWNER);

        assertEq(balanceAfter - balanceBefore, 100 * 1e18);
    }

    function testWithdrawFunds_Native() public {
        vm.prank(USER);
        pm.buyWithNative{value: 0.1 ether}();

        uint256 balanceBefore = OWNER.balance;
        vm.prank(OWNER);
        pm.withdrawFunds(address(0));
        uint256 balanceAfter = OWNER.balance;

        assertEq(balanceAfter - balanceBefore, 0.1 ether);
    }

    function testWithdrawSaleTokens_DuringSale_Reverts() public {
        vm.prank(OWNER);
        vm.expectRevert(PaymentManager.SaleActive.selector);
        pm.withdrawSaleTokens(SUPPLY);
    }

    function testWithdrawSaleTokens_AfterSale() public {
        // Deactivate the stage
        vm.prank(OWNER);
        pm.addStage(PRICE, SUPPLY, MIN, MAX);
        vm.prank(OWNER);
        pm.activateStage(1);

        uint256 balanceBefore = saleToken.balanceOf(OWNER);
        vm.prank(OWNER);
        pm.withdrawSaleTokens(SUPPLY);
        uint256 balanceAfter = saleToken.balanceOf(OWNER);

        assertEq(balanceAfter - balanceBefore, SUPPLY);
    }

    // ──────────────────────────────────────────────────
    //  INVALID TOKEN / WRONG STAGE
    // ──────────────────────────────────────────────────

    function testInvalidToken_Reverts() public {
        // Deploy a random ERC20
        MockERC20 fake = new MockERC20("FAKE", "FAKE", 18);
        fake.mint(USER, 100 * 1e18);

        vm.prank(USER);
        fake.approve(address(pm), 100 * 1e18);

        vm.prank(USER);
        vm.expectRevert(PaymentManager.UnsupportedToken.selector);
        pm.buyWithToken(address(fake), 100 * 1e18);
    }

    function testBuyWithNoStages_Reverts() public {
        PaymentManager pm2;
        vm.prank(OWNER);
        pm2 = new PaymentManager(address(saleToken), address(usdt), address(aggregator));

        vm.expectRevert(PaymentManager.NoStagesConfigured.selector);
        vm.prank(USER);
        pm2.buyWithNative{value: 0.1 ether}();
    }

    function testStageSwitchResetsPerStageContributions() public {
        vm.prank(OWNER);
        pm.addStage(PRICE, SUPPLY, MIN, MAX);
        vm.prank(OWNER);
        pm.activateStage(1);

        _approveUsdt(USER, MIN);
        vm.prank(USER);
        pm.buyWithToken(address(usdt), MIN);

        assertEq(pm.userInvestment(USER), MIN);

        vm.prank(OWNER);
        pm.addStage(PRICE, SUPPLY, MIN, MAX);
        vm.prank(OWNER);
        pm.activateStage(2);

        _approveUsdt(USER, MIN);
        vm.prank(USER);
        pm.buyWithToken(address(usdt), MIN);

        assertEq(pm.userInvestment(USER), MIN);
    }

    // ──────────────────────────────────────────────────
    //  ZERO AMOUNT
    // ──────────────────────────────────────────────────

    function testBuyWithToken_ZeroAmount_Reverts() public {
        vm.prank(USER);
        vm.expectRevert(PaymentManager.InvalidAmount.selector);
        pm.buyWithToken(address(usdt), 0);
    }

    function testBuyWithNative_ZeroAmount_Reverts() public {
        vm.prank(USER);
        vm.expectRevert(PaymentManager.InvalidAmount.selector);
        pm.buyWithNative{value: 0}();
    }

    // ──────────────────────────────────────────────────
    //  CONSTRUCTOR VALIDATION
    // ──────────────────────────────────────────────────

    function testConstructor_ZeroSaleToken_Reverts() public {
        vm.prank(OWNER);
        vm.expectRevert(PaymentManager.ZeroAddress.selector);
        new PaymentManager(address(0), address(usdt), address(aggregator));
    }

    function testConstructor_ZeroUsdt_Reverts() public {
        vm.prank(OWNER);
        vm.expectRevert(PaymentManager.ZeroAddress.selector);
        new PaymentManager(address(saleToken), address(0), address(aggregator));
    }

    function testConstructor_ZeroFeed_Reverts() public {
        vm.prank(OWNER);
        vm.expectRevert(PaymentManager.ZeroAddress.selector);
        new PaymentManager(address(saleToken), address(usdt), address(0));
    }

    // ──────────────────────────────────────────────────
    //  VIEW HELPERS
    // ──────────────────────────────────────────────────

    function testCurrentStageInfo() public {
        (uint256 price, uint256 supply, uint256 sold, uint256 minPer, uint256 maxPer, bool active) = pm.currentStageInfo();
        assertEq(price, PRICE);
        assertEq(supply, SUPPLY);
        assertEq(sold, 0);
        assertEq(minPer, MIN);
        assertEq(maxPer, MAX);
        assertTrue(active);
    }

    function testPreviewPurchase_USDT() public {
        (uint256 usdtAmount, uint256 tokenAmount, uint256 stage, uint256 remaining) = pm.previewPurchase(100 * 1e18, false);
        uint256 expectedTokens = (100 * 1e18 * 1e18) / PRICE;
        assertEq(usdtAmount, 100 * 1e18);
        assertEq(tokenAmount, expectedTokens);
        assertEq(stage, 0);
        assertEq(remaining, SUPPLY);
    }

    function testPreviewPurchase_BNB() public {
        (uint256 usdtAmount, uint256 tokenAmount,,) = pm.previewPurchase(0.1 ether, true);
        uint256 expectedUsdt = (0.1 ether * uint256(60_000 * 1e8)) / 1e8;
        assertEq(usdtAmount, expectedUsdt);
        assertGt(tokenAmount, 0);
    }

    function testPreviewPurchase_ExceedsSupply() public {
        (uint256 usdtAmount, uint256 tokenAmount,, uint256 remaining) = pm.previewPurchase(SUPPLY * PRICE / 1e18 * 10, false);
        assertEq(tokenAmount, remaining);
    }

    function testPreviewPurchase_Inactive() public {
        vm.prank(OWNER);
        pm.addStage(PRICE, SUPPLY, MIN, MAX);
        vm.prank(OWNER);
        pm.activateStage(1);
        (uint256 usdtAmount, uint256 tokenAmount, uint256 stage,) = pm.previewPurchase(100 * 1e18, false);
        assertEq(usdtAmount, 100 * 1e18);
        assertGt(tokenAmount, 0);
        assertEq(stage, 1);
    }

    // ──────────────────────────────────────────────────
    //  STAGE MANAGEMENT
    // ──────────────────────────────────────────────────

    function testUpdateStage() public {
        vm.prank(OWNER);
        pm.updateStage(0, 1 * 1e18, SUPPLY * 2, MIN, MAX);
        (uint256 price,,,,,) = pm.currentStageInfo();
        assertEq(price, 1 * 1e18);
    }

    function testUpdateStage_SupplyTooLow() public {
        _approveUsdt(USER, 100 * 1e18);
        vm.prank(USER);
        pm.buyWithToken(address(usdt), 100 * 1e18);

        // Tokens sold: 100 * 1e18 / PRICE = 200 tokens
        vm.prank(OWNER);
        vm.expectRevert(PaymentManager.SupplyTooLow.selector);
        pm.updateStage(0, PRICE, 100 * 1e18, MIN, MAX); // supply < sold
    }

    function testAddStage() public {
        vm.prank(OWNER);
        pm.addStage(1 * 1e18, SUPPLY, MIN, MAX);
        assertEq(pm.stageCount(), 2);
    }

    function testStageCount() public {
        assertEq(pm.stageCount(), 1);
    }

    // ──────────────────────────────────────────────────
    //  NATIVE RATE OVERRIDE
    // ──────────────────────────────────────────────────

    function testNativeRateOverride_Getter() public {
        assertEq(pm.nativeRateOverride(), 0);
        vm.prank(OWNER);
        pm.setNativeToUsdtRate(60_000 * 1e18);
        assertEq(pm.nativeRateOverride(), 60_000 * 1e18);
    }

    function testNativeRateOverride_OnlyOwner() public {
        vm.prank(USER);
        vm.expectRevert();
        pm.setNativeToUsdtRate(60_000 * 1e18);
    }

    // ──────────────────────────────────────────────────
    //  MULTIPLE CONTRIBUTIONS
    // ──────────────────────────────────────────────────

    function testMultipleContributions_SameUser() public {
        _approveUsdt(USER, MAX);
        vm.prank(USER);
        pm.buyWithToken(address(usdt), 100 * 1e18);
        vm.prank(USER);
        pm.buyWithToken(address(usdt), 200 * 1e18);
        assertEq(pm.userInvestment(USER), 300 * 1e18);
    }

    function testMultipleUsers() public {
        _approveUsdt(USER, MAX);
        _approveUsdt(USER2, MAX);
        vm.prank(USER);
        pm.buyWithToken(address(usdt), 100 * 1e18);
        vm.prank(USER2);
        pm.buyWithToken(address(usdt), 200 * 1e18);
        assertEq(pm.userInvestment(USER), 100 * 1e18);
        assertEq(pm.userInvestment(USER2), 200 * 1e18);
    }

    // ──────────────────────────────────────────────────
    //  RECEIVE
    // ──────────────────────────────────────────────────

    function testReceive() public {
        vm.prank(USER);
        (bool success,) = address(pm).call{value: 0.1 ether}("");
        assertTrue(success);
        assertGt(pm.userInvestment(USER), 0);
    }

    // ──────────────────────────────────────────────────
    //  UPDATE STAGE EVENTS
    // ──────────────────────────────────────────────────

    function testActivateStageEvent() public {
        vm.prank(OWNER);
        pm.addStage(PRICE, SUPPLY, MIN, MAX);
        vm.expectEmit(true, false, false, false);
        emit PaymentManager.StageActivated(1);
        vm.prank(OWNER);
        pm.activateStage(1);
    }

    // ──────────────────────────────────────────────────
    //  TOTAL RAISED / IMMUTABLES
    // ──────────────────────────────────────────────────

    function testTotalRaised() public {
        assertEq(pm.totalRaised(), 0);
        _approveUsdt(USER, 100 * 1e18);
        vm.prank(USER);
        pm.buyWithToken(address(usdt), 100 * 1e18);
        assertEq(pm.totalRaised(), 100 * 1e18);
    }

    function testImmutableAddresses() public {
        assertEq(address(pm.SALE_TOKEN()), address(saleToken));
        assertEq(address(pm.USDT()), address(usdt));
        assertEq(address(pm.BNB_USD_FEED()), address(aggregator));
    }

    // ──────────────────────────────────────────────────
    //  EDGE: UPDATE INACTIVE STAGE
    // ──────────────────────────────────────────────────

    function testUpdateInactiveStage() public {
        vm.prank(OWNER);
        pm.addStage(PRICE, SUPPLY, MIN, MAX);
        vm.prank(OWNER);
        pm.updateStage(1, 2 * 1e18, SUPPLY, MIN, MAX);
        assertEq(pm.stageCount(), 2);
    }

    function testUpdateStage_InvalidIndex() public {
        vm.prank(OWNER);
        vm.expectRevert(PaymentManager.InvalidStage.selector);
        pm.updateStage(99, PRICE, SUPPLY, MIN, MAX);
    }
}
