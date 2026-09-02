#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// ============================================================
// TEST RAPPEL WHATSAPP — DJOLA TIKTAK
// ------------------------------------------------------------
// Vérifie ta configuration Meta WhatsApp Cloud API AVANT de la
// mettre en production sur Vercel (rappels + bot de réservation).
//
// UTILISATION (depuis la racine du repo) :
//   node scripts/test-whatsapp.js
//
// Les identifiants sont lus depuis le fichier .env.local
// (copie .env.example → .env.local et remplis les valeurs).
//
// ⚠️ FENÊTRE 24H : en mode TEST, ton numéro n'a jamais écrit au
// numéro Meta → le message libre est refusé (erreur 131047).
// Deux solutions :
//   1. Envoie d'abord "Salut" au numéro WhatsApp Business depuis
//      le téléphone du destinataire (ouvre la fenêtre 24h), puis
//      relance ce test dans les 24h.
//   2. Configure WHATSAPP_TEMPLATE_NAME avec un template approuvé
//      de catégorie UTILITY (voir DEPLOYMENT.md Étape 7bis).
// ============================================================

const fs = require('fs');
const path = require('path');

// ---------- Charger .env.local manuellement (sans dotenv) ----------
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const WA_TOKEN = process.env.WHATSAPP_TOKEN;
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WA_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';

// Numéro destinataire : 1er argument CLI, sinon .env.local, sinon DEMANDE
const TO = (process.argv[2] || process.env.TEST_WHATSAPP_TO || '').replace(/\D/g, '');

console.log('════════════════════════════════════════════════');
console.log('  TEST RAPPEL WHATSAPP (Meta Cloud API) — DJOLA TIKTAK');
console.log('════════════════════════════════════════════════\n');

// ---------- Vérification de la configuration ----------
let ok = true;
if (!WA_TOKEN) { console.log('❌ WHATSAPP_TOKEN manquant (jeton permanent Meta)'); ok = false; }
else console.log(`✅ Token      : ${WA_TOKEN.slice(0, 6)}${'•'.repeat(20)}${WA_TOKEN.slice(-4)}`);
if (!WA_PHONE_ID) { console.log('❌ WHATSAPP_PHONE_NUMBER_ID manquant'); ok = false; }
else console.log(`✅ Phone ID   : ${WA_PHONE_ID}`);
console.log(`✅ API version: ${WA_VERSION}`);

if (!TO) {
  console.log('\n❌ Numéro destinataire manquant.');
  console.log('   → Relance avec : node scripts/test-whatsapp.js 2376XXXXXXXX');
  console.log('   (ou ajoute TEST_WHATSAPP_TO=2376XXXXXXXX dans .env.local)');
  process.exit(1);
} else {
  console.log(`✅ Destinataire : ${TO}`);
}
if (!ok) {
  console.log('\n👉 Remplis WHATSAPP_TOKEN et WHATSAPP_PHONE_NUMBER_ID dans .env.local');
  console.log('   (voir .env.example pour la documentation complète)');
  process.exit(1);
}

// ---------- Message de test = même format que le vrai rappel ----------
const message = [
  '⏰ *Rappel de rendez-vous — Djola TikTak*',
  '',
  'Bonjour *Client Test*,',
  'Petit rappel : vous avez un rendez-vous *lundi 31 août à 09:00*.',
  '',
  '🏢 *Commerce* : Salon Test',
  '💅 *Prestation* : Coupe & soin',
  '💰 *Prix* : 5 000 FCFA',
  '',
  'Merci de votre confiance ! 🙏',
  '',
  '_Message envoyé via Djola TikTak_',
].join('\n');

// ---------- Appel API Meta (même code que le provider) ----------
(async () => {
  console.log('\n⏳ Envoi en cours…\n');
  try {
    const res = await fetch(
      `https://graph.facebook.com/${WA_VERSION}/${WA_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: TO,
          type: 'text',
          text: { preview_url: false, body: message },
        }),
      },
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.log('❌ ÉCHEC — Meta a répondu une erreur :\n');
      console.log(`   Code ${data?.error?.code || res.status} : ${data?.error?.message || 'Erreur inconnue'}\n`);

      const errCode = data?.error?.code;
      const errSubcode = data?.error?.error_data?.details || '';

      if (res.status === 401 || errCode === 190) {
        console.log('💡 CAUSE PROBABLE : jeton invalide ou expiré.');
        console.log('   → Business Settings → System Users → génère un jeton PERMANENT');
        console.log('     avec les permissions whatsapp_business_messaging.');
      } else if (errCode === 131047 || /re-exchange|24h|fenêtre/i.test(errSubcode)) {
        console.log('💡 CAUSE PROBABLE : fenêtre de 24h fermée (message libre refusé).');
        console.log('   → Le destinataire envoie "Salut" au numéro WhatsApp Business,');
        console.log('     puis relance ce test dans les 24h.');
        console.log('   → OU configure un template approuvé (WHATSAPP_TEMPLATE_NAME).');
      } else if (errCode === 131030) {
        console.log('💡 CAUSE PROBABLE : le destinataire n\'est pas dans la liste autorisée.');
        console.log('   → En mode développement, ajoute son numéro dans');
        console.log('     Meta App Dashboard → WhatsApp → Destinataires du message.');
      } else if (errCode === 100 || /phone.number.id/i.test(errSubcode)) {
        console.log('💡 CAUSE PROBABLE : WHATSAPP_PHONE_NUMBER_ID incorrect.');
        console.log('   → Meta App Dashboard → WhatsApp → API Setup → copie le');
        console.log('     "Phone number ID" (ce n\'est PAS le numéro de téléphone).');
      }
      process.exit(1);
    }

    console.log('✅ SUCCÈS ! Message WhatsApp envoyé.');
    console.log(`   Message ID : ${data?.messages?.[0]?.id}`);
    console.log('\n👉 Vérifie WhatsApp sur le téléphone du destinataire.');
  } catch (err) {
    console.log(`❌ Erreur réseau : ${err.message}`);
    process.exit(1);
  }
})();
