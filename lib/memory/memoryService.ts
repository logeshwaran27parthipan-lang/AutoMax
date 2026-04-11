import { prisma } from "@/lib/prisma";

// SAVE MESSAGE
export async function saveMessage(
  userId: string,
  message: string,
  role: "user" | "ai"
) {
  try {
    await prisma.conversation.create({
      data: {
        userId,
        message,
        role,
      },
    });
  } catch (err) {
    console.log("Memory save error:", err);
  }
}

// GET LAST MESSAGES (context)
export async function getRecentMessages(userId: string, limit = 5) {
  try {
    const messages = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // reverse so oldest → newest
    return messages.reverse();
  } catch (err) {
    console.log("Memory fetch error:", err);
    return [];
  }
}