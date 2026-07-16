const { triggerSync } = require('./apps/api/dist/services/dropboxService.js');
async function run() {
  try {
    await triggerSync({ mode: 'pull' });
    console.log("Success");
  } catch(e) {
    console.error("Error:", e);
  }
}
run();
