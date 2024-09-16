export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BOT_TOKEN_DEV: string;
      BOT_TOKEN_PROD: string;

      APP_ID: string;
      APP_HASH: string;
      SESSION_PROD: string;
      SESSION_DEV: string;
    }
  }
}
