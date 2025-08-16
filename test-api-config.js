// Test script to verify API configuration
console.log('API Configuration Test');
console.log('===================');

// Load environment variables
require('dotenv').config();

const FASTAPI_BASE_URL = (process.env.FASTAPI_BASE_URL || "http://127.0.0.1:8001").replace(/\/+$/, "");

console.log('FASTAPI_BASE_URL:', FASTAPI_BASE_URL);
console.log('');

console.log('Expected API endpoints:');
console.log('PDF to Word:', `${FASTAPI_BASE_URL}/api/convert/pdf-to-word`);
console.log('PDF to Image:', `${FASTAPI_BASE_URL}/api/convert/pdf-to-image`);
console.log('PDF to PowerPoint:', `${FASTAPI_BASE_URL}/api/convert/pdf-to-powerpoint`);
console.log('');

console.log('Frontend endpoints (these should proxy to FastAPI):');
console.log('PDF to Word: /api/pdf/pdf-to-word');
console.log('PDF to Image: /api/pdf/pdf-to-image');
console.log('PDF to PowerPoint: /api/pdf/pdf-to-powerpoint');

// Test that the URLs don't have double slashes
const testUrls = [
  `${FASTAPI_BASE_URL}/api/convert/pdf-to-word`,
  `${FASTAPI_BASE_URL}/api/convert/pdf-to-image`,
  `${FASTAPI_BASE_URL}/api/convert/pdf-to-powerpoint`
];

console.log('');
console.log('URL validation:');
testUrls.forEach(url => {
  const hasDoubleSlash = url.includes('//') && !url.startsWith('http://') && !url.startsWith('https://');
  console.log(`${url} - ${hasDoubleSlash ? '❌ Has double slash' : '✅ OK'}`);
});
