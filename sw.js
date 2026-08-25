/* Cache hors ligne de Gascourt.
 *
 * Les relevés se prennent devant les compteurs, souvent dans une cave ou une
 * dépendance où le téléphone n'a pas de réseau. L'app doit donc s'ouvrir et
 * fonctionner sans lui. Elle tient en un fichier, on le garde en réserve.
 *
 * Deux règles, et pas une de plus :
 *
 *  - ce qui vient d'ailleurs n'est jamais mis en cache. L'appel au dépôt de
 *    données doit toujours passer par le réseau, sinon on synchroniserait avec
 *    une réponse d'hier.
 *
 *  - la version en réserve est servie tout de suite, puis rafraîchie en
 *    arrière-plan. L'app s'ouvre instantanément et la mise à jour est prise au
 *    lancement suivant, ce qui vaut mieux qu'une attente au démarrage.
 */
const VERSION = 'e1b0075079bf';
const RESERVE = 'gascourt-' + VERSION;
const PIECES = ['./', './index.html', './manifest.webmanifest',
                './icone-180.png?v=2e06db85', './icone-192.png?v=2e06db85', './icone-512.png?v=2e06db85'];

/* On demande ces pièces au réseau sans passer par le cache ordinaire du
   navigateur. Sans cela une réserve neuve pourrait se remplir de vieux
   fichiers : elle est neuve, ils ne le sont pas, et rien ne le signale. */
self.addEventListener('install', e => {
  e.waitUntil(caches.open(RESERVE)
    .then(c => c.addAll(PIECES.map(p => new Request(p, {cache: 'reload'}))))
    .then(()=> self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(noms => Promise.all(noms.filter(n => n !== RESERVE).map(n => caches.delete(n))))
    .then(()=> self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if(e.request.method !== 'GET' || u.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then(garde => {
      const frais = fetch(e.request).then(r => {
        if(r && r.ok) caches.open(RESERVE).then(c => c.put(e.request, r.clone()));
        return r;
      }).catch(()=> garde);
      return garde || frais;
    })
  );
});
