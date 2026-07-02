import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createTemplate() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size (8.5 x 11 inches)
  
  const form = pdfDoc.getForm();

  // Create text fields
  const addTextField = (name, x, y, width, height) => {
    const field = form.createTextField(name);
    field.addToPage(page, { x, y, width, height });
  };

  const addCheckbox = (name, x, y) => {
    const field = form.createCheckBox(name);
    field.addToPage(page, { x, y, width: 12, height: 12 });
  };

  addTextField('Maintenance Record for the Month and Year of', 50, 700, 200, 20);
  addTextField('Domicile StationHub', 300, 700, 100, 20);
  addTextField('Service Provider Company Name', 50, 650, 300, 20);
  addTextField('Current Mileage Odometer Reading', 370, 650, 100, 20);
  addTextField('Vehicle Unit', 490, 650, 100, 20);

  // Checkboxes
  addCheckbox('Check Box3', 50, 600); // Q1 Yes
  addCheckbox('Check Box1', 100, 600); // Q1 No
  addCheckbox('Check Box4', 50, 570); // Q2 Yes
  addCheckbox('Check Box2', 100, 570); // Q2 No
  addCheckbox('Check Box5', 50, 540); // Declaration

  // Maintenance rows
  for (let i = 1; i <= 5; i++) {
    const y = 500 - (i * 30);
    addTextField(`Date of MaintenanceRow${i}`, 50, y, 100, 20);
    addTextField(`Specific Description of Maintenance PerformedRow${i}`, 170, y, 300, 20);
  }

  addTextField('Date Completed', 400, 150, 100, 20);

  // The signature field in the actual template is likely just a designated area, 
  // but if it's an AcroForm field we might not need to create it here for the overlay to work.
  // The spec says "Overlay the image directly on top of the signature field coordinates: x: 37.2, y: 124.9, width: 308, height: 27".
  
  // Create /Sig field for completeness if needed, but pdf-lib doesn't support creating interactive signature fields directly easily.
  // We will just draw the image over it anyway.

  const pdfBytes = await pdfDoc.save();
  const dir = path.join(__dirname, '../templates');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'MGBA-355.pdf'), pdfBytes);
  console.log('Template created successfully.');
}

createTemplate().catch(console.error);
