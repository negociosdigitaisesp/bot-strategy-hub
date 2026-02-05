// Script to fix currency issue in all remaining bot hooks
// This script adds account to useDeriv() and replaces hardcoded 'USD' with account?.currency || 'USD'

const fs = require('fs');
const path = require('path');

const hooksDir = 'd:\\NEW MILLION\\bot-strategy-hub\\src\\hooks';

const filesToFix = [
    'useStatisticalBot.ts',
    'useSpikeSensor.ts',
    'useOneShotSniper.ts',
    'useGainBot.ts',
    'useEvenOddSensor.ts',
    'useBotXtreme.ts',
    'useBotSX.ts',
    'useBotSpeed.ts',
    'useBotOmega.ts',
    'useBotDoubleCuentas.ts'
];

filesToFix.forEach(filename => {
    const filePath = path.join(hooksDir, filename);
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix 1: Add account to useDeriv destructuring
    content = content.replace(
        /const\s+{\s*socket(?:,\s*\w+)*\s*}\s*=\s*useDeriv\(\);/g,
        (match) => {
            if (match.includes('account')) return match; // Already fixed
            return match.replace('} = useDeriv()', ', account } = useDeriv()');
        }
    );

    // Fix 2: Replace hardcoded currency: 'USD' with dynamic currency
    // Find the buy request and add currency variable before it
    content = content.replace(
        /(const\s+buyRequest\s*=\s*{[^}]*parameters:\s*{[^}]*)(currency:\s*'USD',)/g,
        (match, before, currencyLine) => {
            // Add currency variable declaration before buyRequest
            const indent = before.match(/^(\s*)/)[1];
            const currencyDecl = `${indent}const currency = account?.currency || 'USD';\n${indent}`;
            return before.replace(/(const\s+buyRequest)/, `const currency = account?.currency || 'USD';\n${indent}$1`)
                .replace(currencyLine, 'currency: currency,');
        }
    );

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${filename}`);
});

console.log('\n🎉 All files fixed!');
