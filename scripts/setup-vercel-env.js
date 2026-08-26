const args = process.argv.slice(2);
const TOKEN = args[0];
const PROJECT_ID = 'prj_oEADXE4kj6VN7Koos6GLabcH2RVN';

const envs = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    value: 'https://nfelepjqazglpqjpvctg.supabase.co',
    type: 'plain',
    target: ['production', 'preview', 'development'],
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZWxlcGpxYXpnbHBxanB2Y3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NTAzOTUsImV4cCI6MjEwMzIyNjM5NX0.yWqLde3tosdX-Dz5wzCy4DaHYAwYXJCBUGcYAMESbAg',
    type: 'plain',
    target: ['production', 'preview', 'development'],
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZWxlcGpxYXpnbHBxanB2Y3RnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY1MDM5NSwiZXhwIjoyMTAzMjI2Mzk1fQ.kgBrnKVvezKKhkTQWgBKuEsJ3g_n24MHs4MuXTN8FLo',
    type: 'encrypted',
    target: ['production', 'preview', 'development'],
  },
  {
    key: 'CRON_SECRET',
    value: 'djola-tiktak-cron-secret-2026',
    type: 'encrypted',
    target: ['production', 'preview', 'development'],
  },
  {
    key: 'NEXT_PUBLIC_APP_URL',
    value: 'https://djola-tiktak.vercel.app',
    type: 'plain',
    target: ['production', 'preview', 'development'],
  },
  {
    key: 'ADMIN_EMAILS',
    value: '',
    type: 'plain',
    target: ['production', 'preview', 'development'],
  },
];

async function main() {
  for (const env of envs) {
    const res = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(env),
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`OK: ${env.key}`);
    } else {
      console.error(`FAIL: ${env.key} - ${JSON.stringify(data)}`);
    }
  }
}

main();
