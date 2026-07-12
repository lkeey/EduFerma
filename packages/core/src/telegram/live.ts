export type TelegramWebhookUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export type TelegramWebhookChat = {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

export type TelegramWebhookMessage = {
  message_id: number;
  from?: TelegramWebhookUser;
  chat: TelegramWebhookChat;
  date?: number;
  text?: string;
};

export type TelegramWebhookUpdate = {
  update_id: number;
  message?: TelegramWebhookMessage;
};

export type TelegramCommandName = "start" | "stop" | "about" | "info" | "unknown";

export type TelegramCommand = {
  name: TelegramCommandName;
  rawText: string;
  args: string;
};

export type TelegramSubscriberCommandInput = {
  telegramUserId: string;
  chatId: string;
  chatType: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
};

export function readTelegramCommand(text: string | undefined): TelegramCommand | undefined {
  const rawText = text?.trim();
  if (!rawText?.startsWith("/")) return undefined;

  const [rawCommand = "", ...args] = rawText.split(/\s+/);
  const command = rawCommand.replace(/^\/+/, "").split("@")[0]?.toLowerCase();

  if (command === "start" || command === "stop" || command === "about" || command === "info") {
    return { name: command, rawText, args: args.join(" ") };
  }

  return { name: "unknown", rawText, args: args.join(" ") };
}

export function subscriberFromTelegramMessage(
  message: TelegramWebhookMessage
): TelegramSubscriberCommandInput | undefined {
  if (!message.from || message.from.is_bot) return undefined;

  return {
    telegramUserId: String(message.from.id),
    chatId: String(message.chat.id),
    chatType: message.chat.type,
    username: message.from.username,
    firstName: message.from.first_name,
    lastName: message.from.last_name,
    languageCode: message.from.language_code
  };
}

export function createTelegramStartReply(appUrl?: string): string {
  const lines = [
    "Привет! Это EduFerma.",
    "",
    "Теперь бот сможет присылать новые публичные материалы и объявления по подготовке к информатике.",
    "Для заданий, планов и личного кабинета используй сайт EduFerma.",
    appUrl ? "" : undefined,
    appUrl ? `Сайт: ${appUrl}` : undefined,
    "Telegram преподавателя: https://t.me/lkeyit"
  ].filter((line): line is string => line !== undefined);

  return lines.join("\n");
}

export function createTelegramAboutReply(appUrl?: string): string {
  const lines = [
    "EduFerma — подготовка с преподавателем по информатике.",
    "",
    "Внутри: персональные планы, база задач, домашние задания и личный кабинет для занятий.",
    "Бот — одна из точек входа: здесь можно получать публичные обновления и перейти на сайт.",
    appUrl ? "" : undefined,
    appUrl ? `Сайт: ${appUrl}` : undefined,
    "Telegram: https://t.me/lkeyit"
  ].filter((line): line is string => line !== undefined);

  return lines.join("\n");
}

export function createTelegramStopReply(appUrl?: string): string {
  const lines = [
    "Готово, я больше не буду присылать публичные обновления EduFerma в этот чат.",
    "",
    "Чтобы подписаться снова, отправь /start.",
    appUrl ? `Сайт EduFerma: ${appUrl}` : undefined,
    "Telegram преподавателя: https://t.me/lkeyit"
  ].filter((line): line is string => line !== undefined);

  return lines.join("\n");
}

export function createTelegramUnknownCommandReply(appUrl?: string): string {
  const lines = [
    "Я понимаю команды /start, /stop, /about и /info.",
    appUrl ? `Сайт EduFerma: ${appUrl}` : undefined,
    "Telegram преподавателя: https://t.me/lkeyit"
  ].filter((line): line is string => line !== undefined);

  return lines.join("\n");
}
