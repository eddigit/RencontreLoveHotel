import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { logSecurityEvent } from "@/utils/logger";
import {
  getUserById,
  updateUserVerificationToken
} from '@/lib/user-service'
import { createEmailVerificationToken } from '@/lib/email-verification-token'
import { sendVerificationEmail } from '@/lib/verification-email'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Authentification requise." }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Accès administrateur requis." }, { status: 403 });
    }

    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ success: false, error: "Paramètres manquants." }, { status: 400 });
    }

    // Validation des paramètres
    if (typeof userId !== 'string') {
      return NextResponse.json({ success: false, error: "Types de paramètres invalides." }, { status: 400 });
    }

    const user = await getUserById(userId)
    if (!user || user.email_verified) {
      return NextResponse.json({ success: false, error: "Compte non vérifiable." }, { status: 400 })
    }
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || ''
    if (!secret) {
      return NextResponse.json({ success: false, error: "Configuration indisponible." }, { status: 500 })
    }
    const token = createEmailVerificationToken(user.email, secret)

    // Log pour audit
    logSecurityEvent('EMAIL_VERIFICATION_TOKEN_UPDATE', {
      userId,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent')
    });

    const updated = await updateUserVerificationToken(userId, token)
    if (!updated) {
      return NextResponse.json({ success: false, error: "Compte non vérifiable." }, { status: 409 })
    }
    await sendVerificationEmail({ email: user.email, token })
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in internal-update-verification-token:', error);
    return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 });
  }
}
