import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const relationships = await prisma.relationship.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ relationships });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch relationships" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromEns, toEns } = body as { fromEns?: string; toEns?: string };

    if (!fromEns || !toEns) {
      return NextResponse.json(
        { error: "Missing required fields: fromEns, toEns" },
        { status: 400 }
      );
    }

    const existing = await prisma.relationship.findUnique({
      where: { fromEns_toEns: { fromEns, toEns } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Relationship already exists" },
        { status: 409 }
      );
    }

    const relationship = await prisma.relationship.create({
      data: { fromEns, toEns },
    });

    return NextResponse.json(relationship, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create relationship" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromEns, toEns } = body as { fromEns?: string; toEns?: string };

    if (!fromEns || !toEns) {
      return NextResponse.json(
        { error: "Missing required fields: fromEns, toEns" },
        { status: 400 }
      );
    }

    const existing = await prisma.relationship.findUnique({
      where: { fromEns_toEns: { fromEns, toEns } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Relationship not found" },
        { status: 404 }
      );
    }

    await prisma.relationship.delete({
      where: { fromEns_toEns: { fromEns, toEns } },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete relationship" },
      { status: 500 }
    );
  }
}
