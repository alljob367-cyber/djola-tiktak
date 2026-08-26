import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function generate(prompt: string, size: string, filename: string) {
  const zai = await ZAI.create();
  console.log(`Generating ${filename}...`);
  const response = await zai.images.generations.create({ prompt, size });
  const buffer = Buffer.from(response.data[0].base64, 'base64');
  fs.writeFileSync(`/home/z/my-project/download/${filename}`, buffer);
  console.log(`OK: ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
}

async function main() {
  await sleep(3000);
  await generate(
    'Full website landing page screenshot for Djola TikTak a SaaS appointment booking app for African hair salons barbers and beauty services. Dark theme background color #0a0a0a with lime green #c8ff00 accents. Top hero section with headline text and a lime green CTA button. Below the hero: a grid of 6 feature cards with icons showing online booking, calendar management, client database, automatic SMS reminders, revenue tracking, availability settings. A floating smartphone mockup in the center showing the app interface. Modern SaaS landing page design, professional, high quality',
    '1344x768',
    'landing-page-v1-hero-bold.png'
  );

  await sleep(5000);
  await generate(
    'Full website landing page screenshot for Djola TikTak appointment booking SaaS platform for African local businesses. Dark charcoal background with vibrant lime green accents. Left side shows a photo of an African barber in a modern salon checking a tablet with a booking calendar on screen. Right side has headline text, key metrics showing 500 plus providers and 10000 plus appointments, and testimonial quote cards from satisfied business owners. Feature strip at bottom with icons for SMS WhatsApp email notification channels. Professional dark theme marketing page design, high quality',
    '1344x768',
    'landing-page-v2-social-proof.png'
  );

  await sleep(5000);
  await generate(
    'Full website landing page screenshot for Djola TikTak booking app for African service providers. Dark background with lime green #c8ff00 accent color. Layout shows a 4-step flow diagram on the left with numbered steps: 1 Create profile 2 Add services 3 Share booking link 4 Receive appointments, each with icons and arrows connecting them. Right side shows a realistic smartphone mockup displaying the booking interface with calendar and service list. Bottom section shows a pricing comparison table with 3 columns Free Pro and Enterprise plans. Modern SaaS product page design, high quality UI',
    '1344x768',
    'landing-page-v3-app-showcase.png'
  );

  console.log('\nAll landing pages generated!');
}

main().catch(console.error);
