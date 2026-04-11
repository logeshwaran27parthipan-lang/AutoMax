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
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { runs: true } },
        runs: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          select: { startedAt: true, status: true },
        },
      },
    })

    const result = workflows.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      triggers: w.triggers,
      steps: w.steps,
      createdAt: w.createdAt,
      runCount: w._count.runs,
      lastRun: w.runs[0] ?? null,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/workflows error:', error)
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

    const triggersJson = typeof triggers === 'string' ? { type: triggers } : triggers

    const workflow = await prisma.workflow.create({
      data: {
        name,
        description,
        triggers: triggersJson,
        steps,
        userId: payload.userId,
      },
    })

    return NextResponse.json(workflow, { status: 201 })
  } catch (error) {
    console.error('POST /api/workflows error:', error)
    return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 })
  }
}