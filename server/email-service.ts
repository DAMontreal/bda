import { Resend } from 'resend';

// Initialiser Resend avec la clé API
const resendApiKey = process.env.RESEND_API_KEY || 're_AKxXik7H_F5BawhHujicLj8g259URPhqe';
const resend = new Resend(resendApiKey);

// Utiliser le domaine vérifié de DAM
const FROM_EMAIL = 'no-reply@diversiteartistique.org';

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
 * Envoyer un email de confirmation d'inscription
 */
export async function sendRegistrationConfirmationEmail(
  to: string, 
  firstName: string, 
  lastName: string
): Promise<boolean> {
  const subject = 'Inscription réussie - Bottin des artistes DAM';
  
  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>Inscription réussie - Bottin des artistes DAM</title>
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
        .info-box {
          background-color: #fff;
          border: 2px solid #F89720;
          padding: 15px;
          margin: 20px 0;
          text-align: center;
          border-radius: 8px;
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
          <p>Merci pour votre inscription au Bottin des artistes de Diversité Artistique Montréal !</p>
          
          <div class="info-box">
            <h3>🕒 Votre compte est en cours de validation</h3>
            <p>Un membre de notre équipe examine actuellement votre profil. Vous recevrez un email de confirmation dès que votre compte sera approuvé.</p>
          </div>
          
          <p>Ce processus de validation nous permet de :</p>
          <ul>
            <li>Maintenir la qualité de notre communauté d'artistes</li>
            <li>Vérifier l'authenticité des profils</li>
            <li>Assurer un environnement sûr pour tous nos membres</li>
          </ul>
          
          <p><strong>Prochaines étapes :</strong></p>
          <ol>
            <li>Nous examinons votre profil (généralement sous 48h)</li>
            <li>Vous recevrez un email d'approbation</li>
            <li>Vous pourrez alors vous connecter et profiter pleinement de la plateforme</li>
          </ol>
          
          <p>En attendant, n'hésitez pas à explorer notre site web pour découvrir la communauté d'artistes de DAM.</p>
          
          <p>Si vous avez des questions, contactez-nous à info@diversiteartistique.org</p>
          
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
 * Envoyer un email de réinitialisation de mot de passe
 */
export async function sendPasswordResetEmail(
  to: string, 
  firstName: string, 
  resetToken: string
): Promise<boolean> {
  const subject = 'Réinitialisation de votre mot de passe - Bottin des artistes DAM';
  
  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>Réinitialisation de mot de passe - Bottin des artistes DAM</title>
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
        .token-box {
          background-color: #fff;
          border: 2px solid #F89720;
          padding: 15px;
          margin: 20px 0;
          text-align: center;
          border-radius: 8px;
        }
        .token {
          font-size: 18px;
          font-weight: bold;
          color: #F89720;
          letter-spacing: 2px;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #777;
        }
        .warning {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Bottin des artistes DAM</h1>
        </div>
        <div class="content">
          <h2>Bonjour ${firstName},</h2>
          <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte sur le Bottin des artistes DAM.</p>
          
          <div class="token-box">
            <p><strong>Votre code de réinitialisation :</strong></p>
            <div class="token">${resetToken}</div>
          </div>
          
          <p>Pour réinitialiser votre mot de passe :</p>
          <ol>
            <li>Retournez sur la page de réinitialisation</li>
            <li>Entrez le code ci-dessus</li>
            <li>Choisissez votre nouveau mot de passe</li>
          </ol>
          
          <div class="warning">
            <strong>⚠️ Important :</strong>
            <ul>
              <li>Ce code expire dans 1 heure</li>
              <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
              <li>Ne partagez jamais ce code avec personne</li>
            </ul>
          </div>
          
          <p>Si vous avez des questions, contactez l'équipe de DAM.</p>
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
 * Envoyer un email de notification de changement de mot de passe par l'admin
 */
export async function sendPasswordChangedByAdminEmail(
  to: string, 
  firstName: string, 
  lastName: string
): Promise<boolean> {
  const subject = 'Votre mot de passe a été modifié - Bottin des artistes DAM';
  
  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>Mot de passe modifié - Bottin des artistes DAM</title>
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
        .info-box {
          background-color: #fff;
          border: 2px solid #F89720;
          padding: 15px;
          margin: 20px 0;
          text-align: center;
          border-radius: 8px;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #777;
        }
        .warning {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
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
          <p>Nous vous informons que votre mot de passe sur le Bottin des artistes DAM a été modifié par un administrateur.</p>
          
          <div class="info-box">
            <h3>🔐 Mot de passe modifié</h3>
            <p>Votre mot de passe a été mis à jour le ${new Date().toLocaleDateString('fr-CA')} à ${new Date().toLocaleTimeString('fr-CA')}.</p>
          </div>
          
          <p><strong>Prochaines étapes :</strong></p>
          <ol>
            <li>Connectez-vous avec votre nouveau mot de passe</li>
            <li>Si vous le souhaitez, vous pouvez modifier votre mot de passe dans vos paramètres de profil</li>
          </ol>
          
          <div class="warning">
            <strong>⚠️ Important :</strong>
            <p>Si vous n'êtes pas à l'origine de cette demande de modification, contactez immédiatement l'équipe de DAM à info@diversiteartistique.org</p>
          </div>
          
          <p>Si vous avez des questions concernant cette modification, n'hésitez pas à contacter l'équipe de DAM.</p>
          
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