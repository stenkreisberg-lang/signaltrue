import express from 'express';
import {
  aggregateCultureExperiments,
  createCultureExperiment,
  getCultureExperiments,
  updateCultureExperiment,
  deleteCultureExperiment
} from '../services/cultureExperimentService.js';

const router = express.Router();

router.get('/aggregate', async (req, res) => {
  try {
    const summary = await aggregateCultureExperiments();
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:orgId', async (req, res) => {
  try {
    const experiments = await getCultureExperiments(req.params.orgId);
    res.json(experiments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const experiment = await createCultureExperiment(req.body);
    res.status(201).json(experiment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await updateCultureExperiment(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await deleteCultureExperiment(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
