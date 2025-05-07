import { Resend } from 'resend';

// Initialiser Resend avec la clé API
const resendApiKey = process.env.RESEND_API_KEY || 're_AKxXik7H_F5BawhHujicLj8g259URPhqe';
const resend = new Resend(resendApiKey);

const FROM_EMAIL = 'no-reply@bottin.diversiteartistique.org';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Service pour envoyer des emails via Resend
 */
export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text: text || convertHtmlToText(html)
    });

    if (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      return false;
    }

    console.log('Email envoyé avec succès, ID:', data?.id);
    return true;
  } catch (error) {
    console.error('Exception lors de l\'envoi de l\'email:', error);
    return false;
  }
}

/**
 * Envoyer un email de bienvenue lors de l'approbation d'un compte
 */
export async function sendApprovalEmail(
  to: string, 
  firstName: string, 
  lastName: string
): Promise<boolean> {
  const subject = 'Votre compte sur le Bottin des artistes a été approuvé';
  
  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>Compte approuvé - Bottin des artistes DAM</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #F89720;
          padding: 20px;
          text-align: center;
          color: white;
        }
        .content {
          padding: 20px;
          background-color: #f8f8f8;
        }
        .button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #F89720;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          margin-top: 20px;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Bottin des artistes DAM</h1>
        </div>
        <div class="content">
          <h2>Bonjour ${firstName} ${lastName},</h2>
          <p>Nous sommes heureux de vous informer que votre compte sur le Bottin des artistes DAM a été approuvé !</p>
          <p>Vous pouvez maintenant vous connecter à votre compte et accéder à toutes les fonctionnalités de la plateforme :</p>
          <ul>
            <li>Compléter votre profil d'artiste</li>
            <li>Ajouter des médias à votre portfolio</li>
            <li>Créer des événements</li>
            <li>Communiquer avec d'autres artistes</li>
            <li>Publier des annonces sur TROC'DAM</li>
          </ul>
          <p>Nous vous invitons à vous connecter dès maintenant pour explorer la plateforme et compléter votre profil.</p>
          <a href="https://bottin.diversiteartistique.org/login" class="button">Se connecter au Bottin</a>
          <p>Si vous avez des questions ou besoin d'assistance, n'hésitez pas à contacter l'équipe de DAM.</p>
          <p>Cordialement,<br>L'équipe de Diversité Artistique Montréal</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Diversité Artistique Montréal. Tous droits réservés.</p>
          <p>Ce message a été envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
      </div>
    </body>
  </html>
  `;

  return sendEmail({
    to,
    subject,
    html
  });
}

/**
 * Fonction utilitaire pour convertir le HTML en texte brut
 */
function convertHtmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>.*<\/style>/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}