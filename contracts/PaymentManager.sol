// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title AggregatorV3Interface
/// @author Chainlink
/// @notice Chainlink price feed interface
interface AggregatorV3Interface {
    /// @notice Number of decimals in the price answer
    function decimals() external view returns (uint8);
    /// @notice Latest round data from the price feed
    /// @return roundId Round ID
    /// @return answer Price
    /// @return startedAt Timestamp when the round started
    /// @return updatedAt Timestamp when the round was updated
    /// @return answeredInRound Round ID in which the answer was computed
    function latestRoundData() external view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

/// @title PaymentManager
/// @author Relcko
/// @notice Manages presale payment collection with multi-stage support, Chainlink BNB/USD oracle, and USDT/native purchases
contract PaymentManager is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ══════════════════════════════════════════════════════════
    //  CUSTOM ERRORS
    // ══════════════════════════════════════════════════════════

    /// @notice Cannot buy when no stage is active
    error StageInactive();
    /// @notice The requested stage index does not exist
    error InvalidStage();
    /// @notice The payment token is not accepted
    error UnsupportedToken();
    /// @notice Payment amount must be greater than zero
    error InvalidAmount();
    /// @notice Purchase would exceed the stage's remaining token supply
    error ExceedsStageSupply();
    /// @notice Contribution would exceed the per-user maximum for this stage
    error ExceedsUserLimit();
    /// @notice Contribution is below the per-user minimum for this stage
    error BelowUserMinimum();
    /// @notice Chainlink oracle is not available
    error OracleUnavailable();
    /// @notice Chainlink oracle returned zero or negative price
    error InvalidOraclePrice();
    /// @notice Chainlink oracle data is stale
    error StaleOracleData();
    /// @notice Constructor received a zero address
    error ZeroAddress();
    /// @notice Cannot withdraw sale tokens while a sale is active
    error SaleActive();
    /// @notice The stage is already active
    error StageAlreadyActive();
    /// @notice No stages have been configured
    error NoStagesConfigured();
    /// @notice New supply is less than tokens already sold in this stage
    error SupplyTooLow();
    /// @notice Native token transfer to owner failed
    error TransferFailed();

    // ══════════════════════════════════════════════════════════
    //  EVENTS
    // ══════════════════════════════════════════════════════════

    /// @notice Emitted when a new stage is added
    /// @param stageId Index of the added stage
    /// @param price Token price in USDT (18 decimals)
    /// @param supply Token supply cap for the stage
    /// @param minPerUser Minimum USDT per user
    /// @param maxPerUser Maximum USDT per user
    event StageAdded(uint256 indexed stageId, uint256 price, uint256 supply, uint256 minPerUser, uint256 maxPerUser);
    /// @notice Emitted when a stage's parameters are updated
    /// @param stageId Index of the updated stage
    /// @param price New token price
    /// @param supply New supply cap
    /// @param minPerUser New minimum per user
    /// @param maxPerUser New maximum per user
    event StageUpdated(uint256 indexed stageId, uint256 price, uint256 supply, uint256 minPerUser, uint256 maxPerUser);
    /// @notice Emitted when a stage becomes active
    /// @param stageId Index of the activated stage
    event StageActivated(uint256 indexed stageId);
    /// @notice Emitted when a stage is deactivated
    /// @param stageId Index of the deactivated stage
    event StageDeactivated(uint256 indexed stageId);
    /// @notice Emitted when purchases are paused
    event StagePaused();
    /// @notice Emitted when purchases resume
    event StageResumed();
    /// @notice Emitted when tokens are purchased
    /// @param buyer Address of the buyer
    /// @param paymentToken Address of the token used (address(0) for native)
    /// @param paymentAmount Amount paid (USDT or USDT-equivalent)
    /// @param tokenAmount Amount of sale tokens purchased
    /// @param stage Stage index of the purchase
    event TokensPurchased(address indexed buyer, address indexed paymentToken, uint256 paymentAmount, uint256 tokenAmount, uint256 stage);
    /// @notice Emitted when funds are withdrawn
    /// @param token Address of the withdrawn token (address(0) for native)
    /// @param amount Amount withdrawn
    event Withdrawn(address indexed token, uint256 amount);
    /// @notice Emitted when the native-to-USDT override rate changes
    /// @param rate New override rate (0 means Chainlink is live)
    event NativeRateUpdated(uint256 rate);

    // ══════════════════════════════════════════════════════════
    //  STATE
    // ══════════════════════════════════════════════════════════

