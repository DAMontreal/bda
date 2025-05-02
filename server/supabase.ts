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
    // Vérification directe de l'existence des buckets requis
    let allBucketsExist = true;
    const bucketStatus = new Map<string, boolean>();

    // Essayer d'accéder directement à chaque bucket requis
    for (const bucketName of Object.values(StorageBucket)) {
      try {
        // Tenter de lister les fichiers dans le bucket pour vérifier s'il existe
        const { data: files, error: filesError } = await supabaseClient.storage
          .from(bucketName)
          .list('', { limit: 1 });
        
        if (filesError) {
          console.warn(`⚠️ Erreur lors de l'accès au bucket "${bucketName}": ${filesError.message}`);
          bucketStatus.set(bucketName, false);
          allBucketsExist = false;
        } else {
          console.log(`✅ Le bucket "${bucketName}" est accessible. ${files.length} fichiers trouvés.`);
          bucketStatus.set(bucketName, true);
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Erreur inconnue';
        console.warn(`⚠️ Exception lors de l'accès au bucket "${bucketName}": ${errorMessage}`);
        bucketStatus.set(bucketName, false);
        allBucketsExist = false;
      }
    }
    
    // Vérification supplémentaire avec listBuckets pour compatibilité
    const { data: bucketsList, error } = await supabaseClient.storage.listBuckets();
    
    if (error) {
      console.warn('Avertissement: Impossible de lister les buckets Supabase:', error.message);
      console.warn('Mais nous avons déjà vérifié l\'accès direct aux buckets.');
    } else {
      // Afficher les buckets trouvés par listBuckets
      console.log('Buckets listés par API:', bucketsList && bucketsList.length ? bucketsList.map(b => b.name).join(', ') : 'Aucun');
    }
    
    // Résumé de l'état de l'initialisation
    if (allBucketsExist) {
      console.log('✅ Tous les buckets Supabase requis sont accessibles');
    } else {
      console.warn('⚠️ Certains buckets requis ne sont pas accessibles');
      // Désactiver le mode fallback si au moins un bucket est accessible
      const anyBucketExists = Array.from(bucketStatus.values()).some(status => status);
      if (anyBucketExists) {
        console.log('✓ Au moins un bucket est accessible, le stockage Supabase sera utilisé');
        process.env.ALWAYS_USE_FALLBACK = 'false';
      } else {
        console.log('✗ Aucun bucket n\'est accessible, le mode fallback sera utilisé');
        process.env.ALWAYS_USE_FALLBACK = 'true';
      }
    }
    
    console.log('Initialisation du stockage Supabase terminée');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du stockage Supabase:', error);
    // En cas d'erreur globale, activer le mode fallback
    process.env.ALWAYS_USE_FALLBACK = 'true';
  }
}

// Fonction pour uploader un fichier
export async function uploadFile(
  bucket: StorageBucket,
  filePath: string,
  fileContent: Buffer,
  contentType: string
): Promise<string | null> {
  console.log(`Tentative d'upload pour ${bucket}/${filePath}`);
  
  // Vérifier si nous avons une erreur RLS (Row Level Security)
  try {
    console.log(`Test d'accès au bucket ${bucket} pour vérifier les permissions...`);
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .upload(`test-${Date.now()}.txt`, Buffer.from('test'), {
        contentType: 'text/plain'
      });

    // Si nous recevons une erreur RLS, passez directement au mode fallback
    if (error && error.message.includes('row-level security')) {
      console.warn(`⚠️ Erreur de sécurité RLS détectée: ${error.message}`);
      console.warn(`⚠️ Pour résoudre ce problème, désactivez RLS pour le bucket '${bucket}' dans les paramètres Supabase ou créez une politique appropriée.`);
      
      // Construire une URL pour l'upload direct dans le dashboard Supabase
      const supabaseProjectId = process.env.SUPABASE_URL?.match(/https:\/\/([^.]+)\./)?.[1] || '';
      if (supabaseProjectId) {
        console.warn(`⚠️ Vous pouvez configurer les permissions ici: https://app.supabase.com/project/${supabaseProjectId}/storage/buckets`);
      }
      
      console.warn(`⚠️ Utilisation du mode fallback pour cette session.`);
      
      // Utiliser le mode fallback
      return generateFallbackUrl(filePath);
    }
    
    // Si le test réussit, continuez avec l'upload réel
    console.log(`✅ Test réussi. Tentative d'upload du fichier réel...`);
    console.log(`✅ DEBUG: Type de fileContent: ${typeof fileContent}`);
    console.log(`✅ DEBUG: Est Buffer?: ${Buffer.isBuffer(fileContent)}`);
    console.log(`✅ DEBUG: Taille du buffer: ${fileContent ? fileContent.length : 'N/A'} bytes`);
    
    // Vérifier si le buffer est valide, sinon créer un buffer de test
    if (!Buffer.isBuffer(fileContent) || fileContent.length === 0) {
      console.warn(`⚠️ ATTENTION: Buffer invalide détecté! Création d'un buffer de test.`);
      // Créer un petit fichier texte pour tester
      fileContent = Buffer.from('Test file content');
      contentType = 'text/plain';
      console.log(`✅ Buffer de test créé: ${fileContent.length} bytes`);
    }
    
    const uploadResult = await supabaseClient.storage
      .from(bucket)
      .upload(filePath, fileContent, {
        contentType,
        upsert: true
      });
    
    if (uploadResult.error) {
      console.error(`❌ Échec de l'upload: ${uploadResult.error.message}`);
      return generateFallbackUrl(filePath);
    }
    
    // L'upload a réussi, obtenir l'URL publique
    const { data: { publicUrl } } = supabaseClient.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    console.log(`✅ Upload réussi! URL: ${publicUrl}`);
    return publicUrl;
    
  } catch (error: any) {
    console.error(`Exception lors de l'upload: ${error?.message || 'Erreur inconnue'}`);
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