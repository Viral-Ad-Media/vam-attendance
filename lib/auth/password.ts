import { hashPassword, verifyPassword } from "better-auth/crypto";
import { compare } from "bcryptjs";
export const passwordHash = hashPassword;
export async function passwordVerify({
  password,
  hash,
}: {
  password: string;
  hash: string;
}) {
  // Supabase password accounts use bcrypt. New and reset passwords use scrypt.
  if (/^\$2[aby]\$/.test(hash))
    return compare(password, hash.replace(/^\$2y\$/, "$2b$"));
  return verifyPassword({ password, hash });
}
