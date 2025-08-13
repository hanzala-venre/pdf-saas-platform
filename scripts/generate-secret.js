const crypto = require('crypto');

// Generate a secure random secret for NextAuth
const secret = crypto.randomBytes(32).toString('base64');

console.log('Generated NEXTAUTH_SECRET:');
console.log(secret);
console.log('\nAdd this to your .env file:');
console.log(`NEXTAUTH_SECRET=${secret}`);
