import { NextRequest, NextResponse } from 'next/server';
import { getUserByResetToken, updateUserPassword } from '@/lib/user-service'; // You'll need to create these
import { hash } from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json({ message: 'Token et nouveau mot de passe sont requis.' }, { status: 400 });
    }

    // 1. Validate the token and get user
    const user = await getUserByResetToken(token);

    if (!user) {
      return NextResponse.json({ message: 'Token invalide ou expiré.' }, { status: 400 });
    }

    // Optional: Check if token is expired if your getUserByResetToken doesn't handle it
    // if (user.password_reset_token_expires_at && new Date() > new Date(user.password_reset_token_expires_at)) {
    //   return NextResponse.json({ message: 'Token expiré.' }, { status: 400 });
    // }

    // 2. Hash the new password
    const hashedPassword = await hash(password, 10);

    // 3. Update the user's password and clear the reset token
    const success = await updateUserPassword(user.id, hashedPassword);

    if (success) {
      return NextResponse.json({ message: 'Mot de passe réinitialisé avec succès.' }, { status: 200 });
    } else {
      return NextResponse.json({ message: 'Impossible de réinitialiser le mot de passe.' }, { status: 500 });
    }

  } catch (error) {
    console.error("Error in reset-password handler:", error);
    return NextResponse.json({ message: 'Une erreur interne s\'est produite.' }, { status: 500 });
  }
}
