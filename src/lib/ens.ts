import { createPublicClient, http } from "viem";
import { normalize } from "viem/ens";
import { mainnet } from "viem/chains";

export type EnsProfile = {
  address: string;
  avatar: string | null;
  description: string | null;
  url: string | null;
  twitter: string | null;
  github: string | null;
  discord: string | null;
  telegram: string | null;
  email: string | null;
} | null;

const FALLBACK_RPC = "https://ethereum-rpc.publicnode.com";

const client = createPublicClient({
  chain: mainnet,
  transport: http(process.env.ALCHEMY_RPC_URL || FALLBACK_RPC),
});

const TEXT_RECORD_KEYS = [
  "avatar",
  "description",
  "url",
  "com.twitter",
  "com.github",
  "com.discord",
  "org.telegram",
  "email",
] as const;

export async function resolveEns(name: string): Promise<EnsProfile> {
  const normalizedName = normalize(name);

  const address = await client.getEnsAddress({ name: normalizedName });
  if (!address) return null;

  const textResults = await Promise.allSettled(
    TEXT_RECORD_KEYS.map((key) =>
      client.getEnsText({ name: normalizedName, key })
    )
  );

  const getText = (index: number): string | null => {
    const result = textResults[index];
    if (result.status === "fulfilled" && result.value) {
      return result.value;
    }
    return null;
  };

  return {
    address,
    avatar: getText(0),
    description: getText(1),
    url: getText(2),
    twitter: getText(3),
    github: getText(4),
    discord: getText(5),
    telegram: getText(6),
    email: getText(7),
  };
}

// resolveEns('vitalik.eth').then(console.log)
