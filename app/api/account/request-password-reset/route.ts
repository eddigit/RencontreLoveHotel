import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, updateUserResetToken } from '@/lib/user-service';
import { getOption } from '@/actions/user-actions'; // Assuming getOption is for email templates
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer'; // For sending email
import { canSendEmailForPurpose } from '@/lib/email-policy';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { email } = body;

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const user = await getUserByEmail(email);

    if (!user) {
      // User not found. For security reasons, don't reveal if the email is registered or not.
      // Send a generic success message.
      return NextResponse.json({ message: "If your email is registered, you will receive a password reset link." }, { status: 200 });
    }

    const emailDecision = canSendEmailForPurpose({
      purpose: 'password_reset',
      requestedByUser: true,
      user: {
        status: user.status,
        isBanned: user.is_banned
      }
    });

    if (!emailDecision.allowed) {
      return NextResponse.json({ message: "If your email is registered, you will receive a password reset link." }, { status: 200 });
    }

    const resetToken = uuidv4();
    const resetTokenExpires = new Date(Date.now() + 3600000); // Token expires in 1 hour

    // Update user with reset token and expiry
    await updateUserResetToken(user.id, resetToken, resetTokenExpires);

    // Fetch email templates
    // You'll need to ensure these option names match what's in your admin setup and database
    const subjectTemplate = await getOption("password_reset_email_subject") || "Réinitialisation de votre mot de passe Love Hotel";
    const bodyTemplate = await getOption("password_reset_email_body") ||
      `Bonjour [name],<br><br>Vous avez demandé une réinitialisation de mot de passe pour votre compte Love Hotel.<br><br>Veuillez cliquer sur le lien ci-dessous pour choisir un nouveau mot de passe :<br><a href="[reset-link]">[reset-link]</a><br><br>Ce lien expirera dans une heure.<br><br>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.<br><br>L'équipe Love Hotel`;

    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const subject = subjectTemplate.replace(/\[name\]/g, user.name || "Utilisateur");
    let emailBody = bodyTemplate.replace(/\[name\]/g, user.name || "Utilisateur");
    emailBody = emailBody.replace(/\[reset-link\]/g, resetLink);

    // Configure nodemailer transporter (ensure your .env file has SMTP variables)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    });

    // Send the email
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@lovehotel.app',
      to: user.email,
      subject: subject,
      html: emailBody,
    });

    return NextResponse.json({ message: "Password reset email sent." }, { status: 200 });
  } catch (error) {
    console.error("Error in password reset request handler");
    let message = "Error processing request";
    // It's good practice to not expose too much detail in error messages to the client
    if (error instanceof SyntaxError) {
      message = "Malformed JSON in request body";
      return NextResponse.json({ message }, { status: 400 });
    }
    // For other errors, a generic server error is safer
    return NextResponse.json({ message: "An internal server error occurred." }, { status: 500 });
  }
}
