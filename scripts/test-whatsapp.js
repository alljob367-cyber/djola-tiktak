#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// ============================================================
// TEST RAPPEL WHATSAPP — DJOLA TIKTAK
// ------------------------------------------------------------
// Vérifie ta configuration WhatsApp (Meta Cloud API OU Twilio)
// AVANT de la mettre en production sur Vercel.
//
// UTILISATION (depuis la racine du repo) :
//   node scripts/test-whatsapp.js
//
// Les identifiants sont lus depuis le fichier .env.local
// (copie .env.example → .env.local et remplis les valeurs).
//
// DÉTECTION AUTOMATIQUE :
//   - WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID définis → test Meta
//   - sinon TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN définis → test Twilio
//   - sinon erreur.
//
// ⚠️ FENÊTRE 24H (Meta) : en mode TEST, le destinataire n'a jamais
// écrit au numéro Meta → message libre refusé (erreur 131047).
//   1. Envoie d'abord "Salut" au numéro WhatsApp Business depuis le
//      téléphone du destinataire (ouvre la fenêtre 24h), puis relance.
//   2. OU configure WHATSAPP_TEMPLATE_NAME (template UTILITY approuvé).
//
// ⚠️ SANDBOX TWILIO : le destinataire doit d'abord envoyer
// "join <code>" au +1 415 523 8886 (code dans la console Twilio).
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

// ---------- Détection du fournisseur ----------
const WA_TOKEN = process.env.WHATSAPP_TOKEN;
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WA_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const metaConfigured = Boolean(WA_TOKEN && WA_PHONE_ID);

const SID = process.env.TWILIO_ACCOUNT_SID;
const TW_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TW_FROM = process.env.TWILIO_WHATSAPP_FROM || '+14155238886';
const twilioConfigured = Boolean(SID && TW_TOKEN);

const BACKEND = metaConfigured ? 'meta' : twilioConfigured ? 'twilio' : null;

// Numéro destinataire : 1er argument CLI, sinon .env.local
const TO = (process.argv[2] || process.env.TEST_WHATSAPP_TO || '').replace(/[^0-9+]/g, '');

console.log('════════════════════════════════════════════════');
console.log('  TEST RAPPEL WHATSAPP — DJOLA TIKTAK');
console.log('════════════════════════════════════════════════\n');

if (!BACKEND) {
  console.log('❌ Aucun fournisseur WhatsApp configuré.');
  console.log('   Définis soit :');
  console.log('   • WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID (Meta Cloud API, recommandé)');
  console.log('   • TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN (fallback Twilio)');
  console.log('   (voir .env.example pour la documentation complète)');
  process.exit(1);
}

if (metaConfigured && twilioConfigured) {
  console.log('ℹ️  Les deux fournisseurs sont configurés → Meta prioritaire (test en cours).\n');
}

let ok = true;

if (BACKEND === 'meta') {
  console.log('🔌 Fournisseur détecté : META CLOUD API');
  console.log(`✅ Token      : ${WA_TOKEN.slice(0, 6)}${'•'.repeat(20)}${WA_TOKEN.slice(-4)}`);
  console.log(`✅ Phone ID   : ${WA_PHONE_ID}`);
  console.log(`✅ API version: ${WA_VERSION}`);
} else {
  console.log('🔌 Fournisseur détecté : TWILIO WHATSAPP');
  console.log(`✅ Account SID : ${SID.slice(0, 6)}${'•'.repeat(26)}${SID.slice(-4)}`);
  console.log(`✅ Auth Token  : ${'•'.repeat(28)}${TW_TOKEN.slice(-4)}`);
  console.log(`✅ Émetteur    : whatsapp:${TW_FROM}`);
  console.log('⚠️  SANDBOX : le destinataire doit avoir envoyé "join <code>" au +1 415 523 8886');
}

if (!TO) {
  console.log('\n❌ Numéro destinataire manquant.');
  console.log('   → Relance avec : node scripts/test-whatsapp.js +2376XXXXXXXX');
  console.log('   (ou ajoute TEST_WHATSAPP_TO=+2376XXXXXXXX dans .env.local)');
  process.exit(1);
} else {
  console.log(`✅ Destinataire : ${TO}`);
}
if (!ok) process.exit(1);

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

// ---------- Envoi (même code que les providers) ----------
(async () => {
  console.log('\n⏳ Envoi en cours…\n');
  try {
    let res;

    if (BACKEND === 'meta') {
      res = await fetch(`https://graph.facebook.com/${WA_VERSION}/${WA_PHONE_ID}/messages`, {
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
      });
    } else {
      const body = new URLSearchParams({
        To: `whatsapp:${TO}`,
        From: `whatsapp:${TW_FROM}`,
        Body: message,
      });
      res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${SID}:${TW_TOKEN}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.log(`❌ ÉCHEC — ${BACKEND === 'meta' ? 'Meta' : 'Twilio'} a répondu une erreur :\n`);

      if (BACKEND === 'meta') {
        const errCode = data?.error?.code;
        const details = data?.error?.error_data?.details || '';
        console.log(`   Code ${errCode || res.status} : ${data?.error?.message || 'Erreur inconnue'}\n`);
        if (res.status === 401 || errCode === 190) {
          console.log('💡 Jeton invalide ou expiré → génère un jeton PERMANENT');
          console.log('   (Business Settings → System Users → whatsapp_business_messaging)');
        } else if (errCode === 131047 || /re-exchange|24h|fenêtre/i.test(details)) {
          console.log('💡 Fenêtre de 24h fermée (message libre refusé) :');
          console.log('   → le destinataire envoie "Salut" au numéro Business, relance sous 24h');
          console.log('   → OU configure WHATSAPP_TEMPLATE_NAME (template UTILITY approuvé)');
        } else if (errCode === 131030) {
          console.log('💡 Destinataire non autorisé (mode développement) :');
          console.log('   → ajoute son numéro dans Meta App Dashboard → WhatsApp → Destinataires');
        } else if (errCode === 100 || /phone.number.id/i.test(details)) {
          console.log('💡 WHATSAPP_PHONE_NUMBER_ID incorrect (ce n\'est PAS le numéro de téléphone)');
        }
      } else {
        const code = data?.code;
        console.log(`   Code ${code || res.status} : ${data?.message || 'Erreur inconnue'}\n`);
        if (code === 63016) {
          console.log('💡 SANDBOX : le destinataire n\'a pas rejoint le sandbox.');
          console.log('   → Envoie "join <ton-code>" au +1 415 523 8886 (code dans la console Twilio)');
        } else if (code === 20003) {
          console.log('💡 Account SID ou Auth Token incorrect → console.twilio.com → Dashboard');
        } else if (code === 21211) {
          console.log('💡 Numéro destinataire invalide → format international : +2376XXXXXXXX');
        }
      }
      process.exit(1);
    }

    console.log('✅ SUCCÈS ! Message WhatsApp envoyé.');
    if (BACKEND === 'meta') {
      console.log(`   Message ID : ${data?.messages?.[0]?.id}`);
    } else {
      console.log(`   Message SID : ${data.sid}`);
      console.log(`   Statut : ${data.status} (queued → sent)`);
    }
    console.log('\n👉 Vérifie WhatsApp sur le téléphone du destinataire.');
  } catch (err) {
    console.log(`❌ Erreur réseau : ${err.message}`);
    process.exit(1);
  }
})();
