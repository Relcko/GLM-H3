import { describe, it, expect, beforeEach } from "vitest";
import { ApprovalPolicy, KeyStatus } from "../approval-policy";
import type { SignerKey, ApprovalProposal, SignedApproval, ApprovalPolicyDeps } from "../approval-policy";
import type { IHashService } from "../../infrastructure/services/hash-service";
import type { IClock } from "../../infrastructure/services/clock";

function makeHashService(): IHashService {
  return {
    sha256: (input: string) => {
      let hash = 0;
      for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
      }
      return `h:${Math.abs(hash).toString(16)}`;
    },
    verify: (input: string, hash: string) => {
      let h = 0;
      for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        h = ((h << 5) - h) + char;
        h |= 0;
      }
      return hash === `h:${Math.abs(h).toString(16)}`;
    },
  };
}

function makeClock(fixedNow: number = 1_000_000_000_000): IClock {
  return { now: () => new Date(fixedNow), nowMs: () => fixedNow };
}

function makeKey(keyId: string, ownerId: string, status: KeyStatus = KeyStatus.Active): SignerKey {
  return { keyId, ownerId, status, publicKey: `pk:${keyId}`, addedAt: 1_000_000_000_000 };
}

function makeProposal(
  proposalId: string,
  digest: string,
  threshold: number,
  allowedSigners: string[],
  epoch: number = 1,
  expiresAt: number = 2_000_000_000_000,
): ApprovalProposal {
  return { proposalId, digest, threshold, allowedSigners, epoch, expiresAt };
}

function makeSignature(signerKeyId: string, signature: string, signedAt: number = 1_500_000_000_000): SignedApproval {
  return { signerKeyId, signature, signedAt };
}

