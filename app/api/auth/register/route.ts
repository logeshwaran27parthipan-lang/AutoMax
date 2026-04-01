import { prisma } from "../../../../lib/prisma";
import { hashPassword, generateToken } from "../../../../lib/auth";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name } = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return new Response(
        JSON.stringify({ error: "Email already registered" }),
        { status: 400 }
      );
    }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, password: hashed, name },
    });

    const token = generateToken(user.id);

    return new Response(
      JSON.stringify({ user: { id: user.id, email: user.email, name: user.name } }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `auth-token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`,
        },
      }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Registration failed" }), {
      status: 500,
    });
  }
}
