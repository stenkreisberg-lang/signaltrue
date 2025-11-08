import express from 'express';
import {
  aggregateDeiEsgReports,
  createDeiEsgReport,
  getDeiEsgReports,
  updateDeiEsgReport,
  deleteDeiEsgReport
} from '../services/deiEsgReportService.js';

const router = express.Router();

router.get('/aggregate', async (req, res) => {
  try {
    const summary = await aggregateDeiEsgReports();
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:orgId', async (req, res) => {
  try {
    const reports = await getDeiEsgReports(req.params.orgId);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const report = await createDeiEsgReport(req.body);
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await updateDeiEsgReport(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await deleteDeiEsgReport(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
