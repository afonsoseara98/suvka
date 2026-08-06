import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { benchmarkStore } from "@/app/benchmark/storeInstance";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
  }

  const businessId = new URL(request.url).searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ success: false, message: "businessId query param is required." }, { status: 400 });
  }

  const generations = await benchmarkStore.listGenerations(businessId);
  return NextResponse.json({ generations });
}
