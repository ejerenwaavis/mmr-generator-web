// CommonJS wrapper to allow LiteSpeed/cPanel to load the ES Module server
async function loadApp() {
    await import('./server.js');
}
loadApp();
