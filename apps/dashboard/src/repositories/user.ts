import { db, users, eq, type NewUser, type User } from "@myevent/db";

async function createUser(user: NewUser): Promise<User> {
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, user.email),
  });

  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  const [result] = await db.insert(users).values(user).returning();

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
  updateUser,
  deleteUser,
};
