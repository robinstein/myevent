import {
  decryptToString,
  transformUser,
  getUserIdentifier,
  generateRecoveryCode,
} from "@myevent/utils";
import {
  db,
  users,
  or,
  eq,
  type NewUser,
  type User,
  type DBQueryConfig,
} from "@myevent/db";
import { decodeBase64 } from "@oslojs/encoding";

export async function createUser(user: NewUser): Promise<User> {
  const identifier = getUserIdentifier(user);

  const existingUser = await db.query.users.findFirst({
    where: or(eq(users.email, identifier), eq(users.mobile, identifier)),
  });

  if (existingUser) {
    throw new Error("User with this email or mobile number already exists");
  }

  const newUser = {
    ...user,
    twoFactorRecoveryCode: generateRecoveryCode(),
  } satisfies NewUser;

  const [result] = await db.insert(users).values(newUser).returning();

  if (!result) {
    throw new Error("Failed to create user");
  }

  return result;
}

export async function getUserById(id: string): Promise<User> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) {
    throw new Error("User not found");
  }

  return transformUser(user);
}

export async function getUserByGoogleId(id: string): Promise<User> {
  const user = await db.query.users.findFirst({
    where: eq(users.googleId, id),
  });

  if (!user) {
    throw new Error("User not found");
  }

  return transformUser(user);
}

export async function getUserByLinkedinId(id: string): Promise<User> {
  const user = await db.query.users.findFirst({
    where: eq(users.linkedinId, id),
  });

  if (!user) {
    throw new Error("User not found");
  }

  return transformUser(user);
}

export async function getUserByEmail(email: string): Promise<User> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    throw new Error("User not found");
  }

  return transformUser(user);
}

export async function getUserByMobile(mobile: string): Promise<User> {
  const user = await db.query.users.findFirst({
    where: eq(users.mobile, mobile),
  });

  if (!user) {
    throw new Error("User not found");
  }

  return transformUser(user);
}

export async function getUserByEmailOrMobile(
  identifier: string
): Promise<User> {
  const user = await db.query.users.findFirst({
    where: or(eq(users.email, identifier), eq(users.mobile, identifier)),
  });

  if (!user) {
    throw new Error("User not found");
  }

  return transformUser(user);
}

export type ListUsersOptions = DBQueryConfig<"many", true>;
export async function listUsers(options?: ListUsersOptions): Promise<User[]> {
  const users = await db.query.users.findMany(options);

  return users.map(transformUser);
}

export async function updateUser(
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

export async function resetTwoFactorWithRecoveryCode(
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

    const decodedRecoveryCode = user.twoFactorRecoveryCode
      ? decodeBase64(user.twoFactorRecoveryCode)
      : null;
    if (!decodedRecoveryCode) {
      throw new Error("No recovery code found");
    }
    const decryptedRecoveryCode = decryptToString(decodedRecoveryCode);

    if (decryptedRecoveryCode !== recoveryCode) {
      throw new Error("Invalid recovery code");
    }

    const newRecoveryCode = generateRecoveryCode();

    const [updatedUser] = await tx
      .update(users)
      .set({
        twoFactorSecret: null,
        twoFactorRecoveryCode: newRecoveryCode,
        twoFactorEnabled: false,
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error("Failed to update user");
    }

    return newRecoveryCode;
  });

  if (!result) {
    throw new Error("Failed to reset two factor");
  }

  return result;
}

export async function deleteUser(id: string): Promise<string> {
  const [result] = await db.delete(users).where(eq(users.id, id)).returning();

  if (!result) {
    throw new Error("Failed to delete user");
  }

  return result.id;
}
