const fs = require('fs');
const files = [
  'apps/store/src/pages/Home.jsx',
  'apps/store/src/pages/Products.jsx'
];

const regex = /<div className="flex items-center gap-1">\s*<span className="text-emas font-semibold">★<\/span>\s*<span>\{product\.rating \? Number\(product\.rating\)\.toFixed\(1\) : '5\.0'\}<\/span>\s*<\/div>/g;

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  if (c.match(regex)) {
    c = c.replace(regex, '');
    fs.writeFileSync(f, c);
    console.log('Fixed', f);
  }
});
