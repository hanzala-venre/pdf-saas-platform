import { NextResponse } from "next/server"

export async function POST() {
	return NextResponse.json({ error: "PDF to Excel feature has been removed" }, { status: 410 })
}
