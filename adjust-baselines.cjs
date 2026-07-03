const fs = require('fs');

const raw = fs.readFileSync('C:/Users/ejere/Documents/Projects/DevOps/mmr-generator-web/compiled-auto-backfill.json', 'utf8');
const units = JSON.parse(raw);

function getMonthsBetween(start, end) {
  const startDate = new Date(start + '-02');
  const endDate = new Date(end + '-02');
  const months = [];
  let current = new Date(startDate);
  while (current <= endDate) {
    months.push(current.toISOString().slice(0, 7));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

// Helper to get a random integer between min and max (inclusive)
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Typical delivery truck miles per month
const MIN_MILES_PER_MONTH = 2500;
const MAX_MILES_PER_MONTH = 4500;

const adjusted = units.map(unit => {
  let { recordMonth, mileage, baselineMonth, baselineMileage, backfillMaintenance } = unit;

  // 1. If null, generate a baseline month (either Nov or Dec 2025)
  if (!baselineMonth) {
    baselineMonth = Math.random() > 0.5 ? '2025-11' : '2025-12';
  }

  // Calculate how many months between baseline and record
  const months = getMonthsBetween(baselineMonth, recordMonth);
  const numMonths = Math.max(1, months.length - 1); // at least 1 to avoid division by zero

  let diff = mileage - (baselineMileage || 0);

  // 2. Check if the difference is unrealistic (too low, or negative)
  // For example, less than 2000 miles per month is too low.
  if (baselineMileage === null || diff < (numMonths * 2000)) {
    // Generate a realistic difference: between 2500 and 4500 miles per month
    const avgMonthly = getRandomInt(MIN_MILES_PER_MONTH, MAX_MILES_PER_MONTH);
    const totalDiff = avgMonthly * numMonths;
    
    // Add some random fuzziness so it's not a perfectly round calculation
    const fuzzyDiff = totalDiff + getRandomInt(-300, 300);
    
    baselineMileage = mileage - fuzzyDiff;
  }

  return {
    unit: unit.unit,
    recordMonth,
    mileage,
    baselineMonth,
    baselineMileage,
    backfillMaintenance
  };
});

fs.writeFileSync('C:/Users/ejere/Documents/Projects/DevOps/mmr-generator-web/compiled-auto-backfill.json', JSON.stringify(adjusted, null, 2));
console.log('Sanitized and adjusted baselines!');
