import { Router } from 'express';
import {
  getSettingsInfo,
  updateSettings,
  setMistralApiKey,
  setStyleExamples
} from '../services/settingsService.js';

const router = Router();

router.get('/settings', (req, res, next) => {
  try {
    const settingsInfo = getSettingsInfo();
    res.json(settingsInfo);
  } catch (err) {
    next(err);
  }
});

router.patch('/settings', (req, res, next) => {
  try {
    const settingsInfo = updateSettings(req.body);
    res.json(settingsInfo);
  } catch (err) {
    next(err);
  }
});

router.put('/settings/mistral-api-key', (req, res, next) => {
  try {
    const apiKey = req.body.api_key;
    if (typeof apiKey !== 'string') {
      throw { status: 422, message: 'api_key must be a string' };
    }
    setMistralApiKey(apiKey);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.put('/settings/style-examples', (req, res, next) => {
  try {
    const examples = req.body.examples;
    if (!Array.isArray(examples)) {
      throw { status: 422, message: 'examples must be an array' };
    }
    const result = setStyleExamples(examples);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
