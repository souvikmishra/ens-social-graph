import { NextRequest, NextResponse } from "next/server";
import { resolveEns } from "@/lib/ens";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");

  if (!name) {
    return NextResponse.json(
      { error: "Missing required query parameter: name" },
      { status: 400 }
    );
  }

  try {
    const profile = await resolveEns(name);
    return NextResponse.json({ avatar: profile?.avatar ?? null });
  } catch {
    return NextResponse.json(
      { error: "Failed to resolve ENS name" },
      { status: 500 }
    );
  }
}
