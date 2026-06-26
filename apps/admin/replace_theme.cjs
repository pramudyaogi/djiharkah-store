const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/pages/ProductForm.jsx',
  'src/pages/OrderDetail.jsx',
  'src/pages/Settings.jsx'
];

const replacements = [
  { regex: /bg-zinc-950(?![\/\-])/g, replace: 'bg-white dark:bg-zinc-950' },
  { regex: /bg-zinc-950\/50/g, replace: 'bg-white/50 dark:bg-zinc-950/50' },
  { regex: /bg-zinc-900(?![\/\-])/g, replace: 'bg-gray-50 dark:bg-zinc-900' },
  { regex: /bg-zinc-900\/50/g, replace: 'bg-gray-50/50 dark:bg-zinc-900/50' },
  { regex: /bg-zinc-900\/40/g, replace: 'bg-white/80 dark:bg-zinc-900/40' },
  { regex: /bg-zinc-800(?![\/\-])/g, replace: 'bg-gray-200 dark:bg-zinc-800' },
  { regex: /bg-zinc-800\/20/g, replace: 'bg-gray-200/50 dark:bg-zinc-800/20' },
  { regex: /bg-zinc-700/g, replace: 'bg-gray-300 dark:bg-zinc-700' },
  { regex: /border-zinc-800(?![\/\-])/g, replace: 'border-gray-200 dark:border-zinc-800' },
  { regex: /border-zinc-800\/60/g, replace: 'border-gray-200 dark:border-zinc-800/60' },
  { regex: /border-zinc-800\/50/g, replace: 'border-gray-200 dark:border-zinc-800/50' },
  { regex: /border-zinc-700/g, replace: 'border-gray-300 dark:border-zinc-700' },
  { regex: /text-white(?![\/\-])/g, replace: 'text-gray-900 dark:text-white' },
  { regex: /text-zinc-100/g, replace: 'text-gray-900 dark:text-zinc-100' },
  { regex: /text-zinc-200/g, replace: 'text-gray-800 dark:text-zinc-200' },
  { regex: /text-zinc-300/g, replace: 'text-gray-700 dark:text-zinc-300' },
  { regex: /text-zinc-400/g, replace: 'text-gray-500 dark:text-zinc-400' },
  { regex: /text-zinc-500/g, replace: 'text-gray-400 dark:text-zinc-500' },
  { regex: /text-zinc-600/g, replace: 'text-gray-400 dark:text-zinc-600' },
  { regex: /text-zinc-700/g, replace: 'text-gray-400 dark:text-zinc-700' },
  { regex: /hover:bg-zinc-800/g, replace: 'hover:bg-gray-200 dark:hover:bg-zinc-800' },
  { regex: /hover:bg-zinc-700/g, replace: 'hover:bg-gray-300 dark:hover:bg-zinc-700' },
  { regex: /hover:text-white/g, replace: 'hover:text-gray-900 dark:hover:text-white' },
  { regex: /hover:text-zinc-200/g, replace: 'hover:text-gray-800 dark:hover:text-zinc-200' },
  // Exceptions/fixes for things we might break
  { regex: /text-gray-900 dark:text-white font-bold py-3/g, replace: 'text-white font-bold py-3' },
  { regex: /text-gray-900 dark:text-white font-bold py-2/g, replace: 'text-white font-bold py-2' },
  { regex: /text-gray-900 dark:text-white rounded-lg transition-colors shadow-lg/g, replace: 'text-white rounded-lg transition-colors shadow-lg' },
];

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    replacements.forEach(rep => {
      content = content.replace(rep.regex, rep.replace);
    });

    // Special fixes for specific files
    // In Settings, the top title needs to be dark text in light mode
    if (file.includes('Settings')) {
      content = content.replace('text-white tracking-wide', 'text-gray-900 dark:text-white tracking-wide');
    }

    // In ProductForm, fix the save button text
    if (file.includes('ProductForm')) {
      content = content.replace('text-gray-400 dark:text-white rounded-lg', 'text-white rounded-lg');
      content = content.replace('text-gray-400 dark:text-zinc-500 hover:text-yellow-500', 'text-zinc-500 hover:text-yellow-500');
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
