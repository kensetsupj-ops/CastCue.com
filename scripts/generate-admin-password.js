#!/usr/bin/env node

/**
 * Admin Password Hash Generator
 *
 * Usage:
 *   node scripts/generate-admin-password.js <password>
 *
 * Example:
 *   node scripts/generate-admin-password.js my-secret-password
 */

const { scrypt, randomBytes } = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(scrypt);

async function generatePasswordHash(password) {
  if (!password) {
    console.error('Error: Password is required');
    console.error('Usage: node scripts/generate-admin-password.js <password>');
    process.exit(1);
  }

  try {
    const salt = randomBytes(16).toString('hex');
    const hash = await scryptAsync(password, salt, 64);
    const hashString = `scrypt:${salt}:${hash.toString('hex')}`;

    console.log('\n✅ Password hash generated successfully!\n');
    console.log('Add this to your .env file:\n');
    console.log(`ADMIN_PASSWORD=${hashString}\n`);
    console.log('Or update it in Vercel environment variables:\n');
    console.log('1. Go to Vercel project settings');
    console.log('2. Navigate to Environment Variables');
    console.log('3. Update ADMIN_PASSWORD with the hash above');
    console.log('4. Redeploy your application\n');
  } catch (error) {
    console.error('Error generating password hash:', error);
    process.exit(1);
  }
}

const password = process.argv[2];
generatePasswordHash(password);
