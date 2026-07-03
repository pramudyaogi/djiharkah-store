const fs = require('fs');

const filePath = './apps/admin/src/pages/OrdersList.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Change initial state
content = content.replace(
  /items: \[\{ productId: '', quantity: 0, isCustom: false, customName: '', customPrice: '' \}\],/g,
  `items: [],`
);

// We need to fix the submit handler custom product validation missing block since my previous multi-replace was overwritten partially, wait no, my refactor script replaced handlers entirely.
// Let's check handleManualOrderSubmit again in the file.
fs.writeFileSync(filePath, content);
console.log("Empty Items Done");
