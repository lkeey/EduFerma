type Env = Record<string, string | undefined>;

export type ResolvedClerkEnv = {
  publishableKey?: string;
  secretKey?: string;
  publishableKeySource?: string;
  secretKeySource?: string;
  configured: boolean;
  missingEnv: string[];
};

const canonicalPublishableKey = "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY";
const canonicalSecretKey = "CLERK_SECRET_KEY";
const publishableKeyAliasSuffix = "CLERK_PUBLISHABLE_KEY";

export function resolveClerkEnv(env: Env = process.env): ResolvedClerkEnv {
  const publishableKey = readFirstEnv(env, [canonicalPublishableKey]) ?? readFirstSuffixedEnv(env, {
    requiredPrefix: "NEXT_PUBLIC_",
    suffixes: [publishableKeyAliasSuffix]
  });
  const secretKey = readFirstEnv(env, [canonicalSecretKey]) ?? readFirstSuffixedEnv(env, {
    disallowedPrefix: "NEXT_PUBLIC_",
    suffixes: [canonicalSecretKey]
  });

  const publishableKeyConfigured = Boolean(publishableKey?.value);
  const secretKeyConfigured = Boolean(secretKey?.value);

  return {
    publishableKey: publishableKey?.value,
    secretKey: secretKey?.value,
    publishableKeySource: publishableKey?.label,
    secretKeySource: secretKey?.label,
    configured: publishableKeyConfigured && secretKeyConfigured,
    missingEnv: [
      !publishableKeyConfigured ? canonicalPublishableKey : undefined,
      !secretKeyConfigured ? canonicalSecretKey : undefined
    ].filter((value): value is string => Boolean(value))
  };
}

function readFirstEnv(env: Env, keys: string[]) {
  for (const key of keys) {
    const value = normalizeEnvValue(env[key]);
    if (value) return { label: key, value };
  }

  return undefined;
}

function readFirstSuffixedEnv(
  env: Env,
  options: { suffixes: string[]; requiredPrefix?: string; disallowedPrefix?: string }
) {
  const candidates: Array<{ label: string; value: string }> = [];

  for (const [key, rawValue] of Object.entries(env)) {
    const value = normalizeEnvValue(rawValue);
    if (!value) continue;

    const normalizedKey = key.toUpperCase();
    const requiredPrefix = options.requiredPrefix?.toUpperCase();
    const disallowedPrefix = options.disallowedPrefix?.toUpperCase();

    if (requiredPrefix && !normalizedKey.startsWith(requiredPrefix)) continue;
    if (disallowedPrefix && normalizedKey.startsWith(disallowedPrefix)) continue;

    if (options.suffixes.some((suffix) => normalizedKey.endsWith(`_${suffix}`))) {
      candidates.push({ label: key, value });
    }
  }

  candidates.sort((left, right) => left.label.localeCompare(right.label));
  return candidates[0];
}

function normalizeEnvValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}
