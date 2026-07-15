import path from 'path';
import os from 'os';
import dotenv from 'dotenv';

dotenv.config();

export const settings = {
  appName: 'Ticks API',
  version: '0.1.0',
  environment: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '127.0.0.1',
  port: parseInt(process.env.PORT || '8000', 10),
  corsOrigins: ['*'],
  workspacesRoot: path.join(os.homedir(), 'AILearningWorkspace', 'workspaces'),
  settingsPath: path.join(os.homedir(), 'AILearningWorkspace', 'settings.json'),
  dropboxSyncStatePath: path.join(os.homedir(), 'AILearningWorkspace', 'dropbox-sync-state.json'),
  mistralApiKey: process.env.MISTRAL_API_KEY || null
};
