import { Router } from 'express';
import { getDropboxAuthUrl, handleDropboxCallback, triggerSync } from '../services/dropboxService.js';
import { getSettingsInfo, updateSettings } from '../services/settingsService.js';

export const syncRouter = Router();

syncRouter.get('/dropbox/auth-url', (req, res) => {
  try {
    const url = getDropboxAuthUrl();
    res.json({ url });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

syncRouter.get('/dropbox/callback', async (req, res) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      res.status(400).send('Missing code parameter');
      return;
    }
    await handleDropboxCallback(code);
    res.send(`
      <html>
        <body>
          <h2>Dropbox Connected Successfully!</h2>
          <p>You can close this tab and return to the application.</p>
          <script>
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    res.status(500).send(`Authentication failed: ${error.message}`);
  }
});

syncRouter.post('/dropbox/trigger', async (req, res) => {
  const mode = req.body?.mode || 'smart';
  const result = await triggerSync({ mode });
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

syncRouter.get('/status', (req, res) => {
  const settings = getSettingsInfo();
  res.json({
    dropbox_connected: settings.dropbox_connected,

    sync_on_close: settings.sync_on_close
  });
});
