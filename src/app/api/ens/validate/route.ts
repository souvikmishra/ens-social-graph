import { NextRequest, NextResponse } from "next/server";
import { resolveEns, isValidEnsFormat } from "@/lib/ens";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");

  if (!name) {
    return NextResponse.json(
      { error: "Missing required query parameter: name" },
      { status: 400 }
    );
  }

  if (!isValidEnsFormat(name)) {
    return NextResponse.json({ exists: false, reason: "invalid_format" });
  }

  try {
    const profile = await resolveEns(name);
    return NextResponse.json({ exists: profile !== null });
  } catch {
    return NextResponse.json(
      { error: "Resolution failed" },
      { status: 502 }
    );
  }
}
