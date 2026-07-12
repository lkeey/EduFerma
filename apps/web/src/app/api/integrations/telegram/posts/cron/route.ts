import { handleTelegramPostCron } from "@/server/telegram/post-cron";

export async function GET(request: Request) {
  return handleTelegramPostCron(request);
}

export async function POST(request: Request) {
  return handleTelegramPostCron(request);
}
