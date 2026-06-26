import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { logSecurityEvent } from "@/utils/logger";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Authentification requise." }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Accès administrateur requis." }, { status: 403 });
    }

    const { userId, token } = await req.json();
    
    if (!userId || !token) {
      return NextResponse.json({ success: false, error: "Paramètres manquants." }, { status: 400 });
    }

    // Validation des paramètres
    if (typeof userId !== 'string' || typeof token !== 'string') {
      return NextResponse.json({ success: false, error: "Types de paramètres invalides." }, { status: 400 });
    }

    // Log pour audit
    logSecurityEvent('EMAIL_VERIFICATION_TOKEN_UPDATE', {
      userId,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent')
    });

    await executeQuery(
      `UPDATE users SET email_verification_token = $1 WHERE id = $2`,
      [token, userId]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in internal-update-verification-token:', error);
    return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 });
  }
}
