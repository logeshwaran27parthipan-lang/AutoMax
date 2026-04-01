import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const workflows = await prisma.workflow.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(workflows)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const body = await req.json()
    const { name, description, triggers = [], steps = [] } = body

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const workflow = await prisma.workflow.create({
      data: {
        name,
        description,
        triggers,
        steps,
        userId: payload.userId,
      }
    })

    return NextResponse.json(workflow, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 })
  }
}