import XLSX from 'xlsx';
import fs from 'fs';

// Read the Excel file
const workbook = XLSX.readFile('./attached_assets/Stores_1750328520223.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Store Data:');
console.log(JSON.stringify(data, null, 2));

// Save as CSV for easier processing
const csv = XLSX.utils.sheet_to_csv(worksheet);
fs.writeFileSync('./stores_data.csv', csv);
console.log('\nCSV saved to stores_data.csv');