const e = require('electron');
console.log('type:', typeof e);
console.log('hasApp:', !!e.app);
if (e.app) {
  e.app.whenReady().then(() => { console.log('SUCCESS'); e.app.quit(); });
} else {
  console.log('FAILED: no e.app');
  process.exit(1);
}
