import express from 'express';
import ConsentAudit from '../models/consentAudit.js';
import PDFDocument from 'pdfkit';

const router = express.Router();

// GET /api/consent-audit/download
router.get('/download', async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(403).json({ message: 'No org context' });
    const logs = await ConsentAudit.find({ org_id: orgId }).sort({ timestamp: -1 }).limit(1000);
    // Generate PDF
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="consent_audit.pdf"');
    doc.pipe(res);
    doc.fontSize(18).text('Consent & Access Audit Log', { align: 'center' });
    doc.moveDown();
    logs.forEach(log => {
      doc.fontSize(10).text(`User: ${log.user_id} | Action: ${log.action} | Endpoint: ${log.endpoint} | Time: ${log.timestamp.toISOString()} | IP: ${log.ip}`);
    });
    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
});

export default router;
