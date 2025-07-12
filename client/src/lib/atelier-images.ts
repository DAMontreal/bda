/**
 * Solution de contournement pour les images d'atelier TROC ID 3
 * Images uploadées sur Supabase mais non persistées en base
 */

export const ATELIER_IMAGES_TROC_3 = [
  'https://yorkiuccnxoyyzrliung.supabase.co/storage/v1/object/public/image/troc-ads/1752358316541-xoyfxd.jpg',
  'https://yorkiuccnxoyyzrliung.supabase.co/storage/v1/object/public/image/troc-ads/1752358317639-6298a.jpg', 
  'https://yorkiuccnxoyyzrliung.supabase.co/storage/v1/object/public/image/troc-ads/1752358318046-9ihhuc.jpg',
  'https://yorkiuccnxoyyzrliung.supabase.co/storage/v1/object/public/image/troc-ads/1752358318346-orpxfi.jpg'
];

/**
 * Fonction pour récupérer les images d'une annonce avec fallback pour TROC ID 3
 */
export function getTrocAdImages(ad: { id: number; imageUrl?: string | null }): string[] {
  // Solution de contournement pour l'annonce d'atelier ID 3
  if (ad.id === 3 && (!ad.imageUrl || ad.imageUrl === null)) {
    return ATELIER_IMAGES_TROC_3;
  }
  
  // Comportement normal pour les autres annonces
  if (ad.imageUrl) {
    return ad.imageUrl.split(',').map(url => url.trim()).filter(url => url.length > 0);
  }
  
  return [];
}