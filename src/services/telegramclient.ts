import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { API_ID, APP_HASH, SESSION } from "../env";

const session = new StringSession(SESSION);
export const telegramClient = new TelegramClient(session, +API_ID, APP_HASH, {
  connectionRetries: 5,
});

export const getClient = async () => {
  if (!(await telegramClient.isUserAuthorized())) {
    await telegramClient.start({
      phoneNumber: async () => "",
      password: async () => "",
      phoneCode: async () => "",
      onError: (error) => console.error(error),
    });
  }

  return telegramClient;
};