    /// @notice The token being sold (RLKO)
    IERC20 public immutable SALE_TOKEN;
    /// @notice USDT token used for quote payments
    IERC20 public immutable USDT;
    /// @notice Chainlink BNB/USD price feed
    AggregatorV3Interface public immutable BNB_USD_FEED;

    uint256 private _nativeRateOverride;

    /// @notice Presale stage configuration
    struct Stage {
        uint256 price;
        uint256 supply;
        uint256 sold;
        uint256 minPerUser;
        uint256 maxPerUser;
        bool active;
    }

    /// @notice All configured stages
    Stage[] public stages;
    /// @notice Index of the currently active stage
    uint256 public currentStageIndex;
    /// @notice Contributions per user per stage (USDT, 18 decimals)
    mapping(address => mapping(uint256 => uint256)) public userContributions;
    /// @notice Total USDT raised across all stages
    uint256 public totalRaised;
    /// @notice Total sale tokens sold across all stages
    uint256 public totalTokensSold;
    /// @notice Total token allocation (sum of all stage supplies)
    uint256 public totalAllocation;

    // ══════════════════════════════════════════════════════════
    //  CONSTRUCTOR
    // ══════════════════════════════════════════════════════════

    /// @notice Deploy the PaymentManager
    /// @param _saleToken Address of the token being sold (RLKO)
    /// @param _usdt       Address of the USDT token
    /// @param _bnbUsdFeed Address of the Chainlink BNB/USD price feed
    constructor(address _saleToken, address _usdt, address _bnbUsdFeed) Ownable(msg.sender) {
        if (_saleToken == address(0)) revert ZeroAddress();
        if (_usdt == address(0)) revert ZeroAddress();
        if (_bnbUsdFeed == address(0)) revert ZeroAddress();
        SALE_TOKEN = IERC20(_saleToken);
        USDT = IERC20(_usdt);
        BNB_USD_FEED = AggregatorV3Interface(_bnbUsdFeed);
    }

    // ══════════════════════════════════════════════════════════
    //  MODIFIERS
    // ══════════════════════════════════════════════════════════

    /// @dev Reverts if there is no active stage
    modifier stageActive() {
        if (currentStageIndex >= stages.length) revert NoStagesConfigured();
        if (!stages[currentStageIndex].active) revert StageInactive();
        _;
    }

    // ══════════════════════════════════════════════════════════
    //  ADMIN — STAGE MANAGEMENT
    // ══════════════════════════════════════════════════════════

    /// @notice Add a new presale stage (starts inactive)
    /// @param price      Token price in USDT (18 decimals)
    /// @param supply     Maximum number of tokens for this stage
    /// @param minPerUser Minimum USDT a user must contribute
    /// @param maxPerUser Maximum USDT a user may contribute
    function addStage(uint256 price, uint256 supply, uint256 minPerUser, uint256 maxPerUser) external onlyOwner {
        stages.push(Stage(price, supply, 0, minPerUser, maxPerUser, false));
        unchecked { totalAllocation += supply; }
        emit StageAdded(stages.length - 1, price, supply, minPerUser, maxPerUser);
    }

    /// @notice Activate a stage, deactivating any previously active stage
    /// @param stageId Index of the stage to activate
    function activateStage(uint256 stageId) external onlyOwner {
        if (stageId >= stages.length) revert InvalidStage();
        if (stages[stageId].active) revert StageAlreadyActive();
        if (currentStageIndex < stages.length && stages[currentStageIndex].active) {
            stages[currentStageIndex].active = false;
            emit StageDeactivated(currentStageIndex);
        }
        stages[stageId].active = true;
        currentStageIndex = stageId;
        emit StageActivated(stageId);
    }

    /// @notice Update a stage's parameters
    /// @param stageId    Index of the stage to update
    /// @param price      New token price in USDT (18 decimals)
    /// @param supply     New maximum token supply
    /// @param minPerUser New minimum per user
    /// @param maxPerUser New maximum per user
    function updateStage(uint256 stageId, uint256 price, uint256 supply, uint256 minPerUser, uint256 maxPerUser) external onlyOwner {
        if (stageId >= stages.length) revert InvalidStage();
        Stage storage s = stages[stageId];
        if (s.sold > supply) revert SupplyTooLow();
        unchecked { totalAllocation = totalAllocation - s.supply + supply; }
        s.price = price;
        s.supply = supply;
        s.minPerUser = minPerUser;
        s.maxPerUser = maxPerUser;
        emit StageUpdated(stageId, price, supply, minPerUser, maxPerUser);
    }

    // ══════════════════════════════════════════════════════════
    //  FRONTEND ABI — READ  (backward-compatible signatures)
    // ══════════════════════════════════════════════════════════

