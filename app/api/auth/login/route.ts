import { prisma } from "../../../../lib/prisma";
import { comparePassword, generateToken } from "../../../../lib/auth";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401 },
      );
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401 },
      );
    }

    const token = generateToken(user.id);

    return new Response(
      JSON.stringify({
        user: { id: user.id, email: user.email, name: user.name },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `auth-token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`,
        },
      },
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Login failed" }), {
      status: 500,
    });
  }
}
