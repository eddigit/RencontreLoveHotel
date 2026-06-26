import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/user-service";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ success: false, error: "Email manquant." }, { status: 400 });
  }
  const user = await getUserByEmail(email);
  if (!user) {
    return NextResponse.json({ success: false, error: "Utilisateur introuvable." }, { status: 404 });
  }
  if (user.email_verified) {
    return NextResponse.json({ success: false, error: "Email déjà vérifié." }, { status: 400 });
  }
  return NextResponse.json(
    {
      success: false,
      error: "L'envoi automatique d'email de vérification est désactivé. Seule une demande explicite de renouvellement de mot de passe peut envoyer un email."
    },
    { status: 403 }
  );
}
