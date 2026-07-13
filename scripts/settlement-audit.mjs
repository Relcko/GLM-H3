import { createPublicClient, http, parseAbiItem, formatUnits, getAddress, toHex } from "viem";
import { bscTestnet } from "viem/chains";

const RPC = "https://bsc-testnet-rpc.publicnode.com";
const TX = "0xe3245da84fe9b46bbd24256c2b0c60d29a5cd67caa2195c8e6f93508a38abdfe";
const RLKO = "0xdE27aCe900FB8ae363eBaEE1f18c725d9a13C674";
const PAYMENT_MGR = "0x7226E9d67B93DEd05C0D2595E7a5d9022b1Af106";

const client = createPublicClient({ chain: bscTestnet, transport: http(RPC) });

async function main() {
  console.log("=== FETCHING TRANSACTION ===");
  const tx = await client.getTransaction({ hash: TX });
  console.log("From:", tx.from);
  console.log("To:", tx.to);
  console.log("Value (wei):", tx.value.toString());
  console.log("Value (BNB):", formatUnits(tx.value, 18));
  console.log("Gas Price (gwei):", formatUnits(tx.gasPrice ?? 0n, 9));
  console.log("Input (first 10 bytes):", tx.input.substring(0, 22) + "...");

  const selector = tx.input.substring(0, 10);
  console.log("\nFunction selector:", selector);
  const known = {
    "0xd0b7b2e0": "buyWithNative()",
    "0xc792287f": "buyWithToken(address,uint256)",
  };
  if (known[selector]) {
    console.log("  =>", known[selector]);
  } else {
    console.log("  => UNKNOWN");
  }

  console.log("\n=== FETCHING RECEIPT ===");
  const receipt = await client.getTransactionReceipt({ hash: TX });
  console.log("Status:", receipt.status === "success" ? "SUCCESS" : "FAILED");
  console.log("Block:", receipt.blockNumber);
  console.log("Gas Used:", receipt.gasUsed.toString());
  console.log("Log count:", receipt.logs.length);

  // Standard event signatures
  const TRANSFER_SIG = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"; // Transfer(address,address,uint256)

  console.log("\n=== DECODING EVENTS ===");
  let buyer = null;
  let rlkoTransferred = null;

  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];
    console.log(`\n--- Log ${i} ---`);
    console.log("Contract:", log.address);
    console.log("Topics:", JSON.stringify(log.topics));
    console.log("Data (hex):", log.data);

    if (log.topics[0] === TRANSFER_SIG) {
      const from = getAddress("0x" + log.topics[1].slice(26));
      const to = getAddress("0x" + log.topics[2].slice(26));
      const value = BigInt(log.data);
      const isMint = from === "0x0000000000000000000000000000000000000000";
      const isBurn = to === "0x0000000000000000000000000000000000000000";
      console.log("TYPE: ERC20 Transfer");
      console.log("  from:", from, isMint ? "(MINT)" : "");
      console.log("  to:", to, isBurn ? "(BURN)" : "");
      console.log("  value (wei):", value.toString());
      console.log("  value (RLKO):", formatUnits(value, 18));

      if (log.address.toLowerCase() === RLKO.toLowerCase()) {
        rlkoTransferred = { from, to, value, isMint, isBurn };
        if (isMint) {
          buyer = to;
          console.log("  *** RLKO TOKEN TRANSFER DETECTED (MINT) ***");
        }
      }
    } else {
      console.log("TYPE: Non-Transfer event");
      // Try to decode as a PaymentReceived-like event: topic[0] = event sig, topic[1] = buyer, topic[2] = paymentToken
      // Data = paymentAmount + tokenAmount packed
      if (log.topics.length >= 2) {
        try {
          const eventBuyer = getAddress("0x" + log.topics[1].slice(26));
          console.log("  topic[1] (indexed param 1):", eventBuyer);
          if (!buyer) buyer = eventBuyer;
        } catch (e) {
          console.log("  topic[1] not an address");
        }
      }
      if (log.topics.length >= 3) {
        try {
          const eventToken = getAddress("0x" + log.topics[2].slice(26));
          console.log("  topic[2] (indexed param 2):", eventToken);
        } catch (e) {
          console.log("  topic[2] not an address");
        }
      }
      if (log.data && log.data !== "0x") {
        const dataHex = log.data.replace("0x", "");
        if (dataHex.length >= 64) {
          const val1 = BigInt("0x" + dataHex.substring(0, 64));
          console.log("  data[0..31] (uint256):", val1.toString(), formatUnits(val1, 18));
          if (dataHex.length >= 128) {
            const val2 = BigInt("0x" + dataHex.substring(64, 128));
            console.log("  data[32..63] (uint256):", val2.toString(), formatUnits(val2, 18));
          }
        }
      }
    }
  }

  // Buyer fallback: use tx.from
  if (!buyer) {
    buyer = tx.from;
    console.log("\nBuyer (fallback to tx.from):", buyer);
  } else {
    console.log("\nIdentified buyer:", buyer);
  }

  console.log(`\n=== VERIFY RLKO TRANSFER ===`);
  if (rlkoTransferred) {
    console.log("RLKO Transfer found:", rlkoTransferred.isMint ? "YES (minted)" : "YES (transferred)");
    console.log("  Amount:", formatUnits(rlkoTransferred.value, 18), "RLKO");
    console.log("  To:", rlkoTransferred.to);
  } else {
    console.log("NO RLKO TRANSFER EVENT FOUND");
  }

  console.log(`\n=== CALLING balanceOf("${buyer}") ON RLKO CONTRACT ===`);
  try {
    const bal = await client.readContract({
      address: RLKO,
      abi: [{
        type: "function", name: "balanceOf", stateMutability: "view",
        inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }],
      }],
      functionName: "balanceOf",
      args: [buyer],
    });
    console.log("balanceOf (wei):", bal.toString());
    console.log("balanceOf (RLKO):", formatUnits(bal, 18));
  } catch (e) {
    console.log("balanceOf failed:", e.message);
  }

  console.log(`\n=== CALLING userInvestment("${buyer}") ON PAYMENT MANAGER ===`);
  try {
    const inv = await client.readContract({
      address: PAYMENT_MGR,
      abi: [{
        type: "function", name: "userInvestment", stateMutability: "view",
        inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }],
      }],
      functionName: "userInvestment",
      args: [buyer],
    });
    console.log("userInvestment (wei):", inv.toString());
    console.log("userInvestment (USDT):", formatUnits(inv, 18));
  } catch (e) {
    console.log("userInvestment failed:", e.message);
  }

  console.log(`\n=== RLKO CONTRACT METADATA ===`);
  try {
    const symbol = await client.readContract({
      address: RLKO,
      abi: [{ type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] }],
      functionName: "symbol",
    });
    console.log("Symbol:", symbol);
  } catch (e) { console.log("symbol failed:", e.message); }

  try {
    const decimals = await client.readContract({
      address: RLKO,
      abi: [{ type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] }],
      functionName: "decimals",
    });
    console.log("Decimals:", decimals);
  } catch (e) { console.log("decimals failed:", e.message); }

  try {
    const totalSupply = await client.readContract({
      address: RLKO,
      abi: [{ type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }],
      functionName: "totalSupply",
    });
    console.log("Total Supply (wei):", totalSupply.toString());
    console.log("Total Supply (RLKO):", formatUnits(totalSupply, 18));
  } catch (e) { console.log("totalSupply failed:", e.message); }
}

main().catch(console.error);
