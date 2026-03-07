import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'node_modules/calendarkit-pro/dist');

function replaceInFile(filePath, search, replaceWith) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    if (typeof search === 'string') {
        content = content.split(search).join(replaceWith);
    } else {
        content = content.replace(search, replaceWith);
    }

    fs.writeFileSync(filePath, content, 'utf8');
}

const files = ['index.js', 'index.mjs'];

files.forEach(file => {
    const fullPath = path.join(dir, file);
    console.log(`Patching ${file}...`);

    // 1. 24-Hour Clock Patch
    // Change: locale?.code === 'fr' -> (locale?.code === 'fr' || locale?.is24Hour)
    replaceInFile(fullPath, /locale\?\.code === ['"]fr['"]/g, "(locale?.code === 'fr' || locale?.is24Hour)");

    // 2. Dark Mode Contrast - Global text-white replacement
    // text-white -> text-primary-foreground
    replaceInFile(fullPath, /text-white/g, "text-primary-foreground");

    // 3. MiniCalendar Active Day (Selected)
    // bg-[#DAF9FF] text-primary -> bg-primary text-primary-foreground
    replaceInFile(fullPath, /bg-\[#DAF9FF\] text-primary/g, "bg-primary text-primary-foreground");
    // Also handle cases where they might be separated or in different order if needed, 
    // but based on source it's 'scale-105 bg-[#DAF9FF] text-primary'
    replaceInFile(fullPath, /bg-\[#DAF9FF\]/g, "bg-primary");

    // 4. Backgrounds (Hardcoded light grays)
    // bg-[#F9F9FB] -> bg-muted/5
    replaceInFile(fullPath, /bg-\[#F9F9FB\]/g, "bg-muted/5");
    // bg-[#14141705] -> bg-muted/5
    replaceInFile(fullPath, /bg-\[#14141705\]/g, "bg-muted/5");

    // 5. "New Task" button specific hex if still present
    replaceInFile(fullPath, /bg-\[#7FDDF0\]/g, "bg-primary text-primary-foreground");
});

console.log('Calendar kit patches applied successfully.');
