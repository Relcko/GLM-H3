// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { IAggregatorV3Interface } from "contracts/interfaces/IAggregatorV3Interface.sol";

interface IERC20Decimals {
    function decimals() external view returns (uint8);
}

/// @title BaseDeployScript
/// @notice Shared, auditable helpers for the Relcko deployment framework.
///         Every deployment script inherits this base so that artifact load/save
///         is merge-safe and network-aware, oracle/USDT addresses are resolved
///         from .env only (no hardcoded addresses), and on-chain verification of
///         owner, decimals, Chainlink feed, and stage configuration is identical
///         across all scripts.
contract BaseDeployScript is Script {
    uint256 internal constant ORACLE_STALENESS_THRESHOLD = 7200;
    uint8 internal constant ORACLE_DECIMALS = 8;
    uint8 internal constant USDT_DECIMALS = 18;

    struct Deployment {
        uint256 chainId;
        address rlko;
        address paymentManager;
        address usdt;
        address bnbUsdFeed;
        address deployer;
        address treasury;
        string rlkoName;
        string rlkoSymbol;
        uint8 rlkoDecimals;
        uint256 rlkoSupply;
        uint256 presaleSupply;
        uint256 stageId;
        uint256 stagePrice;
        uint256 stageSupply;
        uint256 stageMin;
        uint256 stageMax;
        uint8 oracleDecimals;
        uint256 timestamp;
        address staking;
        address stakingToken;
    }

    // ── Network helpers ───────────────────────────────────────────────────

    function _networkName() internal view returns (string memory) {
        if (block.chainid == 56) return "BSC Mainnet";
        if (block.chainid == 97) return "BSC Testnet";
        return "Unknown";
    }

    function _artifactFile() internal view returns (string memory) {
        if (block.chainid == 56) return "./deployments/mainnet.json";
        if (block.chainid == 97) return "./deployments/testnet.json";
        return string.concat("./deployments/", vm.toString(block.chainid), ".json");
    }

    // ── .env resolution (everything configurable, no hardcoded addresses) ──

    /// @notice Resolve USDT. Priority: artifact → canonical USDT env → BSC_MAINNET env → BSC_TESTNET env → generic env.
    ///         This is the SINGLE entry point for USDT address resolution used by every script.
    ///         The canonical `USDT` variable is auto-populated by tools/update-testnet-env.mjs
    ///         after MockUSDT is deployed, so it should never be edited by hand on testnet.
    function _resolveUsdt(Deployment memory d) internal view returns (address) {
        if (d.usdt != address(0)) return d.usdt;
        address canonical = _tryEnvAddress("USDT");
        if (canonical != address(0)) return canonical;
        if (block.chainid == 56) {
            address a = _tryEnvAddress("USDT_TOKEN");
            if (a != address(0)) return a;
            return _tryEnvAddress("USDT_TOKEN_MAINNET");
        }
        if (block.chainid == 97) {
            address a = _tryEnvAddress("USDT_TOKEN");
            if (a != address(0)) return a;
            return _tryEnvAddress("USDT_TOKEN_TESTNET");
        }
        return _tryEnvAddress("USDT_TOKEN");
    }

    /// @notice Read an address env var without reverting if the variable is absent.
    function _tryEnvAddress(string memory key) internal view returns (address) {
        try vm.envAddress(key) returns (address val) { return val; } catch { return address(0); }
    }

    /// @notice Resolve the Chainlink BNB/USD feed. Priority: canonical CHAINLINK_FEED →
    ///         legacy BNB_USD_FEED → network-specific BNB_USD_FEED_{TESTNET,MAINNET}.
    function _resolveFeed() internal view returns (address) {
        address canonical = _tryEnvAddress("CHAINLINK_FEED");
        if (canonical == address(0)) canonical = _tryEnvAddress("BNB_USD_FEED");
        if (canonical != address(0)) return canonical;
        if (block.chainid == 56) return vm.envAddress("BNB_USD_FEED_MAINNET");
        if (block.chainid == 97) return vm.envAddress("BNB_USD_FEED_TESTNET");
        return vm.envAddress("BNB_USD_FEED");
    }

    function _treasury() internal view returns (address) {
        return vm.envOr("TREASURY", address(0));
    }

    function _broadcaster() internal view returns (address) {
        if (vm.envOr("DEPLOYER", address(0)) != address(0)) return vm.envAddress("DEPLOYER");
        uint256 pk = vm.envOr("DEPLOYER_PRIVATE_KEY", vm.envOr("DEPLOYER_PK", uint256(0)));
        if (pk != 0) return vm.addr(pk);
        return msg.sender;
    }

    function _expectedOwner() internal view returns (address) {
        address t = _treasury();
        return t != address(0) ? t : _broadcaster();
    }

    // ── On-chain verification helpers ─────────────────────────────────────

    function _hasCode(address a) internal view returns (bool) {
        uint256 cs;
        assembly { cs := extcodesize(a) }
        return cs > 0;
    }

    function _verifyTokenDecimals(address token, uint8 expected) internal view returns (uint8 actual) {
        require(token != address(0), "token address is zero");
        require(_hasCode(token), "token has no code");
        actual = IERC20Decimals(token).decimals();
        require(actual == expected, "token decimals mismatch");
    }

    function _verifyFeed(address feed) internal view returns (uint8 feedDecimals, int256 price) {
        require(feed != address(0), "BNB_USD_FEED is zero");
        require(_hasCode(feed), "BNB_USD_FEED has no code");

        feedDecimals = IAggregatorV3Interface(feed).decimals();
        require(feedDecimals == ORACLE_DECIMALS, "BNB_USD_FEED decimals != 8");

        (, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) =
            IAggregatorV3Interface(feed).latestRoundData();

        require(answer > 0, "BNB_USD_FEED price <= 0");
        if (answeredInRound == 0) console.log("[WARN] feed answeredInRound == 0");
        if (startedAt == 0) console.log("[WARN] feed startedAt == 0");
        if (updatedAt == 0) {
            console.log("[WARN] feed updatedAt == 0 (stale)");
        } else if (block.timestamp - updatedAt > ORACLE_STALENESS_THRESHOLD) {
            console.log("[WARN] feed data older than 2h (stale)");
        }

        price = answer;
    }

    // ── Artifact load/save (merge-safe across sequential script runs) ─────

    function _loadDeployment() internal view returns (Deployment memory d) {
        d.chainId = block.chainid;
        try vm.readFile(_artifactFile()) returns (string memory json) {
            try vm.parseJsonUint(json, ".chainId") returns (uint256 v) { d.chainId = v; } catch {}
            try vm.parseJsonAddress(json, ".rlko") returns (address v) { d.rlko = v; } catch {}
            try vm.parseJsonAddress(json, ".paymentManager") returns (address v) { d.paymentManager = v; } catch {}
            try vm.parseJsonAddress(json, ".usdt") returns (address v) { d.usdt = v; } catch {}
            try vm.parseJsonAddress(json, ".bnbUsdFeed") returns (address v) { d.bnbUsdFeed = v; } catch {}
            try vm.parseJsonAddress(json, ".deployer") returns (address v) { d.deployer = v; } catch {}
            try vm.parseJsonAddress(json, ".treasury") returns (address v) { d.treasury = v; } catch {}
            try vm.parseJsonString(json, ".rlkoName") returns (string memory v) { d.rlkoName = v; } catch {}
            try vm.parseJsonString(json, ".rlkoSymbol") returns (string memory v) { d.rlkoSymbol = v; } catch {}
            try vm.parseJsonUint(json, ".rlkoDecimals") returns (uint256 v) { d.rlkoDecimals = uint8(v); } catch {}
            try vm.parseJsonUint(json, ".rlkoSupply") returns (uint256 v) { d.rlkoSupply = v; } catch {}
            try vm.parseJsonUint(json, ".presaleSupply") returns (uint256 v) { d.presaleSupply = v; } catch {}
            try vm.parseJsonUint(json, ".stageId") returns (uint256 v) { d.stageId = v; } catch {}
            try vm.parseJsonUint(json, ".stagePrice") returns (uint256 v) { d.stagePrice = v; } catch {}
            try vm.parseJsonUint(json, ".stageSupply") returns (uint256 v) { d.stageSupply = v; } catch {}
            try vm.parseJsonUint(json, ".stageMin") returns (uint256 v) { d.stageMin = v; } catch {}
            try vm.parseJsonUint(json, ".stageMax") returns (uint256 v) { d.stageMax = v; } catch {}
            try vm.parseJsonUint(json, ".oracleDecimals") returns (uint256 v) { d.oracleDecimals = uint8(v); } catch {}
            try vm.parseJsonUint(json, ".timestamp") returns (uint256 v) { d.timestamp = v; } catch {}
            try vm.parseJsonAddress(json, ".staking") returns (address v) { d.staking = v; } catch {}
            try vm.parseJsonAddress(json, ".stakingToken") returns (address v) { d.stakingToken = v; } catch {}
        } catch {
            // No artifact yet — start from a clean struct.
        }
    }

    function _saveDeployment(Deployment memory d) internal {
        d.chainId = block.chainid;
        d.timestamp = block.timestamp;

        string memory key = "deployment";
        vm.serializeUint(key, "chainId", d.chainId);
        vm.serializeAddress(key, "rlko", d.rlko);
        vm.serializeAddress(key, "paymentManager", d.paymentManager);
        vm.serializeAddress(key, "usdt", d.usdt);
        vm.serializeAddress(key, "bnbUsdFeed", d.bnbUsdFeed);
        vm.serializeAddress(key, "deployer", d.deployer);
        vm.serializeAddress(key, "treasury", d.treasury);
        vm.serializeString(key, "rlkoName", d.rlkoName);
        vm.serializeString(key, "rlkoSymbol", d.rlkoSymbol);
        vm.serializeUint(key, "rlkoDecimals", d.rlkoDecimals);
        vm.serializeUint(key, "rlkoSupply", d.rlkoSupply);
        vm.serializeUint(key, "presaleSupply", d.presaleSupply);
        vm.serializeUint(key, "stageId", d.stageId);
        vm.serializeUint(key, "stagePrice", d.stagePrice);
        vm.serializeUint(key, "stageSupply", d.stageSupply);
        vm.serializeUint(key, "stageMin", d.stageMin);
        vm.serializeUint(key, "stageMax", d.stageMax);
        vm.serializeUint(key, "oracleDecimals", d.oracleDecimals);
        vm.serializeAddress(key, "staking", d.staking);
        vm.serializeAddress(key, "stakingToken", d.stakingToken);
        string memory json = vm.serializeUint(key, "timestamp", d.timestamp);
        vm.writeJson(json, _artifactFile());
        console.log("Artifact written:");
        console.log(_artifactFile());
    }
}
