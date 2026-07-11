import { handleTelegramWebhook } from "@/server/telegram/webhook";

export async function POST(request: Request) {
  return handleTelegramWebhook(request);
}
