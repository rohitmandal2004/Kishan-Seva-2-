import fs from 'fs';
import translate from '@iamtraction/google-translate';

const FILE_PATH = 'C:/Users/rohit/OneDrive/Desktop/Kishan/src/services/i18n.ts';
const LANGUAGES = ['te', 'ta', 'mr', 'gu', 'kn', 'ml', 'pa', 'or', 'ur', 'as'];
const DELIMITER = '\n\n===XXX===\n\n';
const REGEX_DELIM = /\s*===XXX===\s*/;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function processTranslations() {
  const content = fs.readFileSync(FILE_PATH, 'utf-8');
  
  // Find all keys
  const pattern = /([ \t]+)([a-zA-Z0-9_]+):\s*\{\s*([^}]*?)\s*\}/gs;
  const matches = [...content.matchAll(pattern)];
  console.log(`Found ${matches.length} potential translation objects.`);

  const untranslatedMatches = [];
  
  for (const match of matches) {
    const inner = match[3];
    if (inner.includes('te:')) {
      continue; // already translated
    }
    
    let enTextMatch = inner.match(/en:\s*'([^']*)'/);
    if (!enTextMatch) enTextMatch = inner.match(/en:\s*"([^"]*)"/);
    
    if (enTextMatch) {
      untranslatedMatches.push({
        match,
        enText: enTextMatch[1].replace(/\\'/g, "'").replace(/\\"/g, '"'),
        indent: match[1],
        key: match[2],
        inner: match[3],
        translations: {}
      });
    }
  }

  console.log(`Found ${untranslatedMatches.length} keys to translate.`);

  // We batch into groups of 10
  const BATCH_SIZE = 10;
  for (const lang of LANGUAGES) {
    console.log(`\nTranslating to ${lang}...`);
    
    for (let i = 0; i < untranslatedMatches.length; i += BATCH_SIZE) {
      const batch = untranslatedMatches.slice(i, i + BATCH_SIZE);
      const combinedText = batch.map(b => b.enText).join(DELIMITER);
      
      try {
        const targetLang = lang === 'or' ? 'or' : (lang === 'as' ? 'as' : lang); 
        const res = await translate(combinedText, { from: 'en', to: targetLang });
        
        // Split back
        // Some languages might add spaces around the delimiter. 
        // e.g. === XXX ===
        const splitPattern = /\s*=== ?XXX ?===\s*/;
        const translatedArray = res.text.split(splitPattern);
        
        if (translatedArray.length === batch.length) {
          batch.forEach((b, idx) => {
            b.translations[lang] = translatedArray[idx].trim().replace(/'/g, "\\'");
          });
        } else {
          console.warn(`[!] Delimiter mismatch for ${lang} batch ${i}. Expected ${batch.length}, got ${translatedArray.length}`);
          // Fallback to sequential for this batch
          for (const b of batch) {
            try {
              const singleRes = await translate(b.enText, { from: 'en', to: targetLang });
              b.translations[lang] = singleRes.text.replace(/'/g, "\\'");
              await delay(200);
            } catch (e) {
              b.translations[lang] = b.enText.replace(/'/g, "\\'");
            }
          }
        }
      } catch (e) {
        console.error(`Error in batch ${i} for ${lang}:`, e.message);
        batch.forEach(b => b.translations[lang] = b.enText.replace(/'/g, "\\'"));
      }
      
      await delay(500); // delay between batches
    }
  }

  // Now rebuild the file
  let newContent = "";
  let lastEnd = 0;

  for (const match of matches) {
    newContent += content.slice(lastEnd, match.index);
    
    const utm = untranslatedMatches.find(u => u.match.index === match.index);
    if (utm) {
      let added = "";
      for (const lang of LANGUAGES) {
        if (utm.translations[lang]) {
          added += `\n${utm.indent}  ${lang}: '${utm.translations[lang]}',`;
        }
      }
      newContent += `${utm.indent}${utm.key}: {\n${utm.indent}  ${utm.inner.trim()}${added}\n${utm.indent}}`;
    } else {
      newContent += match[0];
    }
    lastEnd = match.index + match[0].length;
  }
  
  newContent += content.slice(lastEnd);
  fs.writeFileSync(FILE_PATH, newContent, 'utf-8');
  console.log("Translations completed!");
}

processTranslations().catch(console.error);
