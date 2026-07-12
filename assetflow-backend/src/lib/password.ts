import bcrypt from "bcrypt";

import { env } from "../config/env";

export const hashPassword = (value: string) => bcrypt.hash(value, env.BCRYPT_SALT_ROUNDS);

export const verifyPassword = (value: string, hash: string) => bcrypt.compare(value, hash);
