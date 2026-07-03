import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ZipArchive } from 'archiver';

import { validateRecord } from './src/schema.js';
import { getDefaultRecordMonth, formatRecordMonthLabel, getDateCompleted } from './src/dateLogic.js';
import { fillMmr } from './src/pdfFill.js';
import { parseCsv } from './src/parseInput.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client', 'dist'))); // Serve Vite output

// Configs and paths
const configPath = path.join(__dirname, 'config', 'company.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const templatePath = path.join(__dirname, 'templates', 'MGBA-355.pdf');
const signaturesDir = path.join(__dirname, 'signatures');
if (!fs.existsSync(signaturesDir)) fs.mkdirSync(signaturesDir);

// Upload handlers
const uploadSignature = multer({ dest: 'uploads/' });
const uploadBatch = multer({ dest: 'uploads/' });

// --- API ROUTES ---

// List signatures
app.get('/api/signatures', (req, res) => {
  const files = fs.readdirSync(signaturesDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
  res.json(files);
});

// Upload signature
app.post('/api/signatures', uploadSignature.single('signature'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  const { name } = req.body;
  if (!name) return res.status(400).send('Name is required.');

  const ext = path.extname(req.file.originalname).toLowerCase() || '.png';
  const targetPath = path.join(signaturesDir, `${name}${ext}`);
  
  fs.renameSync(req.file.path, targetPath);
  res.json({ message: 'Signature saved', filename: `${name}${ext}` });
});

// Generate single MMR
app.post('/api/generate', async (req, res) => {
  try {
    const { signatureFilename, ...recordData } = req.body;
    
    // Validate
    const record = validateRecord(recordData);
    
    const dateCompleted = getDateCompleted(record.recordMonth, config.dateCompletedStrategy);
    const monthLabel = formatRecordMonthLabel(record.recordMonth);
    const sigPath = signatureFilename ? path.join(signaturesDir, signatureFilename) : null;

    const pdfBytes = await fillMmr(record, config, sigPath, templatePath, dateCompleted, monthLabel);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="MMR_${record.unit}_${record.recordMonth}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// Generate batch MMR from CSV
app.post('/api/generate-batch', uploadBatch.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('No file uploaded.');
    const signatureFilename = req.body.signatureFilename;
    const applySignature = req.body.applySignature === 'true';
    const companyName = req.body.companyName;
    const domicile = req.body.domicile;
    const sigPath = signatureFilename ? path.join(signaturesDir, signatureFilename) : null;

    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    
    let records;
    if (req.file.originalname.toLowerCase().endsWith('.json')) {
      const parsedJson = JSON.parse(fileContent);
      // Validate the json directly through the schema
      records = parsedJson.map(r => validateRecord(r));
    } else {
      records = parseCsv(fileContent);
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="MMR_Batch.zip"');

    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.pipe(res);

    for (const record of records) {
      record.companyName = companyName;
      record.applySignature = applySignature;
      record.domicile = domicile;
      const dateCompleted = getDateCompleted(record.recordMonth, config.dateCompletedStrategy);
      const monthLabel = formatRecordMonthLabel(record.recordMonth);
      const pdfBytes = await fillMmr(record, config, sigPath, templatePath, dateCompleted, monthLabel);
      
      archive.append(Buffer.from(pdfBytes), { name: `MMR_${record.unit}_${record.recordMonth}.pdf` });
    }

    await archive.finalize();
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// Generate multiple MMRs from JSON payload (for auto-backfill)
app.post('/api/generate-multiple', async (req, res) => {
  try {
    const { records: rawRecords, signatureFilename, applySignature, companyName, domicile } = req.body;
    if (!rawRecords || !Array.isArray(rawRecords)) return res.status(400).send('No records provided.');

    const sigPath = signatureFilename ? path.join(signaturesDir, signatureFilename) : null;
    const records = rawRecords.map(r => validateRecord(r));

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="MMR_AutoBackfill.zip"');

    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.pipe(res);

    for (const record of records) {
      record.companyName = companyName;
      record.applySignature = applySignature;
      record.domicile = domicile;
      const dateCompleted = getDateCompleted(record.recordMonth, config.dateCompletedStrategy);
      const monthLabel = formatRecordMonthLabel(record.recordMonth);
      const pdfBytes = await fillMmr(record, config, sigPath, templatePath, dateCompleted, monthLabel);
      
      archive.append(Buffer.from(pdfBytes), { name: `${record.unit}/MMR_${record.unit}_${record.recordMonth}.pdf` });
    }

    await archive.finalize();
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// Fallback for React Router (if needed)
app.use((req, res, next) => {
  if (req.method === 'GET') {
    res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
