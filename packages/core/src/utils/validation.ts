import { z } from "zod";

export function isEmail(value: string): boolean {
  return z.string().email().safeParse(value).success;
}
