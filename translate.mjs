import fs from 'fs';
import translate from '@iamtraction/google-translate';

const FILE_PATH = 'C:/Users/rohit/OneDrive/Desktop/Kishan/src/services/i18n.ts';
const LANGUAGES = ['te', 'ta', 'mr', 'gu', 'kn', 'ml', 'pa', 'or', 'ur', 'as'];

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function processTranslations() {
  const content = fs.readFileSync(FILE_PATH, 'utf-8');
  
  const pattern = /([ \t]+)([a-zA-Z0-9_]+):\s*\{\s*([^}]*?)\s*\}/gs;
  
  const matches = [...content.matchAll(pattern)];
  console.log(`Found ${matches.length} potential translation objects.`);

  let newContent = "";
  let lastEnd = 0;
  let successCount = 0;

  for (const match of matches) {
    newContent += content.slice(lastEnd, match.index);
    const indent = match[1];
    const key = match[2];
    const inner = match[3];
    
    if (inner.includes('te:')) {
      newContent += match[0];
      lastEnd = match.index + match[0].length;
      continue;
    }
    
    let enTextMatch = inner.match(/en:\s*'([^']*)'/);
    if (!enTextMatch) {
      enTextMatch = inner.match(/en:\s*"([^"]*)"/);
    }
    
    if (enTextMatch) {
      const enText = enTextMatch[1].replace(/\\'/g, "'").replace(/\\"/g, '"');
      console.log(`Translating [${successCount+1}]: ${key}`);
      
      const promises = LANGUAGES.map(async (lang) => {
        try {
          const res = await translate(enText, { from: 'en', to: lang });
          return `\n${indent}  ${lang}: '${res.text.replace(/'/g, "\\'")}',`;
        } catch (e) {
          console.error(`Error for ${lang}:`, e.message);
          return `\n${indent}  ${lang}: '${enText.replace(/'/g, "\\'")}',`;
        }
      });

      const translatedLines = await Promise.all(promises);
      const added = translatedLines.join('');
      
      newContent += `${indent}${key}: {\n${indent}  ${inner.trim()}${added}\n${indent}}`;
      successCount++;
      await delay(100);
    } else {
      newContent += match[0];
    }
    
    lastEnd = match.index + match[0].length;
  }
  
  newContent += content.slice(lastEnd);
  fs.writeFileSync(FILE_PATH, newContent, 'utf-8');
  console.log(`Translations completed! Translated ${successCount} keys.`);
}

processTranslations().catch(console.error);
