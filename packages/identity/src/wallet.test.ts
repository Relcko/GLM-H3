import { describe, it, expect } from "vitest";
import { createTestIdentity, TEST_ADDRESS, TEST_CHAIN } from "./testkit";
import { WalletProviderKind } from "./types";
import { AuthenticationError, WalletError } from "./errors";

describe("WalletService", () => {
  it("issues a nonce-bound challenge", async () => {
    const t = createTestIdentity();
    const c = await t.wallet.challenge(TEST_ADDRESS, TEST_CHAIN, WalletProviderKind.MetaMask);
    expect(c.nonce).toHaveLength(64);
    expect(c.message).toContain(c.nonce);
    expect(c.message).toContain(TEST_ADDRESS.toLowerCase());
  });

  it("links a verified wallet and sets it primary", async () => {
    const t = createTestIdentity();
    const account = await t.identity.registerIndividual();
    const c = await t.wallet.challenge(TEST_ADDRESS, TEST_CHAIN, WalletProviderKind.MetaMask);
    const linked = await t.wallet.link(account.id, {
      address: TEST_ADDRESS,
      chainId: TEST_CHAIN,
      provider: WalletProviderKind.MetaMask,
      message: c.message,
      nonce: c.nonce,
      signature: t.signer.sign(c.message),
      publicKey: t.signer.publicKey,
    });
    expect(linked.walletIds).toHaveLength(1);
    expect(linked.primaryWalletId).toBe(linked.walletIds[0]);
    expect(t.bus.publishedOfType("identity.wallet.linked")).toHaveLength(1);
  });

  it("is idempotent for the same account", async () => {
    const t = createTestIdentity();
    const account = await t.identity.registerIndividual();
    const c1 = await t.wallet.challenge(TEST_ADDRESS, TEST_CHAIN, WalletProviderKind.MetaMask);
    await t.wallet.link(account.id, {
      address: TEST_ADDRESS,
      chainId: TEST_CHAIN,
      provider: WalletProviderKind.MetaMask,
      message: c1.message,
      nonce: c1.nonce,
      signature: t.signer.sign(c1.message),
      publicKey: t.signer.publicKey,
    });
    const c2 = await t.wallet.challenge(TEST_ADDRESS, TEST_CHAIN, WalletProviderKind.MetaMask);
    const again = await t.wallet.link(account.id, {
      address: TEST_ADDRESS,
      chainId: TEST_CHAIN,
      provider: WalletProviderKind.MetaMask,
      message: c2.message,
      nonce: c2.nonce,
      signature: t.signer.sign(c2.message),
      publicKey: t.signer.publicKey,
    });
    expect(again.walletIds).toHaveLength(1);
  });

  it("rejects a replayed nonce (replay protection)", async () => {
    const t = createTestIdentity();
    const account = await t.identity.registerIndividual();
    const c = await t.wallet.challenge(TEST_ADDRESS, TEST_CHAIN, WalletProviderKind.MetaMask);
    await t.wallet.link(account.id, {
      address: TEST_ADDRESS,
      chainId: TEST_CHAIN,
      provider: WalletProviderKind.MetaMask,
      message: c.message,
      nonce: c.nonce,
      signature: t.signer.sign(c.message),
      publicKey: t.signer.publicKey,
    });
    // Reuse the same (now-consumed) nonce.
    await expect(
      t.wallet.link(account.id, {
        address: TEST_ADDRESS,
        chainId: TEST_CHAIN,
        provider: WalletProviderKind.MetaMask,
        message: c.message,
        nonce: c.nonce,
        signature: t.signer.sign(c.message),
        publicKey: t.signer.publicKey,
      }),
    ).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("rejects an invalid signature", async () => {
    const t = createTestIdentity();
    const account = await t.identity.registerIndividual();
    const c = await t.wallet.challenge(TEST_ADDRESS, TEST_CHAIN, WalletProviderKind.MetaMask);
    await expect(
      t.wallet.link(account.id, {
        address: TEST_ADDRESS,
        chainId: TEST_CHAIN,
        provider: WalletProviderKind.MetaMask,
        message: c.message,
        nonce: c.nonce,
        signature: "deadbeef",
        publicKey: t.signer.publicKey,
      }),
    ).rejects.toBeInstanceOf(WalletError);
  });

  it("unlinks a wallet but blocks removing the last credential", async () => {
    const t = createTestIdentity();
    const account = await t.identity.registerIndividual();
    const c = await t.wallet.challenge(TEST_ADDRESS, TEST_CHAIN, WalletProviderKind.MetaMask);
    const linked = await t.wallet.link(account.id, {
      address: TEST_ADDRESS,
      chainId: TEST_CHAIN,
      provider: WalletProviderKind.MetaMask,
      message: c.message,
      nonce: c.nonce,
      signature: t.signer.sign(c.message),
      publicKey: t.signer.publicKey,
    });
    const walletId = linked.walletIds[0];
    await expect(t.wallet.unlink(account.id, walletId)).rejects.toBeInstanceOf(Error);
    // Add an email credential, then unlink is allowed.
    await t.identity.setEmailCredential(account.id, "u@example.com", "hash");
    const after = await t.wallet.unlink(account.id, walletId);
    expect(after.walletIds).toHaveLength(0);
    expect(t.bus.publishedOfType("identity.wallet.removed")).toHaveLength(1);
  });

  it("sets a primary wallet", async () => {
    const t = createTestIdentity();
    const account = await t.identity.registerIndividual();
    const c = await t.wallet.challenge(TEST_ADDRESS, TEST_CHAIN, WalletProviderKind.MetaMask);
    const linked = await t.wallet.link(account.id, {
      address: TEST_ADDRESS,
      chainId: TEST_CHAIN,
      provider: WalletProviderKind.MetaMask,
      message: c.message,
      nonce: c.nonce,
      signature: t.signer.sign(c.message),
      publicKey: t.signer.publicKey,
    });
    const updated = await t.wallet.setPrimary(account.id, linked.walletIds[0]);
    expect(updated.primaryWalletId).toBe(linked.walletIds[0]);
  });
});
