import {
  generateRandomRecoveryCode,
  decryptToString,
  encryptString,
} from "@myevent/core";
import { db, users, eq, type NewUser, type User, or } from "@myevent/db";
import { decodeBase64, encodeBase64 } from "@oslojs/encoding";

async function createUser(user: NewUser): Promise<User> {
  // TODO: Refractor
  const identifier = (user.email ?? user.mobile)!;

  const existingUser = await db.query.users.findFirst({
    where: or(eq(users.email, identifier), eq(users.mobile, identifier)),
  });

  if (existingUser) {
    throw new Error("User with this email or mobile number already exists");
  }

  const recoveryCode = generateRandomRecoveryCode();
  const encryptedRecoveryCode = encryptString(recoveryCode);

  const newUser = {
    ...user,
    twoFactorRecoveryCode: encodeBase64(encryptedRecoveryCode),
  } satisfies NewUser;

  const [result] = await db.insert(users).values(newUser).returning();

  if (!result) {
    throw new Error("Failed to create user");
  }

  return result;
}

async function getUserById(id: string): Promise<User> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

async function getUserByGoogleId(id: string): Promise<User> {
  const user = await db.query.users.findFirst({
    where: eq(users.googleId, id),
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

async function getUserByLinkedinId(id: string): Promise<User> {
  const user = await db.query.users.findFirst({
    where: eq(users.linkedinId, id),
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

async function getUserByEmail(email: string): Promise<User> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

async function getUserByMobile(mobile: string): Promise<User> {
  const user = await db.query.users.findFirst({
    where: eq(users.mobile, mobile),
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

async function getUserByEmailOrMobile(identifier: string): Promise<User> {
  const user = await db.query.users.findFirst({
    where: or(eq(users.email, identifier), eq(users.mobile, identifier)),
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

async function updateUser(
  id: string,
  updates: Partial<Omit<NewUser, "id">>
): Promise<User> {
  const [result] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, id))
    .returning();

  if (!result) {
    throw new Error("Failed to update user");
  }

  return result;
}

async function resetTwoFactorWithRecoveryCode(
  userId: string,
  recoveryCode: string
) {
  const [result] = await db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(users)
      .for("update")
      .where(eq(users.id, userId));

    if (!user) {
      throw new Error("User not found");
    }

    const decodedRecoveryCode = decodeBase64(user.twoFactorRecoveryCode);
    const decryptedRecoveryCode = decryptToString(decodedRecoveryCode);

    if (decryptedRecoveryCode !== recoveryCode) {
      throw new Error("Invalid recovery code");
    }

    const newRecoveryCode = generateRandomRecoveryCode();
    const encryptedNewRecoveryCode = encryptString(newRecoveryCode);

    const [updatedUser] = await tx
      .update(users)
      .set({
        twoFactorSecret: null,
        twoFactorRecoveryCode: encodeBase64(encryptedNewRecoveryCode),
        twoFactorEnabled: false,
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error("Failed to update user");
    }

    return newRecoveryCode;
  });

  return result;
}

async function resetRecoveryCode(userId: string) {
  const recoveryCode = generateRandomRecoveryCode();
  const encrypted = encryptString(recoveryCode);

  await updateUser(userId, { twoFactorRecoveryCode: encodeBase64(encrypted) });

  return recoveryCode;
}

async function deleteUser(id: string): Promise<string> {
  const [result] = await db.delete(users).where(eq(users.id, id)).returning();

  if (!result) {
    throw new Error("Failed to delete user");
  }

  return result.id;
}

export {
  createUser,
  getUserById,
  getUserByGoogleId,
  getUserByLinkedinId,
  getUserByEmail,
  getUserByMobile,
  getUserByEmailOrMobile,
  updateUser,
  resetTwoFactorWithRecoveryCode,
  resetRecoveryCode,
  deleteUser,
};