    /// @notice Current active stage index
    function currentStage() external view returns (uint256) {
        return currentStageIndex;
    }

    /// @notice Token price for the active stage (USDT, 18 decimals)
    function tokenPrice() external view returns (uint256) {
        if (currentStageIndex < stages.length && stages[currentStageIndex].active) {
            return stages[currentStageIndex].price;
        }
        return 0;
    }

    /// @notice Remaining token supply in the active stage
    function tokensRemaining() external view returns (uint256) {
        if (currentStageIndex < stages.length && stages[currentStageIndex].active) {
            unchecked { return stages[currentStageIndex].supply - stages[currentStageIndex].sold; }
        }
        return 0;
    }

    /// @notice Total amount a user has contributed in USDT for the active stage
    /// @param account The user address
    function userInvestment(address account) external view returns (uint256) {
        if (currentStageIndex < stages.length) {
            return userContributions[account][currentStageIndex];
        }
        return 0;
    }

    // ══════════════════════════════════════════════════════════
    //  VIEW HELPERS
    // ══════════════════════════════════════════════════════════

    /// @notice Return the complete active stage struct
    /// @return price      Token price (USDT, 18 decimals)
    /// @return supply     Total supply cap
    /// @return sold       Tokens sold so far
    /// @return minPerUser Minimum per user (USDT, 18 decimals)
    /// @return maxPerUser Maximum per user (USDT, 18 decimals)
    /// @return active     Whether the stage is active
    function currentStageInfo() external view returns (
        uint256 price,
        uint256 supply,
        uint256 sold,
        uint256 minPerUser,
        uint256 maxPerUser,
        bool active
    ) {
        if (currentStageIndex >= stages.length) return (0, 0, 0, 0, 0, false);
        Stage storage s = stages[currentStageIndex];
        return (s.price, s.supply, s.sold, s.minPerUser, s.maxPerUser, s.active);
    }

    /// @notice Preview a purchase without modifying state
    /// @param paymentAmount Amount in USDT (or wei when isNative)
    /// @param isNative      True if the payment is in native token
    /// @return usdtAmount     USDT-equivalent value
    /// @return tokenAmount    Tokens the caller would receive
    /// @return stage          The active stage index
    /// @return remainingSupply Supply after the hypothetical purchase
    function previewPurchase(uint256 paymentAmount, bool isNative) external view returns (
        uint256 usdtAmount,
        uint256 tokenAmount,
        uint256 stage,
        uint256 remainingSupply
    ) {
        if (currentStageIndex >= stages.length || !stages[currentStageIndex].active) {
            return (0, 0, currentStageIndex, 0);
        }
        Stage storage s = stages[currentStageIndex];
        if (isNative) {
            usdtAmount = _nativeToUsdt(paymentAmount);
        } else {
            usdtAmount = paymentAmount;
        }
        if (usdtAmount == 0 || s.price == 0) return (0, 0, currentStageIndex, 0);
        tokenAmount = (usdtAmount * 1e18) / s.price;
        unchecked { remainingSupply = s.supply - s.sold; }
        if (tokenAmount > remainingSupply) tokenAmount = remainingSupply;
        stage = currentStageIndex;
    }

    // ══════════════════════════════════════════════════════════
    //  PURCHASE
    // ══════════════════════════════════════════════════════════

    /// @notice Buy tokens with an ERC20 (USDT)
    /// @param paymentToken Address of the ERC20 token (must be USDT)
    /// @param paymentAmount Amount of paymentToken to spend
    function buyWithToken(address paymentToken, uint256 paymentAmount) external nonReentrant whenNotPaused stageActive {
        if (paymentToken != address(USDT)) revert UnsupportedToken();
        if (paymentAmount == 0) revert InvalidAmount();
        Stage storage s = stages[currentStageIndex];
        uint256 contribution = userContributions[msg.sender][currentStageIndex] + paymentAmount;
        if (contribution < s.minPerUser) revert BelowUserMinimum();
        if (contribution > s.maxPerUser) revert ExceedsUserLimit();
        uint256 tokenAmount = (paymentAmount * 1e18) / s.price;
        if (s.sold + tokenAmount > s.supply) revert ExceedsStageSupply();
        USDT.safeTransferFrom(msg.sender, address(this), paymentAmount);
        userContributions[msg.sender][currentStageIndex] = contribution;
        unchecked {
            s.sold += tokenAmount;
            totalRaised += paymentAmount;
            totalTokensSold += tokenAmount;
        }
        emit TokensPurchased(msg.sender, paymentToken, paymentAmount, tokenAmount, currentStageIndex);
    }

