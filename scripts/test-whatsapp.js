#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// ============================================================
// TEST RAPPEL WHATSAPP — DJOLA TIKTAK
// ------------------------------------------------------------
// Vérifie ta configuration Twilio WhatsApp AVANT de la mettre
// en production sur Vercel.
//
// UTILISATION (depuis la racine du repo) :
//   node scripts/test-whatsapp.js
//
// Les identifiants sont lus depuis le fichier .env.local
// (copie .env.example → .env.local et remplis les valeurs).
//
// ⚠️ RAPPEL SANDBOX : le numéro destinataire doit d'abord
// envoyer "join <code>" au +1 415 523 8886 (code visible dans
// la console Twilio → Messaging → Try it out → Send a WhatsApp
// message) — sinon Twilio répond l'erreur 63016.
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

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM = process.env.TWILIO_WHATSAPP_FROM || '+14155238886';

// Numéro destinataire : 1er argument CLI, sinon .env.local, sinon DEMANDE
const TO = process.argv[2] || process.env.TEST_WHATSAPP_TO;

console.log('════════════════════════════════════════════════');
console.log('  TEST RAPPEL WHATSAPP — DJOLA TIKTAK');
console.log('════════════════════════════════════════════════\n');

// ---------- Vérification de la configuration ----------
let ok = true;
if (!SID) { console.log('❌ TWILIO_ACCOUNT_SID manquant (Account SID Twilio)'); ok = false; }
else console.log(`✅ Account SID : ${SID.slice(0, 6)}${'•'.repeat(26)}${SID.slice(-4)}`);
if (!TOKEN) { console.log('❌ TWILIO_AUTH_TOKEN manquant (Auth Token Twilio)'); ok = false; }
else console.log(`✅ Auth Token : ${'•'.repeat(28)}${TOKEN.slice(-4)}`);
if (!FROM) { console.log('❌ TWILIO_WHATSAPP_FROM manquant (ex : +14155238886)'); ok = false; }
else console.log(`✅ Émetteur   : whatsapp:${FROM}`);
if (!TO) {
  console.log('\n❌ Numéro destinataire manquant.');
  console.log('   → Relance avec : node scripts/test-whatsapp.js +2376XXXXXXXX');
  console.log('   (ou ajoute TEST_WHATSAPP_TO=+2376XXXXXXXX dans .env.local)');
  process.exit(1);
} else {
  console.log(`✅ Destinataire : whatsapp:${TO}`);
}
if (!ok) {
  console.log('\n👉 Remplis les 3 variables TWILIO_* dans .env.local');
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

// ---------- Appel API Twilio (même code que le provider) ----------
(async () => {
  console.log('\n⏳ Envoi en cours…\n');
  try {
    const body = new URLSearchParams({
      To: `whatsapp:${TO}`,
      From: `whatsapp:${FROM}`,
      Body: message,
    });

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${SID}:${TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.log('❌ ÉCHEC — Twilio a répondu une erreur :\n');
      console.log(`   Code ${data?.code || res.status} : ${data?.message || 'Erreur inconnue'}\n`);
      if (data?.code === 63016) {
        console.log('💡 CAUSE PROBABLE (sandbox) : le destinataire n\'a pas rejoint le sandbox.');
        console.log('   → Ouvre WhatsApp, envoie "join <ton-code>" au +1 415 523 8886');
        console.log('     (code visible dans la console Twilio → Messaging → Try it out)');
        console.log('   → Puis relance ce test.');
      } else if (data?.code === 20003) {
        console.log('💡 CAUSE PROBABLE : Account SID ou Auth Token incorrect.');
        console.log('   → Vérifie dans console.twilio.com → Dashboard.');
      } else if (data?.code === 21211) {
        console.log('💡 CAUSE PROBABLE : numéro destinataire invalide.');
        console.log('   → Utilise le format international : +2376XXXXXXXX');
      }
      process.exit(1);
    }

    console.log('✅ SUCCÈS ! Message WhatsApp envoyé.');
    console.log(`   Message SID : ${data.sid}`);
    console.log(`   Statut Twilio : ${data.status} (queued → sent)`);
    console.log('\n👉 Vérifie WhatsApp sur le téléphone du destinataire.');
    console.log('   (Si rien n\'arrive : le numéro a-t-il bien rejoint le sandbox ?)');
  } catch (err) {
    console.log(`❌ Erreur réseau : ${err.message}`);
    process.exit(1);
  }
})();
