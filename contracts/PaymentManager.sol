// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Ownable2Step } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { IAggregatorV3Interface } from "./interfaces/IAggregatorV3Interface.sol";

/// @title PaymentManager
/// @author Relcko
/// @notice Manages presale payment collection with multi-stage support, Chainlink BNB/USD oracle,
///         and USDT / native (BNB) purchases.
///
/// @dev === DESIGN OVERVIEW ===
///
/// **Stages:** The presale is divided into sequential stages, each with its own token price
/// (denominated in USDT, 18 decimals), supply cap, and per-user contribution limits.
/// Only one stage may be active at a time. The owner activates stages.
///
/// **Payments:**
///   - `buyWithToken`   — USDT only. Tokens are calculated as `paymentAmount / price`.
///   - `buyWithNative`  — BNB (native). BNB is converted to USDT via the Chainlink BNB/USD
///      oracle (or an emergency owner-override rate), then tokens are calculated as above.
///
/// **Oracle:** The native-to-USDT conversion uses the Chainlink BNB/USD price feed with a
/// 2-hour staleness threshold. The owner may set an emergency override rate.
///
/// **Security:**
///   - ReentrancyGuard protects all purchase functions.
///   - Pausable allows emergency stop by owner.
///   - Checks-Effects-Interactions pattern followed in all state-changing functions.
///   - Custom errors for all failure modes (gas-efficient, no string reversal).
///
/// **Withdrawals:**
///   - Collected USDT and BNB can be withdrawn by the owner at any time.
///   - Unsold RLKO tokens can be withdrawn only when no stage is active.
contract PaymentManager is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════════════════
    //  CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════════

    /// @notice Maximum age of Chainlink oracle data before it is considered stale (2 hours).
    uint256 public constant ORACLE_STALENESS_THRESHOLD = 7200;

    /// @notice Number of decimals in the Chainlink BNB/USD answer.
    uint256 public constant ORACLE_DECIMALS = 8;

    /// @notice Precision denominator for 18-decimal operations.
    uint256 public constant PRECISION_18 = 1e18;

    // ═══════════════════════════════════════════════════════════════════════════════
    //  CUSTOM ERRORS
    // ═══════════════════════════════════════════════════════════════════════════════

    /// @notice Cannot buy when no stage is active.
    error StageInactive();

    /// @notice The requested stage index does not exist.
    error InvalidStage();

    /// @notice The payment token is not accepted (only USDT is supported).
    error UnsupportedToken();

    /// @notice Payment amount must be greater than zero.
    error InvalidAmount();

    /// @notice Purchase would exceed the stage's remaining token supply.
    error ExceedsStageSupply();

    /// @notice Contribution would exceed the per-user maximum for this stage.
    error ExceedsUserLimit();

    /// @notice Contribution is below the per-user minimum for this stage.
    error BelowUserMinimum();

    /// @notice Chainlink oracle is not available (call reverted).
    error OracleUnavailable();

    /// @notice Chainlink oracle returned zero or negative price.
    error InvalidOraclePrice();

    /// @notice Chainlink oracle data is stale (exceeded staleness threshold).
    error StaleOracleData();

    /// @notice Constructor received a zero address.
    error ZeroAddress();

    /// @notice Cannot withdraw sale tokens while a sale is active.
    error SaleActive();

    /// @notice The stage is already active.
    error StageAlreadyActive();

    /// @notice No stages have been configured.
    error NoStagesConfigured();

    /// @notice New supply is less than tokens already sold in this stage.
    error SupplyTooLow();

    /// @notice Native token transfer to owner failed.
    error TransferFailed();

    /// @notice Token price cannot be zero.
    error InvalidPrice();

    /// @notice Stage configuration is invalid (supply is zero or limits are inconsistent).
    error InvalidStageConfig();

    /// @notice Insufficient sale token balance for withdrawal.
    error InsufficientBalance();

    // ═══════════════════════════════════════════════════════════════════════════════
    //  EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════

    /// @notice Emitted when a new stage is added.
    /// @param stageId   Index of the added stage.
    /// @param price     Token price in USDT (18 decimals).
    /// @param supply    Token supply cap for the stage.
    /// @param minPerUser Minimum contribution per user in USDT.
    /// @param maxPerUser Maximum contribution per user in USDT.
    event StageAdded(uint256 indexed stageId, uint256 price, uint256 supply, uint256 minPerUser, uint256 maxPerUser);

    /// @notice Emitted when a stage's parameters are updated.
    /// @param stageId   Index of the updated stage.
    /// @param price     New token price.
    /// @param supply    New supply cap.
    /// @param minPerUser New minimum per user.
    /// @param maxPerUser New maximum per user.
    event StageUpdated(uint256 indexed stageId, uint256 price, uint256 supply, uint256 minPerUser, uint256 maxPerUser);

    /// @notice Emitted when a stage becomes active.
    /// @param stageId Index of the activated stage.
    event StageActivated(uint256 indexed stageId);

    /// @notice Emitted when a stage is deactivated.
    /// @param stageId Index of the deactivated stage.
    event StageDeactivated(uint256 indexed stageId);

    /// @notice Emitted when purchases are paused.
    event StagePaused();

    /// @notice Emitted when purchases resume.
    event StageResumed();

    /// @notice Emitted when tokens are purchased.
    /// @param buyer        Address of the buyer.
    /// @param paymentToken Address of the token used (address(0) for native).
    /// @param paymentAmount Amount paid in USDT or USDT-equivalent (18 decimals).
    /// @param tokenAmount   Amount of sale tokens purchased.
    /// @param stage        Stage index of the purchase.
    event TokensPurchased(address indexed buyer, address indexed paymentToken, uint256 paymentAmount, uint256 tokenAmount, uint256 stage);

    /// @notice Emitted when funds are withdrawn.
    /// @param token  Address of the withdrawn token (address(0) for native).
    /// @param amount Amount withdrawn.
    event Withdrawn(address indexed token, uint256 amount);

    /// @notice Emitted when the native-to-USDT override rate changes.
    /// @param rate New override rate (0 means Chainlink is live).
    event NativeRateUpdated(uint256 rate);

    // ═══════════════════════════════════════════════════════════════════════════════
    //  STATE
    // ═══════════════════════════════════════════════════════════════════════════════

    /// @notice The token being sold (RLKO).
    IERC20 public immutable SALE_TOKEN;

    /// @notice The USDT token used for quote payments.
    IERC20 public immutable USDT;

    /// @notice Chainlink BNB/USD price feed.
    IAggregatorV3Interface public immutable BNB_USD_FEED;

    /// @dev Emergency override for the native-to-USDT rate. Zero = use Chainlink.
    uint256 private _nativeRateOverride;

    /// @notice Presale stage configuration.
    struct Stage {
        /// @notice Token price in USDT (18 decimals).
        uint256 price;
        /// @notice Maximum token supply for this stage.
        uint256 supply;
        /// @notice Tokens sold so far in this stage.
        uint256 sold;
        /// @notice Minimum contribution per user in USDT (18 decimals).
        uint256 minPerUser;
        /// @notice Maximum contribution per user in USDT (18 decimals).
        uint256 maxPerUser;
        /// @notice Whether the stage is active.
        bool active;
    }

    /// @notice Array of all configured stages.
    Stage[] public stages;

    /// @notice Index of the currently active stage.
    uint256 public currentStageIndex;

    /// @notice Contributions per user per stage (USDT, 18 decimals).
    mapping(address user => mapping(uint256 stageId => uint256 amount)) public userContributions;

    /// @notice Total USDT raised across all stages.
    uint256 public totalRaised;

    /// @notice Total sale tokens sold across all stages.
    uint256 public totalTokensSold;

    /// @notice Sum of all stage supply caps.
    uint256 public totalAllocation;

    // ═══════════════════════════════════════════════════════════════════════════════
    //  CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════

    /// @notice Deploy the PaymentManager.
    /// @param _saleToken  Address of the token being sold (RLKO).
    /// @param _usdt       Address of the USDT token.
    /// @param _bnbUsdFeed Address of the Chainlink BNB/USD price feed.
    constructor(address _saleToken, address _usdt, address _bnbUsdFeed) Ownable(msg.sender) {
        if (_saleToken == address(0)) revert ZeroAddress();
        if (_usdt == address(0)) revert ZeroAddress();
        if (_bnbUsdFeed == address(0)) revert ZeroAddress();
        SALE_TOKEN = IERC20(_saleToken);
        USDT = IERC20(_usdt);
        BNB_USD_FEED = IAggregatorV3Interface(_bnbUsdFeed);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    //  MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════════

    /// @dev Reverts if there is no active stage.
    modifier stageActive() {
        if (currentStageIndex >= stages.length) revert NoStagesConfigured();
        if (!stages[currentStageIndex].active) revert StageInactive();
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    //  ADMIN — STAGE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════════

    /// @notice Add a new presale stage (starts inactive).
    /// @param price      Token price in USDT (18 decimals).
    /// @param supply     Maximum number of tokens for this stage.
    /// @param minPerUser Minimum contribution in USDT per user (18 decimals).
    /// @param maxPerUser Maximum contribution in USDT per user (18 decimals).
    function addStage(uint256 price, uint256 supply, uint256 minPerUser, uint256 maxPerUser) external onlyOwner {
        if (price == 0) revert InvalidPrice();
        if (supply == 0 || maxPerUser < minPerUser) revert InvalidStageConfig();
        stages.push(Stage(price, supply, 0, minPerUser, maxPerUser, false));
        unchecked {
            totalAllocation += supply;
        }
        emit StageAdded(stages.length - 1, price, supply, minPerUser, maxPerUser);
    }

    /// @notice Activate a stage, deactivating any previously active stage.
    /// @param stageId Index of the stage to activate.
    function activateStage(uint256 stageId) external onlyOwner {
        if (stageId >= stages.length) revert InvalidStage();
        if (stages[stageId].active) revert StageAlreadyActive();

        // Deactivate the currently active stage if there is one.
        if (currentStageIndex < stages.length && stages[currentStageIndex].active) {
            stages[currentStageIndex].active = false;
            emit StageDeactivated(currentStageIndex);
        }

        stages[stageId].active = true;
        currentStageIndex = stageId;
        emit StageActivated(stageId);
    }

    /// @notice Update a stage's parameters.
    /// @param stageId    Index of the stage to update.
    /// @param price      New token price in USDT (18 decimals).
    /// @param supply     New maximum token supply.
    /// @param minPerUser New minimum per user contribution in USDT (18 decimals).
    /// @param maxPerUser New maximum per user contribution in USDT (18 decimals).
    function updateStage(uint256 stageId, uint256 price, uint256 supply, uint256 minPerUser, uint256 maxPerUser) external onlyOwner {
        if (stageId >= stages.length) revert InvalidStage();
        if (price == 0) revert InvalidPrice();
        if (supply == 0 || maxPerUser < minPerUser) revert InvalidStageConfig();
        Stage storage s = stages[stageId];

        if (s.sold > supply) revert SupplyTooLow();

        unchecked {
            totalAllocation = totalAllocation - s.supply + supply;
        }

        s.price = price;
        s.supply = supply;
        s.minPerUser = minPerUser;
        s.maxPerUser = maxPerUser;

        emit StageUpdated(stageId, price, supply, minPerUser, maxPerUser);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    //  FRONTEND ABI — VIEWS  (preserved signatures for frontend compatibility)
    // ═══════════════════════════════════════════════════════════════════════════════

    /// @notice Returns the index of the currently active stage.
    /// @return Current stage index.
    function currentStage() external view returns (uint256) {
        return currentStageIndex;
    }

    /// @notice Returns the token price for the active stage (USDT, 18 decimals).
    /// @return Token price, or 0 if no stage is active.
    function tokenPrice() external view returns (uint256) {
        if (currentStageIndex < stages.length && stages[currentStageIndex].active) {
            return stages[currentStageIndex].price;
        }
        return 0;
    }

    /// @notice Returns the remaining token supply in the active stage.
    /// @return Remaining supply, or 0 if no stage is active.
    function tokensRemaining() external view returns (uint256) {
        if (currentStageIndex < stages.length && stages[currentStageIndex].active) {
            unchecked {
                return stages[currentStageIndex].supply - stages[currentStageIndex].sold;
            }
        }
        return 0;
    }

    /// @notice Returns the total amount a user has contributed in USDT for the active stage.
    /// @param account The user address.
    /// @return Contribution amount in USDT (18 decimals).
    function userInvestment(address account) external view returns (uint256) {
        if (currentStageIndex < stages.length) {
            return userContributions[account][currentStageIndex];
        }
        return 0;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    //  VIEW HELPERS
    // ═══════════════════════════════════════════════════════════════════════════════

    /// @notice Returns the complete active stage struct.
    /// @return price      Token price (USDT, 18 decimals).
    /// @return supply     Total supply cap.
    /// @return sold       Tokens sold so far.
    /// @return minPerUser Minimum per user contribution (USDT, 18 decimals).
    /// @return maxPerUser Maximum per user contribution (USDT, 18 decimals).
    /// @return active     Whether the stage is active.
    function currentStageInfo()
        external
        view
        returns (uint256 price, uint256 supply, uint256 sold, uint256 minPerUser, uint256 maxPerUser, bool active)
    {
        if (currentStageIndex >= stages.length) {
            return (0, 0, 0, 0, 0, false);
        }
        Stage storage s = stages[currentStageIndex];
        return (s.price, s.supply, s.sold, s.minPerUser, s.maxPerUser, s.active);
    }

    /// @notice Preview a purchase without modifying state.
    /// @param paymentAmount Amount in USDT (or wei when isNative).
    /// @param isNative      True if the payment is in native token (BNB).
    /// @return usdtAmount     USDT-equivalent value (18 decimals).
    /// @return tokenAmount    Tokens the caller would receive.
    /// @return stage          The active stage index.
    /// @return remainingSupply Supply remaining after the hypothetical purchase.
    function previewPurchase(uint256 paymentAmount, bool isNative)
        external
        view
        returns (uint256 usdtAmount, uint256 tokenAmount, uint256 stage, uint256 remainingSupply)
    {
        if (currentStageIndex >= stages.length || !stages[currentStageIndex].active) {
            return (0, 0, currentStageIndex, 0);
        }

        Stage storage s = stages[currentStageIndex];

        if (isNative) {
            usdtAmount = _nativeToUsdt(paymentAmount);
        } else {
            usdtAmount = paymentAmount;
        }

        if (usdtAmount == 0 || s.price == 0) {
            return (0, 0, currentStageIndex, 0);
        }

        tokenAmount = _calculateTokenAmount(usdtAmount, s.price);

        unchecked {
            remainingSupply = s.supply - s.sold;
        }

        if (tokenAmount > remainingSupply) {
            tokenAmount = remainingSupply;
        }

        stage = currentStageIndex;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    //  PURCHASE
    // ═══════════════════════════════════════════════════════════════════════════════

    /// @notice Buy tokens with an ERC20 token (USDT only).
    /// @param paymentToken Address of the ERC20 token (must be USDT).
    /// @param paymentAmount Amount of paymentToken to spend.
    ///
    /// @dev Follows Checks-Effects-Interactions pattern.
    function buyWithToken(address paymentToken, uint256 paymentAmount) external nonReentrant whenNotPaused stageActive {
        if (paymentToken != address(USDT)) revert UnsupportedToken();
        if (paymentAmount == 0) revert InvalidAmount();

        Stage storage s = stages[currentStageIndex];

        uint256 contribution = userContributions[msg.sender][currentStageIndex] + paymentAmount;
        if (contribution < s.minPerUser) revert BelowUserMinimum();
        if (contribution > s.maxPerUser) revert ExceedsUserLimit();

        uint256 tokenAmount = _calculateTokenAmount(paymentAmount, s.price);
        if (s.sold + tokenAmount > s.supply) revert ExceedsStageSupply();

        // ── Effects ──
        userContributions[msg.sender][currentStageIndex] = contribution;
        unchecked {
            s.sold += tokenAmount;
            totalRaised += paymentAmount;
            totalTokensSold += tokenAmount;
        }

        // ── Interactions ──
        USDT.safeTransferFrom(msg.sender, address(this), paymentAmount);
        SALE_TOKEN.safeTransfer(msg.sender, tokenAmount);

        emit TokensPurchased(msg.sender, paymentToken, paymentAmount, tokenAmount, currentStageIndex);
    }

    /// @notice Buy tokens with native currency (BNB).
    ///
    /// @dev Follows Checks-Effects-Interactions pattern.
    ///      The BNB->USDT conversion uses the Chainlink oracle or emergency override.
    function buyWithNative() external payable nonReentrant whenNotPaused stageActive {
        _buyWithNative(msg.sender, msg.value);
    }

    /// @dev Internal purchase logic shared by buyWithNative() and receive().
    function _buyWithNative(address buyer, uint256 nativeAmount) internal {
        if (nativeAmount == 0) revert InvalidAmount();

        uint256 usdtAmount = _nativeToUsdt(nativeAmount);

        Stage storage s = stages[currentStageIndex];

        uint256 contribution = userContributions[buyer][currentStageIndex] + usdtAmount;
        if (contribution < s.minPerUser) revert BelowUserMinimum();
        if (contribution > s.maxPerUser) revert ExceedsUserLimit();

        uint256 tokenAmount = _calculateTokenAmount(usdtAmount, s.price);
        if (s.sold + tokenAmount > s.supply) revert ExceedsStageSupply();

        // ── Effects ──
        userContributions[buyer][currentStageIndex] = contribution;
        unchecked {
            s.sold += tokenAmount;
            totalRaised += usdtAmount;
            totalTokensSold += tokenAmount;
        }

        SALE_TOKEN.safeTransfer(buyer, tokenAmount);

        emit TokensPurchased(buyer, address(0), usdtAmount, tokenAmount, currentStageIndex);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    //  ORACLE
    // ═══════════════════════════════════════════════════════════════════════════════

    /// @notice Convert native token amount to USDT using the Chainlink oracle.
    /// @param nativeAmount Native token amount in wei (18 decimals).
    /// @return usdtAmount Equivalent USDT amount (18 decimals).
    ///
    /// @dev Falls back to the emergency override rate if set (non-zero).
    ///      Validates that the price is positive, the round is complete, and data
    ///      is not stale (within ORACLE_STALENESS_THRESHOLD).
    function _nativeToUsdt(uint256 nativeAmount) internal view returns (uint256 usdtAmount) {
        if (_nativeRateOverride > 0) {
            return (nativeAmount * _nativeRateOverride) / PRECISION_18;
        }

        // slither-disable-next-line calls-loop
        try BNB_USD_FEED.latestRoundData() returns (
            uint80 roundId, int256 answer, uint256, /* startedAt */ uint256 updatedAt, uint80 answeredInRound
        ) {
            if (answer <= 0) revert InvalidOraclePrice();
            if (answeredInRound < roundId) revert StaleOracleData();
            if (updatedAt == 0) revert StaleOracleData();

            unchecked {
                if (block.timestamp - updatedAt > ORACLE_STALENESS_THRESHOLD) revert StaleOracleData();
            }

            return (nativeAmount * uint256(answer)) / (10 ** ORACLE_DECIMALS);
        } catch {
            revert OracleUnavailable();
        }
    }

    /// @notice Set an emergency override for the native-to-USDT rate.
    /// @param rate Rate in 18 decimals (e.g. 60_000e18 for 1 BNB = 60 000 USDT).
    ///             Set to zero to revert to using the Chainlink oracle.
    function setNativeToUsdtRate(uint256 rate) external onlyOwner {
        _nativeRateOverride = rate;
        emit NativeRateUpdated(rate);
    }

    /// @notice Returns the current override rate (0 means Chainlink is live).
    function nativeRateOverride() external view returns (uint256) {
        return _nativeRateOverride;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    //  ADMIN — WITHDRAWALS
    // ═══════════════════════════════════════════════════════════════════════════════

    /// @notice Withdraw collected funds (USDT or native BNB).
    /// @param token Token address, or address(0) for native BNB.
    function withdrawFunds(address token) external onlyOwner {
        if (token == address(0)) {
            uint256 balance = address(this).balance;
            emit Withdrawn(token, balance);
            (bool success,) = owner().call{ value: balance }("");
            if (!success) revert TransferFailed();
        } else {
            uint256 balance = IERC20(token).balanceOf(address(this));
            emit Withdrawn(token, balance);
            IERC20(token).safeTransfer(owner(), balance);
        }
    }

    /// @notice Withdraw unsold sale tokens (RLKO).
    /// @param amount Amount of sale tokens to withdraw.
    ///
    /// @dev Only possible when no stage is active (prevents withdrawal during sale).
    function withdrawSaleTokens(uint256 amount) external onlyOwner {
        if (currentStageIndex < stages.length && stages[currentStageIndex].active) revert SaleActive();
        if (amount > SALE_TOKEN.balanceOf(address(this))) revert InsufficientBalance();
        SALE_TOKEN.safeTransfer(owner(), amount);
        emit Withdrawn(address(SALE_TOKEN), amount);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    //  PAUSE / RESUME
    // ═══════════════════════════════════════════════════════════════════════════════

    /// @notice Pause all purchases.
    function pause() external onlyOwner {
        _pause();
        emit StagePaused();
    }

    /// @notice Resume all purchases.
    function unpause() external onlyOwner {
        _unpause();
        emit StageResumed();
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════════════════════════════

    /// @notice Returns the total number of configured stages.
    function stageCount() external view returns (uint256) {
        return stages.length;
    }

    /// @notice Calculate the token amount for a given payment in USDT.
    /// @param paymentUsdt Amount paid in USDT (18 decimals).
    /// @param price       Token price in USDT (18 decimals).
    /// @return tokenAmount Amount of sale tokens (18 decimals).
    function _calculateTokenAmount(uint256 paymentUsdt, uint256 price) internal pure returns (uint256 tokenAmount) {
        return (paymentUsdt * PRECISION_18) / price;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    //  FALLBACK
    // ═══════════════════════════════════════════════════════════════════════════════

    /// @notice Forward native transfers to buyWithNative().
    /// @dev Uses the internal path so msg.sender is preserved as the original caller.
    receive() external payable nonReentrant whenNotPaused stageActive {
        _buyWithNative(msg.sender, msg.value);
    }
}
