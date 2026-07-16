import { hasRuntimeDatabaseEnv } from "@eduferma/db";
import { resolveClerkEnv } from "@/lib/clerk-env";

export type AuthSetupStatus = {
  clerk: {
    configured: boolean;
    publishableKeyConfigured: boolean;
    secretKeyConfigured: boolean;
    missingEnv: string[];
  };
  database: {
    configured: boolean;
  };
  ownerEmailConfigured: boolean;
  integrations: {
    privateBlobConfigured: boolean;
    telegramPublisherConfigured: boolean;
    telegramOwnerChatConfigured: boolean;
    telegramAllowedChatsConfigured: boolean;
    publicationCronConfigured: boolean;
    vkConfigured: boolean;
  };
};

export function getAuthSetupStatus(env: NodeJS.ProcessEnv = process.env): AuthSetupStatus {
  const clerkEnv = resolveClerkEnv(env);

  return {
    clerk: {
      configured: clerkEnv.configured,
      publishableKeyConfigured: Boolean(clerkEnv.publishableKey),
      secretKeyConfigured: Boolean(clerkEnv.secretKey),
      missingEnv: clerkEnv.missingEnv
    },
    database: {
      configured: hasRuntimeDatabaseEnv(env)
    },
    ownerEmailConfigured: Boolean(env.OWNER_EMAIL),
    integrations: {
      privateBlobConfigured: Boolean(env.BLOB_READ_WRITE_TOKEN?.trim()),
      telegramPublisherConfigured: Boolean(env.TELEGRAM_BOT_TOKEN?.trim()),
      telegramOwnerChatConfigured: Boolean(env.TELEGRAM_OWNER_CHAT_ID?.trim()),
      telegramAllowedChatsConfigured: Boolean(env.TELEGRAM_ALLOWED_CHAT_IDS?.trim()),
      publicationCronConfigured: Boolean(env.CRON_SECRET?.trim()),
      vkConfigured: Boolean(
        env.VK_ACCESS_TOKEN?.trim() && env.VK_GROUP_ID?.trim()
      )
    }
  };
}
