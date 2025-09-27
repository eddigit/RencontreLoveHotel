// Test simple de la session NextAuth
async function testSession() {
  console.log('🔍 Test de la session NextAuth...\n');
  
  try {
    // Test de la session actuelle
    console.log('1. Vérification de la session actuelle...');
    const sessionResponse = await fetch('http://localhost:3000/api/auth/session');
    const sessionData = await sessionResponse.json();
    console.log('Session actuelle:', sessionData);
    
    // Test des providers
    console.log('\n2. Vérification des providers...');
    const providersResponse = await fetch('http://localhost:3000/api/auth/providers');
    const providersData = await providersResponse.json();
    console.log('Providers disponibles:', Object.keys(providersData));
    
    // Test du CSRF token
    console.log('\n3. Récupération du CSRF token...');
    const csrfResponse = await fetch('http://localhost:3000/api/auth/csrf');
    const csrfData = await csrfResponse.json();
    console.log('CSRF Token:', csrfData.csrfToken ? 'Disponible' : 'Non disponible');
    
    console.log('\n✅ Tests terminés avec succès');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

testSession();