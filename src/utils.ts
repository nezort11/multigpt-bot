// // @ts-expect-error nanoid@3 is commonjs no esm
import { nanoid } from "nanoid";

export const getChatId = (id: string | number) => {
  return `-100${id}`;
};

export const generateRandomId = () => nanoid(16);