    /// @notice Buy tokens with native currency (BNB)
    function buyWithNative() external payable nonReentrant whenNotPaused stageActive {
        if (msg.value == 0) revert InvalidAmount();
        Stage storage s = stages[currentStageIndex];
        uint256 usdtAmount = _nativeToUsdt(msg.value);
        uint256 contribution = userContributions[msg.sender][currentStageIndex] + usdtAmount;
        if (contribution < s.minPerUser) revert BelowUserMinimum();
        if (contribution > s.maxPerUser) revert ExceedsUserLimit();
        uint256 tokenAmount = (usdtAmount * 1e18) / s.price;
        if (s.sold + tokenAmount > s.supply) revert ExceedsStageSupply();
        userContributions[msg.sender][currentStageIndex] = contribution;
        unchecked {
            s.sold += tokenAmount;
            totalRaised += usdtAmount;
            totalTokensSold += tokenAmount;
        }
        emit TokensPurchased(msg.sender, address(0), usdtAmount, tokenAmount, currentStageIndex);
    }

    // ══════════════════════════════════════════════════════════
    //  ORACLE
    // ══════════════════════════════════════════════════════════

    /// @notice Convert native token amount to USDT using Chainlink oracle
    /// @dev    Falls back to emergency override rate if set
    /// @param nativeAmount Native token amount in wei (18 decimals)
    /// @return usdtAmount  Equivalent USDT amount (18 decimals)
    function _nativeToUsdt(uint256 nativeAmount) internal view returns (uint256 usdtAmount) {
        if (_nativeRateOverride > 0) {
            return (nativeAmount * _nativeRateOverride) / 1e18;
        }
        try BNB_USD_FEED.latestRoundData() returns (
            uint80 roundId,
            int256 answer,
            uint256 /* startedAt */,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            if (answer <= 0) revert InvalidOraclePrice();
            if (answeredInRound < roundId) revert StaleOracleData();
            if (updatedAt == 0) revert StaleOracleData();
            unchecked { if (block.timestamp - updatedAt > 7200) revert StaleOracleData(); }
            return (nativeAmount * uint256(answer)) / 1e8;
        } catch {
            revert OracleUnavailable();
        }
    }

    /// @notice Emergency override for native-to-USDT rate
    /// @param rate Rate in 18 decimals (e.g. 60000e18 for 1 BNB = 60 000 USDT). Zero = use Chainlink.
    function setNativeToUsdtRate(uint256 rate) external onlyOwner {
        _nativeRateOverride = rate;
        emit NativeRateUpdated(rate);
    }

    /// @notice Current override rate (0 means Chainlink is live)
    function nativeRateOverride() external view returns (uint256) {
        return _nativeRateOverride;
    }

    // ══════════════════════════════════════════════════════════
    //  ADMIN — WITHDRAWALS
    // ══════════════════════════════════════════════════════════

    /// @notice Withdraw collected funds (USDT or native BNB)
    /// @param token Token address, or address(0) for native
    function withdrawFunds(address token) external onlyOwner {
        if (token == address(0)) {
            uint256 balance = address(this).balance;
            emit Withdrawn(token, balance);
            (bool success, ) = owner().call{value: balance}("");
            if (!success) revert TransferFailed();
        } else {
            uint256 balance = IERC20(token).balanceOf(address(this));
            emit Withdrawn(token, balance);
            IERC20(token).safeTransfer(owner(), balance);
        }
    }

    /// @notice Withdraw unsold sale tokens (RLKO) — only when no stage is active
    /// @param amount Amount of sale tokens to withdraw
    function withdrawSaleTokens(uint256 amount) external onlyOwner {
        if (currentStageIndex < stages.length && stages[currentStageIndex].active) revert SaleActive();
        SALE_TOKEN.safeTransfer(owner(), amount);
        emit Withdrawn(address(SALE_TOKEN), amount);
    }

    // ══════════════════════════════════════════════════════════
    //  PAUSE / RESUME
    // ══════════════════════════════════════════════════════════

    /// @notice Pause all purchases
    function pause() external onlyOwner {
        _pause();
        emit StagePaused();
    }

    /// @notice Resume all purchases
    function unpause() external onlyOwner {
        _unpause();
        emit StageResumed();
    }

    // ══════════════════════════════════════════════════════════
    //  HELPERS
    // ══════════════════════════════════════════════════════════

    /// @notice Total number of configured stages
    function stageCount() external view returns (uint256) {
        return stages.length;
    }

    /// @notice Forward native transfers to buyWithNative()
    receive() external payable {
        this.buyWithNative();
    }
}
