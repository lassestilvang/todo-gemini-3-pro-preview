import fs from 'fs';
import path from 'path';

function fixFile(filePath: string) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Convert wrapper back to straightforward block
    content = content.replace(/await db\.transaction\(async \(tx\) => \{/g, '');
    content = content.replace(/const subtask = await db\.transaction\(async \(tx\) => \{/g, 'const subtask = await (async () => {');
    content = content.replace(/const task = await db\.transaction\(async \(tx\) => \{/g, 'const task = await (async () => {');
    content = content.replace(/tx\./g, 'db.');

    fs.writeFileSync(filePath, content);
}

const files = [
    'src/lib/actions/dependencies.ts',
    'src/lib/actions/google-tasks.ts',
    'src/lib/actions/gamification.ts',
    'src/lib/actions/todoist.ts',
    'src/lib/actions/tasks/subtasks.ts',
    'src/lib/actions/reminders.ts'
];

for(const file of files) {
    fixFile(file);
}
