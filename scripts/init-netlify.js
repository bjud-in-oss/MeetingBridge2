import fs from 'fs';
import path from 'path';

// Konfiguration för Netlify Headers
// Detta tillåter 'screen-wake-lock' vilket annars blockeras av webbläsarens standardpolicy.
const netlifyConfig = `
[[headers]]
  for = "/*"
  [headers.values]
    Permissions-Policy = "screen-wake-lock=*, microphone=*, camera=*, geolocation=*"
    Cache-Control = "public, max-age=0, must-revalidate"
`;

try {
  // Skriv filen till roten av projektet (ett steg upp från /scripts om det körs därifrån, annars cwd)
  // Vi utgår från process.cwd() för att vara säkra i byggmiljöer.
  const outputPath = path.join(process.cwd(), 'netlify.toml');
  
  fs.writeFileSync(outputPath, netlifyConfig.trim());
  console.log('✅ netlify.toml har skapats framgångsrikt med Permissions-Policy headers.');
  console.log('   Mål:', outputPath);
} catch (error) {
  console.error('❌ Misslyckades med att skapa netlify.toml:', error);
  process.exit(1);
}
