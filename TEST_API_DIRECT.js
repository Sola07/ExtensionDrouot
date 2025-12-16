/**
 * Script de test à exécuter dans la console de la page Drouot
 * Pour vérifier si on peut intercepter et parser l'API
 */

console.log('🔍 Test API Drouot - Démarrage...\n');

// Test 1: Intercepter fetch
const originalFetch = window.fetch;
let apiCallDetected = false;

window.fetch = async function(...args) {
  const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;

  console.log('📡 Fetch appelé:', url);

  // Check if API
  if (url && url.includes('api.drouot.com') && url.includes('search')) {
    apiCallDetected = true;
    console.log('🎯 API DROUOT DÉTECTÉE !');
    console.log('URL complète:', url);
  }

  const response = await originalFetch.apply(this, args);

  // Si c'est l'API Drouot, analyser la réponse
  if (url && url.includes('api.drouot.com') && url.includes('search')) {
    const clonedResponse = response.clone();

    try {
      const data = await clonedResponse.json();

      console.log('\n📦 DONNÉES API REÇUES:');
      console.log('- Total lots:', data.lots?.length);
      console.log('- Auction houses:', Object.keys(data.breakdowns?.auctioneer || {}).length);

      if (data.breakdowns?.auctioneer) {
        const houses = Object.entries(data.breakdowns.auctioneer)
          .slice(0, 5)
          .map(([id, info]) => `${id}: ${info.name} (${info.hits})`);
        console.log('- Exemples maisons:', houses);
      }

      if (data.lots && data.lots.length > 0) {
        const firstLot = data.lots[0];
        console.log('\n📋 Premier lot:');
        console.log('- ID:', firstLot.id);
        console.log('- auctioneerId:', firstLot.auctioneerId);
        console.log('- Description:', firstLot.description?.substring(0, 50));
        console.log('- Prix:', firstLot.lowEstim, '-', firstLot.highEstim);
      }

      console.log('\n✅ L\'API fonctionne et peut être parsée !');

    } catch (error) {
      console.error('❌ Erreur parsing JSON:', error);
    }
  }

  return response;
};

console.log('✅ Interception fetch activée');
console.log('👉 Rechargez la page ou changez de catégorie pour tester\n');

// Attendre 5 secondes
setTimeout(() => {
  if (!apiCallDetected) {
    console.log('⚠️ Aucun appel API détecté après 5 secondes');
    console.log('💡 Suggestions:');
    console.log('1. Rechargez la page');
    console.log('2. Changez de catégorie');
    console.log('3. Allez à la page suivante');
  }
}, 5000);
