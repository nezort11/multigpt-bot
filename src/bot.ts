import { Telegraf, Context, Composer, Markup } from "telegraf";
import { message } from "telegraf/filters";
import cls from "cloud-local-storage";
import { BOT_TOKEN } from "./env";
import { getClient } from "./services/telegramclient";
import { NewMessage } from "telegram/events";
import { generateRandomId, getChatId } from "./utils";

export const bot = new Telegraf(BOT_TOKEN, {
  handlerTimeout: 5 * 60 * 1000,
});

bot.use(Composer.drop((context) => context.chat?.type !== "private"));

bot.start(async (context) => {
  await context.reply(
    "👋 Привет. Я MultiGPT bot, я GPT состоящий из множества других GPT. Напиши мне любой запрос"
  );
});

bot.command("chatid", async (context) => {
  await context.reply(`This chat id: ${context.chat.id}`);
});

// NOTE: not working in serverless environment (Yandex Cloud Functions)
// bot.use(async (context, next) => {
//   //   let typingInterval: ReturnType<typeof setInterval> | undefined = undefined;
//   //   try {
//   //     await context.sendChatAction("typing");
//   //     typingInterval = setInterval(async () => {
//   //       try {
//   await context.sendChatAction("typing");
//   //       } catch (error) {
//   //         clearInterval(typingInterval);
//   //       }
//   //     }, moment.duration(5, "seconds").asMilliseconds());

//   return await next();
//   //   } finally {
//   //     clearInterval(typingInterval);
//   //     // no way to clear chat action, wait 5s
//   //   }
// });

const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const STORAGE_CHANNEL_ID = 1838685806;

const STORAGE_CHANNEL_CHAT_ID = getChatId(STORAGE_CHANNEL_ID);

enum BotActions {
  Retry = "RETRY",
  CleanRetry = "CLEAN_RETRY",
  Clean = "CLEAN",
}

const getRetryPromptMarkupButtons = (promptId: string) => [
  Markup.button.callback("🔁 Retry", `${BotActions.Retry}/${promptId}`),
  Markup.button.callback(
    "🗑️🔁 Clean retry",
    `${BotActions.CleanRetry}/${promptId}`
  ),
];

const handlePrompt = async (
  context: Context,
  prompt: string,
  promptId: string
) => {
  const processInProgressMessage = await context.reply(
    "⏳ Prompt is being processed..."
  );
  try {
    const client = await getClient();
    await client.sendMessage("chatsgpts_bot", { message: prompt });

    console.log("sent prompt to providers");

    let promptResponse: string;
    await new Promise<void>((resolve, reject) => {
      client.addEventHandler(async (event) => {
        try {
          // if (event.message.message === "✅ Вы успешно сбросили контекст") {
          //   console.log("clear context");
          //   // await client.sendMessage("chatsgpts_bot", { message: prompt });
          //   return;
          // }
          console.log("received event");

          if (event.message.message === "Обрабатываем ваш вопрос...") {
            console.log("loading");
            return;
          }

          // const forwardResponse: any = await event.message.forwardTo(
          //   STORAGE_CHANNEL_CHAT_ID
          // );
          // const forwardedMessages: Api.Message[] = forwardResponse[0];
          // const forwardedMessage = forwardedMessages[0];

          promptResponse = event.message.message;
          console.log("saved gpt response message");

          // await context.telegram.forwardMessage(
          //   context.chat.id!,
          //   STORAGE_CHANNEL_CHAT_ID,
          //   forwardedMessage.id
          // );
          resolve();
        } catch (error) {
          reject(error);
        }
      }, new NewMessage({ chats: ["chatsgpts_bot"] }));
    });

    // const promptId = generateRandomId();

    console.log("saving prompt to cls");
    await cls.setItem(promptId, prompt);

    console.log("replying to user");
    await context.reply(
      // @ts-expect-error resolved after initialization
      promptResponse,
      Markup.inlineKeyboard([
        getRetryPromptMarkupButtons(promptId),
        [
          Markup.button.callback(
            "🗑️ Clean dialog",
            `${BotActions.Clean}/${promptId}`
          ),
        ],
      ])
    );
    console.log("replied to user");

    console.log("processed prompt", prompt);
  } finally {
    await context.deleteMessage(processInProgressMessage.message_id);
  }
};

const handleClearContext = async () => {
  const client = await getClient();
  await client.sendMessage("chatsgpts_bot", { message: "/reset" });

  await new Promise<void>((resolve, reject) => {
    client.addEventHandler(async (event) => {
      try {
        if (event.message.message === "Обрабатываем ваш вопрос...") {
          console.log("loading");
          return;
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    }, new NewMessage({ chats: ["chatsgpts_bot"] }));
  });
};

bot.on(message("text"), async (context) => {
  const prompt = context.message.text;
  console.log("prompt", prompt);

  const promptId = `${context.message.message_id}`;
  await handlePrompt(context, prompt, promptId);
});

bot.action(/.+/, async (context) => {
  const callbackData = context.match[0];
  const [type, promptId] = callbackData.split("/") as [BotActions, string];

  if (type === BotActions.Retry || type === BotActions.CleanRetry) {
    console.log("clearing prompt response reply markup");
    await context.editMessageReplyMarkup(undefined);

    console.log("getting prompt from cls");
    const prompt: string = await cls.getItem(promptId);

    if (type === BotActions.CleanRetry) {
      await handleClearContext();
    }

    console.log("retrying prompt response");
    await handlePrompt(context, prompt, promptId);

    await context.answerCbQuery(
      `✅ Successfully${
        type === BotActions.CleanRetry ? " clean" : ""
      } retried the prompt`
    );
  }
  if (type === BotActions.Clean) {
    console.log("edit prompt response reply markup");
    await context.editMessageReplyMarkup(
      Markup.inlineKeyboard([getRetryPromptMarkupButtons(promptId)])
        .reply_markup
    );

    await handleClearContext();

    await context.reply("✅ Successfully cleaned dialog");
    // await context.answerCbQuery("✅ Successfully cleared the context");
  }
});

bot.on("edited_message", async (context, next) => {
  if ("text" in context.editedMessage) {
    const prompt = context.editedMessage.text;
    const promptId = `${context.editedMessage.message_id}`;
    await handlePrompt(context, prompt, promptId);
  } else {
    await next();
  }
});

bot.use(async (context) => {
  await context.reply("⚠️ Напиши мне любой запрос", {
    disable_notification: true,
  });
});
