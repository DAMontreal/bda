import React from 'react';

interface FormattedTextProps {
  text: string | null | undefined;
  className?: string;
}

/**
 * Composant qui affiche du texte en préservant les sauts de ligne
 * et en appliquant une classe CSS optionnelle.
 */
const FormattedText: React.FC<FormattedTextProps> = ({ text, className = '' }) => {
  if (!text) return null;

  // Diviser le texte par les sauts de ligne
  const paragraphs = text.split('\n').filter(p => p.trim() !== '');

  // Si un seul paragraphe sans saut de ligne, le retourner directement
  if (paragraphs.length === 1 && !text.includes('\n')) {
    return <p className={className}>{text}</p>;
  }

  // Sinon, créer un paragraphe pour chaque partie séparée par un saut de ligne
  return (
    <div className={className}>
      {text.split('\n').map((paragraph, index) => (
        // Si le paragraphe est vide, ajouter un espace insécable pour préserver la hauteur
        <p key={index} className="mb-2">
          {paragraph || '\u00A0'}
        </p>
      ))}
    </div>
  );
};

export default FormattedText;