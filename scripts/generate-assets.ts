import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const outputDir = '/home/z/my-project/download';

async function generate(prompt: string, size: string, filename: string) {
  const zai = await ZAI.create();
  console.log(`Generating ${filename}...`);
  const response = await zai.images.generations.create({ prompt, size });
  const buffer = Buffer.from(response.data[0].base64, 'base64');
  const outputPath = path.join(outputDir, filename);
  fs.writeFileSync(outputPath, buffer);
  console.log(`OK: ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
  return outputPath;
}

async function main() {
  // 1. Logo Djola TikTak
  const logoPromise = generate(
    'Professional minimalist logo for "Djola TikTak" a SaaS appointment booking app for African local service providers. Clean geometric design combining a calendar icon with an African pattern element. Primary color lime green #c8ff00 on dark charcoal background. Modern tech startup feel, flat design, no text, icon only, vector style, high quality, white background',
    '1024x1024',
    'djola-tiktak-logo.png'
  );

  // 2. Landing Page Visuel 1 — Hero Bold
  const lp1Promise = generate(
    'Full website landing page mockup for "Djola TikTak" a SaaS appointment booking app targeting African hair salons barbers and beauty services. Dark theme with lime green accents #c8ff00. Hero section at top with bold headline "Votre rendez-vous en un clic" and CTA button. Below: 6 feature cards showing online booking, calendar management, client management, automatic reminders, payment tracking, availability management. Mobile app mockup floating in center. Professional SaaS landing page, dark mode, high quality UI design screenshot',
    '1440x720',
    'landing-page-v1-hero-bold.png'
  );

  // 3. Landing Page Visuel 2 — Social Proof
  const lp2Promise = generate(
    'Full website landing page mockup for "Djola TikTak" appointment booking SaaS for African local businesses. Dark charcoal background with lime green #c8ff00 accents. Left side: smiling African barber in modern salon checking his tablet with booking calendar. Right side: headline text, statistics showing 500+ prestataires, 10000+ rendez-vous, testimonial cards from satisfied business owners. Feature strip at bottom with icons for SMS reminders, WhatsApp notifications, email confirmations. Professional marketing page, high quality web design',
    '1440x720',
    'landing-page-v2-social-proof.png'
  );

  // 4. Landing Page Visuel 3 — App Showcase
  const lp3Promise = generate(
    'Full website landing page mockup for "Djola TikTak" booking app. Dark theme #0a0a0a with vibrant lime #c8ff00 accents. Split layout: left shows a step-by-step flow diagram (1. Create profile 2. Add services 3. Share link 4. Receive bookings) with connected nodes and arrows. Right shows a realistic smartphone mockup displaying the booking interface with a calendar, service list, and confirmation screen. Below: pricing table with 3 columns (Free, Pro, Enterprise) and a row of trusted-by logos. Modern SaaS design, high quality, detailed UI',
    '1440x720',
    'landing-page-v3-app-showcase.png'
  );

  await Promise.all([logoPromise, lp1Promise, lp2Promise, lp3Promise]);
  console.log('\nAll images generated successfully!');
}

main().catch(console.error);
