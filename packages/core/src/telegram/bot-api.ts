export type TelegramTextSendInput = {
  chatId: string;
  text: string;
  disableWebPagePreview?: boolean;
};

export type TelegramTextSendResult = {
  status: "sent" | "failed";
  sendAttempted: true;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
};

export type TelegramTextSender = {
  sendText(input: TelegramTextSendInput): Promise<TelegramTextSendResult>;
};

type FetchLike = typeof fetch;

export function createTelegramBotApiTextSender(botToken: string, fetchImpl: FetchLike = fetch): TelegramTextSender {
  return {
    async sendText(input: TelegramTextSendInput): Promise<TelegramTextSendResult> {
      let response: Response;
      try {
        response = await fetchImpl(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chat_id: input.chatId,
            text: input.text,
            disable_web_page_preview: input.disableWebPagePreview ?? true
          })
        });
      } catch {
        return {
          status: "failed",
          sendAttempted: true,
          errorCode: "NETWORK_ERROR",
          errorMessage: "Telegram Bot API request failed before a response was received."
        };
      }

      const payload = await safeJson(response);
      if (!response.ok || !isTelegramOk(payload)) {
        return {
          status: "failed",
          sendAttempted: true,
          errorCode: String(response.status),
          errorMessage: telegramErrorMessage(payload) ?? "Telegram Bot API request failed."
        };
      }

      return {
        status: "sent",
        sendAttempted: true,
        providerMessageId: telegramMessageId(payload)
      };
    }
  };
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function isTelegramOk(payload: unknown): payload is { ok: true; result?: unknown } {
  return Boolean(payload && typeof payload === "object" && "ok" in payload && payload.ok === true);
}

function telegramMessageId(payload: { ok: true; result?: unknown }) {
  const result = payload.result;
  if (!result || typeof result !== "object" || !("message_id" in result)) return undefined;
  return String(result.message_id);
}

function telegramErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("description" in payload)) return undefined;
  const description = payload.description;
  return typeof description === "string" ? description : undefined;
}
