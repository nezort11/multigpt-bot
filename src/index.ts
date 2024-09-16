import http from "serverless-http";

import { bot } from "./bot";

// Only in development
if (require.main === module) {
  bot.launch();

  bot.telegram.getMe().then((botInfo) => {
    console.log(`Started bot server on https://t.me/${botInfo.username}`);
  });
}

export const handler = http(bot.webhookCallback("/webhook"));
