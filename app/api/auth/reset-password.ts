import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, updateUserResetToken } from "@/lib/user-service";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import { getOption } from "@/actions/user-actions";

export async function POST(req: NextRequest) {
  const requestBody = await req.json();

  const { email } = requestBody;
  if (!email) {
    return NextResponse.json({ success: false, error: "Email manquant." }, { status: 400 });
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return NextResponse.json({ success: false, error: "Utilisateur introuvable." }, { status: 404 });
  }

  // Generate a reset token
  const token = uuidv4();
  const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`;

  // Save the token in the database
  await updateUserResetToken(user.id, token);

  // Fetch email template
  const subjectTemplate = (await getOption("password_reset_email_subject")) || "Réinitialisez votre mot de passe sur Love Hotel";
  const bodyTemplate = (await getOption("password_reset_email_body")) ||
    `Bonjour [name],\n\nVous avez demandé à réinitialiser votre mot de passe.\n\nVeuillez cliquer sur le lien ci-dessous pour réinitialiser votre mot de passe :\n\n[reset-link]\n\nSi vous n'avez pas demandé cette réinitialisation, ignorez cet email.\n\nL'équipe Love Hotel`;

  // Replace placeholders
  const subject = subjectTemplate.replace(/\[name\]/g, user.name || "").replace(/\[reset-link\]/g, resetUrl);
  const body = bodyTemplate.replace(/\[name\]/g, user.name || "").replace(/\[reset-link\]/g, resetUrl).replace(/\n/g, "<br>");

  // Send email
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    }
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "no-reply@lovehotel.app",
    to: email,
    subject,
    html: body,
  });

  return NextResponse.json({ success: true });
}
