import express from 'express';
import {
  aggregateReadinessForecasts,
  createReadinessForecast,
  getReadinessForecasts,
  updateReadinessForecast,
  deleteReadinessForecast
} from '../services/readinessForecastService.js';

const router = express.Router();

router.get('/aggregate', async (req, res) => {
  try {
    const summary = await aggregateReadinessForecasts();
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:orgId', async (req, res) => {
  try {
    const forecasts = await getReadinessForecasts(req.params.orgId);
    res.json(forecasts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const forecast = await createReadinessForecast(req.body);
    res.status(201).json(forecast);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await updateReadinessForecast(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await deleteReadinessForecast(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
