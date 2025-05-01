import { createClient } from '@supabase/supabase-js';

// Vérifier que les variables d'environnement sont définies
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('SUPABASE_URL ou SUPABASE_KEY manquants.');
}

// Créer le client Supabase
export const supabaseClient = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

// Types de stockage
export enum StorageBucket {
  PROFILES = 'image',  // Utilisation du bucket existant 'image' pour les profils
  MEDIA = 'image',     // Utilisation du bucket existant 'image' pour les médias
  EVENTS = 'image'     // Utilisation du bucket existant 'image' pour les événements
}

// Vérifier la connexion au stockage
export async function initializeStorage() {
  try {
    // Supabase ne permet pas toujours la création de buckets via l'API
    // Les buckets doivent généralement être créés via l'interface web Supabase
    
    // Vérifions juste que la connexion à Supabase fonctionne
    const { data, error } = await supabaseClient.storage.listBuckets();
    
    if (error) {
      console.error('Erreur lors de la connexion à Supabase Storage:', error.message);
      return;
    }
    
    console.log('Connexion à Supabase Storage établie avec succès');
    console.log('Buckets disponibles:', data.map(b => b.name).join(', ') || 'Aucun');
    
    // Si les buckets n'existent pas, demandez à l'utilisateur de les créer manuellement
    // ou utilisez un bucket par défaut
    const availableBuckets = new Set(data.map(b => b.name));
    
    for (const bucket of Object.values(StorageBucket)) {
      if (!availableBuckets.has(bucket)) {
        console.warn(`⚠️ Attention: le bucket "${bucket}" n'existe pas dans Supabase.`);
        console.warn(`Veuillez créer ce bucket manuellement dans l'interface Supabase ou configurer les paramètres de stockage.`);
      }
    }
    
    console.log('Initialisation du stockage Supabase terminée');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du stockage Supabase:', error);
  }
}

// Fonction pour uploader un fichier
export async function uploadFile(
  bucket: StorageBucket,
  filePath: string,
  fileContent: Buffer,
  contentType: string
): Promise<string | null> {
  // Vérifier si on doit utiliser le fallback immédiatement
  // (si NODE_ENV est development ou si ALWAYS_USE_FALLBACK est défini)
  if (process.env.NODE_ENV === 'development' || process.env.ALWAYS_USE_FALLBACK === 'true') {
    console.log(`Mode fallback activé - pas de tentative d'upload vers Supabase`);
    
    // Générer un nom unique pour l'image de fallback
    const uniqueId = Date.now().toString().slice(-4);
    let fallbackUrl = '';
    
    // Déterminer le type d'image de placeholder à générer
    if (filePath.includes('profile-images')) {
      fallbackUrl = `https://placehold.co/400x400?text=Profile-${uniqueId}`;
    } else if (filePath.includes('events')) {
      fallbackUrl = `https://placehold.co/600x400?text=Event-${uniqueId}`;
    } else if (filePath.includes('audio')) {
      fallbackUrl = `https://placehold.co/600x400?text=Audio-${uniqueId}`;
    } else if (filePath.includes('video')) {
      fallbackUrl = `https://placehold.co/600x400?text=Video-${uniqueId}`;
    } else {
      fallbackUrl = `https://placehold.co/600x400?text=Media-${uniqueId}`;
    }
    
    console.log(`URL de fallback générée: ${fallbackUrl}`);
    return fallbackUrl;
  }
  
  // Sinon, essayer d'uploader vers Supabase
  try {
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .upload(filePath, fileContent, {
        contentType,
        upsert: true // Remplacer si le fichier existe déjà
      });

    if (error) {
      console.error(`Erreur lors de l'upload vers ${bucket}/${filePath}:`, error.message);
      // Si l'upload échoue, utiliser le fallback
      return generateFallbackUrl(filePath);
    }

    // Obtenir l'URL publique du fichier
    const { data: { publicUrl } } = supabaseClient.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error(`Erreur lors de l'upload vers ${bucket}/${filePath}:`, error);
    // Si une exception est levée, utiliser le fallback
    return generateFallbackUrl(filePath);
  }
}

// Fonction utilitaire pour générer une URL de fallback
function generateFallbackUrl(filePath: string): string {
  const uniqueId = Date.now().toString().slice(-4);
  
  if (filePath.includes('profile-images')) {
    return `https://placehold.co/400x400?text=Profile-${uniqueId}`;
  } else if (filePath.includes('events')) {
    return `https://placehold.co/600x400?text=Event-${uniqueId}`;
  } else if (filePath.includes('audio')) {
    return `https://placehold.co/600x400?text=Audio-${uniqueId}`;
  } else if (filePath.includes('video')) {
    return `https://placehold.co/600x400?text=Video-${uniqueId}`;
  } else {
    return `https://placehold.co/600x400?text=Media-${uniqueId}`;
  }
}

// Fonction pour supprimer un fichier
export async function deleteFile(bucket: StorageBucket, filePath: string): Promise<boolean> {
  try {
    const { error } = await supabaseClient.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error(`Erreur lors de la suppression de ${bucket}/${filePath}:`, error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Erreur lors de la suppression de ${bucket}/${filePath}:`, error);
    return false;
  }
}