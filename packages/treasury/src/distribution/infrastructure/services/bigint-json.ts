export function bigintReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return { __bigint: value.toString() };
  return value;
}

export function bigintReviver(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === "object" && "__bigint" in (value as Record<string, unknown>)) {
    return BigInt((value as Record<string, string>).__bigint);
  }
  return value;
}

export function parseWithBigint(text: string): unknown {
  return JSON.parse(text, bigintReviver);
}
