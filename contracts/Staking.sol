// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Staking {
    using SafeERC20 for IERC20;

    IERC20 public _token;
    uint256 public _withdrawPenalty;

    uint256[] public _plans;
    uint256[] public _returns;

    struct StakeInfo {
        address user;
        uint256 amount;
        uint256 totalReturn;
        uint256 planDays;
        uint256 planReturn;
        uint256 stakedOn;
        uint256 maturesOn;
        bool claimed;
        bool emergencyWithdraw;
    }

    mapping(address => StakeInfo[]) private _stakes;

    event Staked(address indexed user, uint256 amount, uint256 planDays, uint256 maturesOn);
    event Claimed(address indexed user, uint256 amount);
    event EmergencyWithdrawn(address indexed user, uint256 amount, uint256 penalty);

    constructor(
        address token_,
        uint256 withdrawPenalty_,
        uint256[] memory planDays_,
        uint256[] memory planReturns_
    ) {
        require(token_ != address(0), "zero token");
        require(planDays_.length == planReturns_.length, "plans length mismatch");
        require(planDays_.length > 0, "no plans");

        _token = IERC20(token_);
        _withdrawPenalty = withdrawPenalty_;

        for (uint256 i = 0; i < planDays_.length; i++) {
            _plans.push(planDays_[i]);
            _returns.push(planReturns_[i]);
        }
    }

    function stake(uint256 amount, uint256 planIndex) external {
        require(amount > 0, "amount zero");
        require(planIndex < _plans.length, "invalid plan");

        uint256 planDays = _plans[planIndex];
        uint256 planReturn = _returns[planIndex];
        uint256 totalReturn = amount + (amount * planReturn) / 10000;

        _token.safeTransferFrom(msg.sender, address(this), amount);

        _stakes[msg.sender].push(StakeInfo({
            user: msg.sender,
            amount: amount,
            totalReturn: totalReturn,
            planDays: planDays,
            planReturn: planReturn,
            stakedOn: block.timestamp,
            maturesOn: block.timestamp + planDays * 1 days,
            claimed: false,
            emergencyWithdraw: false
        }));

        emit Staked(msg.sender, amount, planDays, block.timestamp + planDays * 1 days);
    }

    function claim(uint256 index) external {
        require(index < _stakes[msg.sender].length, "invalid index");
        StakeInfo storage s = _stakes[msg.sender][index];
        require(!s.claimed, "already claimed");
        require(!s.emergencyWithdraw, "emergency withdrawn");
        require(block.timestamp >= s.maturesOn, "not matured");

        s.claimed = true;
        _token.safeTransfer(msg.sender, s.totalReturn);

        emit Claimed(msg.sender, s.totalReturn);
    }

    function emergencyWithdraw(uint256 index) external {
        require(index < _stakes[msg.sender].length, "invalid index");
        StakeInfo storage s = _stakes[msg.sender][index];
        require(!s.claimed, "already claimed");
        require(!s.emergencyWithdraw, "already emergency withdrawn");

        s.emergencyWithdraw = true;
        uint256 penalty = (s.amount * _withdrawPenalty) / 10000;
        uint256 returnAmount = s.amount - penalty;
        _token.safeTransfer(msg.sender, returnAmount);

        emit EmergencyWithdrawn(msg.sender, returnAmount, penalty);
    }

    function getAllPlans() external view returns (uint256[] memory durations, uint256[] memory returns_) {
        return (_plans, _returns);
    }

    function getStakesOfUser(address user) external view returns (StakeInfo[] memory) {
        return _stakes[user];
    }

    function stakes(address user, uint256 index) external view returns (StakeInfo memory) {
        require(index < _stakes[user].length, "invalid index");
        return _stakes[user][index];
    }

    function tokenBalanceOf() external view returns (uint256) {
        return _token.balanceOf(address(this));
    }
}
