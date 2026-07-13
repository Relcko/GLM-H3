export const BETA_VERSION = "RC8";
export const BETA_LABEL = "Closed Testnet Beta";

export const BSC_TESTNET_FAUCETS = [
  { name: "BNB Chain Faucet", url: "https://testnet.bnbchain.org/faucet-smart" },
  { name: "Chainlink Faucet", url: "https://faucets.chain.link/" },
  { name: "BSC Testnet Faucet", url: "https://testnet.binance.org/faucet-smart" },
];

export const EXPLORER_URL = "https://testnet.bscscan.com";

export const BETA_CONTRACT_ADDRESSES = {
  rlko: "0xdE27aCe900FB8ae363eBaEE1f18c725d9a13C674" as const,
  usdt: "0x701B81ea7F71a3c403cb53A6d465c37D96187E7f" as const,
  paymentManager: "0x7226E9d67B93DEd05C0D2595E7a5d9022b1Af106" as const,
  chainlinkFeed: "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526" as const,
};

export const BETA_EXPLORER_LINKS = {
  rlko: `${EXPLORER_URL}/address/${BETA_CONTRACT_ADDRESSES.rlko}`,
  usdt: `${EXPLORER_URL}/address/${BETA_CONTRACT_ADDRESSES.usdt}`,
  paymentManager: `${EXPLORER_URL}/address/${BETA_CONTRACT_ADDRESSES.paymentManager}`,
  chainlinkFeed: `${EXPLORER_URL}/address/${BETA_CONTRACT_ADDRESSES.chainlinkFeed}`,
};

export const BETA_NETWORK = {
  name: "BNB Smart Chain Testnet",
  chainId: 97,
  currency: "tBNB",
  rpcUrl: "https://bsc-testnet-rpc.publicnode.com",
  explorerName: "BSCScan Testnet",
};

export const BETA_LINKS = {
  howToGetTBNB: "https://docs.bnbchain.org/docs/testnet-faucet/",
  howToMintUSDT: `${EXPLORER_URL}/address/${BETA_CONTRACT_ADDRESSES.usdt}#writeContract`,
  github: "https://github.com/anomalyco/relcko",
  reportBug: "https://github.com/anomalyco/relcko/issues/new",
};