describe("ApprovalPolicy", () => {
  let hashService: IHashService;
  let clock: IClock;
  let policy: ApprovalPolicy;
  const NOW = 1_500_000_000_000;

  beforeEach(() => {
    hashService = makeHashService();
    clock = makeClock(NOW);
    policy = new ApprovalPolicy({ hashService, clock });
  });

  describe("verifySignature", () => {
    it("validates correct signature", () => {
      const key = makeKey("key-1", "owner-1");
      const digest = policy.computeDigest("proposal-content");
      const expectedSig = hashService.sha256(`sig:approval:${key.keyId}:${digest}`);

      expect(policy.verifySignature(key, digest, expectedSig)).toBe(true);
    });

    it("rejects forged signature", () => {
      const key = makeKey("key-1", "owner-1");
      const digest = policy.computeDigest("proposal-content");
      const forgedSig = "forged-signature";

      expect(policy.verifySignature(key, digest, forgedSig)).toBe(false);
    });

    it("rejects signature from wrong key for same digest", () => {
      const key1 = makeKey("key-1", "owner-1");
      const key2 = makeKey("key-2", "owner-2");
      const digest = policy.computeDigest("proposal-content");
      const sigFromKey2 = hashService.sha256(`sig:approval:${key2.keyId}:${digest}`);

      expect(policy.verifySignature(key1, digest, sigFromKey2)).toBe(false);
    });
  });

  describe("verifyThreshold", () => {
    it("passes when approvals meet threshold", () => {
      const approvals = [makeSignature("key-1", "s1"), makeSignature("key-2", "s2"), makeSignature("key-3", "s3")];
      expect(policy.verifyThreshold(approvals, 3)).toBe(true);
    });

    it("fails when approvals below threshold", () => {
      const approvals = [makeSignature("key-1", "s1")];
      expect(policy.verifyThreshold(approvals, 3)).toBe(false);
    });

    it("passes when threshold is zero", () => {
      expect(policy.verifyThreshold([], 0)).toBe(true);
    });

    it("fails with threshold 0 but negative threshold treated as zero", () => {
      expect(policy.verifyThreshold([], -1)).toBe(true);
    });
  });

  describe("verifySignerUniqueness", () => {
    it("passes with all unique signers", () => {
      const approvals = [makeSignature("key-1", "s1"), makeSignature("key-2", "s2")];
      expect(policy.verifySignerUniqueness(approvals)).toBe(true);
    });

    it("fails with duplicate signer", () => {
      const approvals = [makeSignature("key-1", "s1"), makeSignature("key-1", "s2")];
      expect(policy.verifySignerUniqueness(approvals)).toBe(false);
    });
  });

  describe("verifyKeyStatus", () => {
    it("passes for active key", () => {
      expect(policy.verifyKeyStatus(makeKey("k1", "o1", KeyStatus.Active))).toBe(true);
    });

    it("fails for revoked key", () => {
      expect(policy.verifyKeyStatus(makeKey("k1", "o1", KeyStatus.Revoked))).toBe(false);
    });

    it("fails for compromised key", () => {
      expect(policy.verifyKeyStatus(makeKey("k1", "o1", KeyStatus.Compromised))).toBe(false);
    });
  });

  describe("verifyExpiry", () => {
    it("passes when not expired", () => {
      const proposal = makeProposal("p1", "d1", 1, ["k1"], 1, 2_000_000_000_000);
      expect(policy.verifyExpiry(proposal, NOW)).toBe(true);
    });

    it("fails when expired", () => {
      const proposal = makeProposal("p1", "d1", 1, ["k1"], 1, 1_000_000_000);
      expect(policy.verifyExpiry(proposal, NOW)).toBe(false);
    });
  });

  describe("verifyEpoch", () => {
    it("passes when epoch matches", () => {
      const proposal = makeProposal("p1", "d1", 1, ["k1"], 42, 2_000_000_000_000);
      expect(policy.verifyEpoch(proposal, 42)).toBe(true);
    });

    it("fails when epoch mismatches", () => {
      const proposal = makeProposal("p1", "d1", 1, ["k1"], 1, 2_000_000_000_000);
      expect(policy.verifyEpoch(proposal, 99)).toBe(false);
    });
  });

  describe("verifySignerAllowed", () => {
    it("passes when signer is in allowed list", () => {
      const proposal = makeProposal("p1", "d1", 1, ["k1", "k2"]);
      expect(policy.verifySignerAllowed(proposal, "k1")).toBe(true);
    });

    it("fails when signer is not in allowed list", () => {
      const proposal = makeProposal("p1", "d1", 1, ["k1", "k2"]);
      expect(policy.verifySignerAllowed(proposal, "k3")).toBe(false);
    });
  });

  describe("isDuplicateSignature", () => {
    it("detects same signer key", () => {
      const existing = [makeSignature("key-1", "sig-1")];
      const duplicate = makeSignature("key-1", "sig-2");
      expect(policy.isDuplicateSignature(existing, duplicate)).toBe(true);
    });

    it("detects same signature value", () => {
      const existing = [makeSignature("key-1", "sig-1")];
      const duplicate = makeSignature("key-2", "sig-1");
      expect(policy.isDuplicateSignature(existing, duplicate)).toBe(true);
    });

    it("passes for unique signer and signature", () => {
      const existing = [makeSignature("key-1", "sig-1")];
      const fresh = makeSignature("key-2", "sig-2");
      expect(policy.isDuplicateSignature(existing, fresh)).toBe(false);
    });
  });

  describe("verifyProposalDigest", () => {
    it("passes when digest matches", () => {
      const content = "proposal-content";
      const digest = policy.computeDigest(content);
      const proposal = makeProposal("p1", digest, 1, ["k1"]);
      expect(policy.verifyProposalDigest(proposal, digest)).toBe(true);
    });

    it("fails when digest mismatches (wrong proposal hash)", () => {
      const content = "proposal-content";
      const digest = policy.computeDigest(content);
      const wrongDigest = policy.computeDigest("tampered-content");
      const proposal = makeProposal("p1", wrongDigest, 1, ["k1"]);
      expect(policy.verifyProposalDigest(proposal, digest)).toBe(false);
    });
  });

  describe("verifyAll (integration)", () => {
    it("passes with valid signers meeting threshold", () => {
      const content = "distribute 100k";
      const digest = policy.computeDigest(content);
      const keys = [makeKey("k1", "o1"), makeKey("k2", "o2"), makeKey("k3", "o3")];
      const proposal = makeProposal("p1", digest, 2, ["k1", "k2", "k3"]);

      const sig1 = hashService.sha256(`sig:approval:k1:${digest}`);
      const sig2 = hashService.sha256(`sig:approval:k2:${digest}`);

      const approvals = [makeSignature("k1", sig1), makeSignature("k2", sig2)];

      const result = policy.verifyAll(proposal, approvals, keys, 1, NOW);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("rejects expired approval", () => {
      const digest = policy.computeDigest("expired");
      const proposal = makeProposal("p1", digest, 1, ["k1"], 1, 1_000_000_000);
      const keys = [makeKey("k1", "o1")];
      const sig1 = hashService.sha256(`sig:approval:k1:${digest}`);
      const approvals = [makeSignature("k1", sig1)];

      const result = policy.verifyAll(proposal, approvals, keys, 1, NOW);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("expired");
    });

    it("rejects wrong threshold", () => {
      const digest = policy.computeDigest("threshold-test");
      const proposal = makeProposal("p1", digest, 3, ["k1", "k2", "k3"]);
      const keys = [makeKey("k1", "o1"), makeKey("k2", "o2")];
      const sig1 = hashService.sha256(`sig:approval:k1:${digest}`);
      const sig2 = hashService.sha256(`sig:approval:k2:${digest}`);
      const approvals = [makeSignature("k1", sig1), makeSignature("k2", sig2)];

      const result = policy.verifyAll(proposal, approvals, keys, 1, NOW);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Threshold"))).toBe(true);
    });

    it("rejects wrong epoch", () => {
      const digest = policy.computeDigest("epoch-test");
      const proposal = makeProposal("p1", digest, 1, ["k1"], 5, 2_000_000_000_000);
      const keys = [makeKey("k1", "o1")];
      const sig1 = hashService.sha256(`sig:approval:k1:${digest}`);
      const approvals = [makeSignature("k1", sig1)];

      const result = policy.verifyAll(proposal, approvals, keys, 1, NOW);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("epoch"))).toBe(true);
    });

    it("rejects duplicate signer", () => {
      const digest = policy.computeDigest("dup-signer");
      const proposal = makeProposal("p1", digest, 2, ["k1", "k2"]);
      const keys = [makeKey("k1", "o1"), makeKey("k2", "o2")];
      const sig1 = hashService.sha256(`sig:approval:k1:${digest}`);
      const approvals = [makeSignature("k1", sig1), makeSignature("k1", sig1)];

      const result = policy.verifyAll(proposal, approvals, keys, 1, NOW);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Duplicate signer"))).toBe(true);
    });

    it("rejects forged signature", () => {
      const digest = policy.computeDigest("forged");
      const proposal = makeProposal("p1", digest, 1, ["k1"]);
      const keys = [makeKey("k1", "o1")];
      const approvals = [makeSignature("k1", "forged-sig")];

      const result = policy.verifyAll(proposal, approvals, keys, 1, NOW);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Invalid signature"))).toBe(true);
    });

    it("rejects invalid signer (key not in registry)", () => {
      const digest = policy.computeDigest("unknown-key");
      const proposal = makeProposal("p1", digest, 1, ["unknown-key"]);
      const keys = [makeKey("k1", "o1")];
      const approvals = [makeSignature("unknown-key", "sig")];

      const result = policy.verifyAll(proposal, approvals, keys, 1, NOW);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("not found in key registry"))).toBe(true);
    });

    it("rejects revoked key", () => {
      const digest = policy.computeDigest("revoked-key");
      const proposal = makeProposal("p1", digest, 1, ["k1"]);
      const keys = [makeKey("k1", "o1", KeyStatus.Revoked)];
      const sig1 = hashService.sha256(`sig:approval:k1:${digest}`);
      const approvals = [makeSignature("k1", sig1)];

      const result = policy.verifyAll(proposal, approvals, keys, 1, NOW);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("revoked"))).toBe(true);
    });

    it("rejects signer not in allowed list", () => {
      const digest = policy.computeDigest("not-allowed");
      const proposal = makeProposal("p1", digest, 1, ["k2"]);
      const keys = [makeKey("k1", "o1")];
      const sig1 = hashService.sha256(`sig:approval:k1:${digest}`);
      const approvals = [makeSignature("k1", sig1)];

      const result = policy.verifyAll(proposal, approvals, keys, 1, NOW);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("not in the allowed signers list"))).toBe(true);
    });
  });
});
