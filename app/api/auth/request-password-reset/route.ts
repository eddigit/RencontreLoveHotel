import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { email } = body;

    if (!email) {
      return NextResponse.json({ message: "Email is required (from request-password-reset handler)" }, { status: 400 });
    }

    // Simulate success for now
    return NextResponse.json({ message: "Password reset email sent (simulated by request-password-reset handler)" }, { status: 200 });
  } catch (error) {
    console.error("Error parsing JSON body or in password reset handler");
    return NextResponse.json({ message: "Error processing request" }, { status: 500 });
  }
}
