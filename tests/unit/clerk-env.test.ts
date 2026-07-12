import { describe, expect, it } from "vitest";
import { resolveClerkEnv } from "../../apps/web/src/lib/clerk-env";

describe("Clerk env resolver", () => {
  it("prefers canonical Clerk env names", () => {
    const result = resolveClerkEnv({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_canonical",
      NEXT_PUBLIC_edu_ferma_auth_CLERK_PUBLISHABLE_KEY: "pk_alias",
      CLERK_SECRET_KEY: "sk_canonical",
      edu_ferma_auth_CLERK_SECRET_KEY: "sk_alias"
    });

    expect(result).toMatchObject({
      publishableKey: "pk_canonical",
      secretKey: "sk_canonical",
      publishableKeySource: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      secretKeySource: "CLERK_SECRET_KEY",
      configured: true,
      missingEnv: []
    });
  });

  it("reads Vercel marketplace-style Clerk aliases", () => {
    const result = resolveClerkEnv({
      NEXT_PUBLIC_edu_ferma_auth_CLERK_PUBLISHABLE_KEY: "pk_alias",
      edu_ferma_auth_CLERK_SECRET_KEY: "sk_alias"
    });

    expect(result).toMatchObject({
      publishableKey: "pk_alias",
      secretKey: "sk_alias",
      publishableKeySource: "NEXT_PUBLIC_edu_ferma_auth_CLERK_PUBLISHABLE_KEY",
      secretKeySource: "edu_ferma_auth_CLERK_SECRET_KEY",
      configured: true,
      missingEnv: []
    });
  });

  it("does not treat public-prefixed values as server secret keys", () => {
    const result = resolveClerkEnv({
      NEXT_PUBLIC_edu_ferma_auth_CLERK_PUBLISHABLE_KEY: "pk_alias",
      NEXT_PUBLIC_edu_ferma_auth_CLERK_SECRET_KEY: "not_a_server_secret"
    });

    expect(result.configured).toBe(false);
    expect(result.secretKey).toBeUndefined();
    expect(result.missingEnv).toEqual(["CLERK_SECRET_KEY"]);
  });
});
