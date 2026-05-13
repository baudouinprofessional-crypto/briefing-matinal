const nodemailer = require('nodemailer');

const GEMINI_KEY  = process.env.GEMINI_API_KEY;
const EMAIL_TO    = process.env.EMAIL_TO;
const GMAIL_USER  = process.env.GMAIL_USER;
const GMAIL_PASS  = process.env.GMAIL_APP_PASSWORD;

async function genererBriefing() {
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const prompt = `Tu es un expert en newsletters premium. Génère un email HTML complet et magnifique pour le briefing matinal du ${today}.

RÈGLES ABSOLUES :
- Toutes les actualités doivent venir des dernières 24-48h maximum — utilise Google Search pour vérifier
- Sources fiables uniquement : Reuters, Bloomberg, Les Echos, Le Monde, Le Figaro, TechCrunch, The Verge, Hodinkee, DPReview
- Jamais de vieux articles, forums ou sources non vérifiées
- CSS inline uniquement (pas de balise style séparée), largeur max 600px
- Ne pas inclure les balises html, head ou body — commence directement par le contenu

STRUCTURE DU MAIL (dans cet ordre) :

HEADER
Un grand titre "Briefing du ${today}" avec fond noir et texte blanc, centré, élégant.

CITATION DU JOUR
Une vraie citation inspirante d'un entrepreneur, sportif ou leader connu, avec son nom en dessous. Fond gris très clair, texte en italique.

MARCHÉS FINANCIERS
Le cours actuel du SP500 en euros et de l'Ethereum en euros avec la variation du jour en vert si positif, rouge si négatif. Présente ça dans deux cases côte à côte, propres et lisibles.

L'ACTU FINANCE À NE PAS LOUPER
Un grand titre accrocheur sur LA news finance la plus importante du moment, puis 4 actualités finance, bourse ou crypto des dernières 24h. Pour chaque actu : un titre en gras, 2 lignes de contexte, et un lien cliquable vers la source.

4 ACTUS MONDE
Les 4 événements internationaux les plus importants des dernières 24h. Pour chaque : titre en gras, 2-3 lignes d'explication claire, lien source. Séparés par une fine ligne grise.

4 ACTUS FRANCE
Les 4 nouvelles françaises incontournables du jour. Même format que les actus monde.

NOUVEAUTÉS TECH, MONTRES ET PHOTO
Les dernières sorties et annonces intéressantes : nouvelles montres, appareils photo, gadgets tech, électronique. Cherche sur The Verge, Hodinkee, DPReview. Présente 3 à 5 produits avec un titre et 2 lignes de description chacun.

STARTUP DU JOUR
Une startup remarquable du moment : nouvelle levée de fonds, lancement de produit innovant, ou success story. Son nom, son pitch en une phrase, ce qui la rend intéressante, et un lien.

LEICA STREET PHOTO DU JOUR
Cherche sur le site leica-camera.com/en-INT/photography/leica-stories la dernière photo de street photography publiée. Affiche l'image, le nom du photographe, et une courte description. Si tu trouves l'URL directe de l'image, intègre-la avec une balise img.

STYLE CSS INLINE À UTILISER :
- Fond général : #ffffff
- Texte principal : #1a1a1a
- Titres de section : background #1a1a1a, color #ffffff, padding 10px 16px, font-family Arial, font-size 12px, letter-spacing 0.1em, text-transform uppercase
- Accent et liens : #CC0000
- Cards actualités : border-left 3px solid #CC0000, padding-left 14px, margin 12px 0
- Images : width 100%, max-width 540px, border-radius 4px, margin 8px 0
- Police partout : Arial, sans-serif
- Container principal : max-width 600px, margin 0 auto, padding 20px

Génère uniquement le HTML. Commence directement par le contenu, sans aucune explication autour.`;

  const reponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 4000 }
      })
    }
  );

  const data = await reponse.json();

  if (data.error) {
    throw new Error('Erreur Gemini : ' + data.error.message);
  }

  const htmlBrut = data.candidates[0].content.parts
    .filter(p => p.text)
    .map(p => p.text)
    .join('\n');

  const htmlNettoye = htmlBrut
    .replace(/```html/g, '')
    .replace(/```/g, '')
    .trim();

  return htmlNettoye;
}

async function envoyerMail(contenuHtml) {
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const transporteur = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS
    }
  });

  await transporteur.sendMail({
    from: `Mon Briefing <${GMAIL_USER}>`,
    to: EMAIL_TO,
    subject: `☀️ Briefing du ${today}`,
    html: contenuHtml
  });

  console.log('Mail envoyé avec succès à', EMAIL_TO);
}

async function lancer() {
  if (!GEMINI_KEY)  { console.error('GEMINI_API_KEY manquant');    process.exit(1); }
  if (!EMAIL_TO)    { console.error('EMAIL_TO manquant');           process.exit(1); }
  if (!GMAIL_USER)  { console.error('GMAIL_USER manquant');         process.exit(1); }
  if (!GMAIL_PASS)  { console.error('GMAIL_APP_PASSWORD manquant'); process.exit(1); }

  console.log('Génération du briefing en cours...');
  const html = await genererBriefing();

  console.log('Envoi du mail...');
  await envoyerMail(html);

  console.log('Terminé.');
}

lancer().catch(err => {
  console.error('Erreur :', err.message);
  process.exit(1);
});
