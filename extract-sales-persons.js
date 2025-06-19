import XLSX from 'xlsx';
import fs from 'fs';

// Read the Excel file
const workbook = XLSX.readFile('./attached_assets/Sales person by main store_1750327964096.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Sales Person Data:');
console.log(JSON.stringify(data, null, 2));

// Save as CSV for easier processing
const csv = XLSX.utils.sheet_to_csv(worksheet);
fs.writeFileSync('./sales_persons_data.csv', csv);
console.log('\nCSV saved to sales_persons_data.csv');