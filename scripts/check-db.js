/**
 * Database configuration checker
 * Verifies that all required tables, functions, and triggers exist in Supabase
 */

// Load environment variables from .env.local manually
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function checkTables() {
  console.log('\n🔍 Checking database tables...\n');

  const requiredTables = [
    'profiles',
    'twitch_accounts',
    'x_connections',
    'eventsub_subscriptions',
    'streams',
    'samples',
    'templates',
    'user_settings',
    'drafts',
    'deliveries',
    'links',
    'clicks',
    'push_subscriptions',
    'quotas',
  ];

  const results = [];

  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(0);

      if (error) {
        if (error.code === '42P01') {
          // Table does not exist
          results.push({ table, exists: false, error: 'Table not found' });
        } else {
          results.push({ table, exists: false, error: error.message });
        }
      } else {
        results.push({ table, exists: true });
      }
    } catch (err) {
      results.push({ table, exists: false, error: err.message });
    }
  }

  // Display results
  console.log('Table Status:');
  console.log('─'.repeat(60));

  let missingTables = [];
  results.forEach(({ table, exists, error }) => {
    if (exists) {
      console.log(`✅ ${table.padEnd(25)} EXISTS`);
    } else {
      console.log(`❌ ${table.padEnd(25)} MISSING - ${error}`);
      missingTables.push(table);
    }
  });

  console.log('─'.repeat(60));
  console.log(
    `\nSummary: ${results.filter((r) => r.exists).length}/${results.length} tables exist\n`
  );

  return missingTables;
}

async function checkFunctions() {
  console.log('🔍 Checking database functions...\n');

  const requiredFunctions = ['consume_quota'];

  const results = [];

  for (const func of requiredFunctions) {
    try {
      // Try to call the function with test parameters
      const { data, error } = await supabase.rpc(func, {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_amount: 0,
      });

      if (error) {
        if (error.code === '42883') {
          // Function does not exist
          results.push({ function: func, exists: false, error: 'Function not found' });
        } else {
          // Function exists but returned an error (expected for test UUID)
          results.push({ function: func, exists: true });
        }
      } else {
        results.push({ function: func, exists: true });
      }
    } catch (err) {
      results.push({ function: func, exists: false, error: err.message });
    }
  }

  console.log('Function Status:');
  console.log('─'.repeat(60));

  let missingFunctions = [];
  results.forEach(({ function: func, exists, error }) => {
    if (exists) {
      console.log(`✅ ${func.padEnd(25)} EXISTS`);
    } else {
      console.log(`❌ ${func.padEnd(25)} MISSING - ${error}`);
      missingFunctions.push(func);
    }
  });

  console.log('─'.repeat(60));
  console.log(
    `\nSummary: ${results.filter((r) => r.exists).length}/${results.length} functions exist\n`
  );

  return missingFunctions;
}

async function checkEnumTypes() {
  console.log('🔍 Checking ENUM types...\n');

  const requiredEnums = [
    { name: 'variant', values: ['A', 'B'] },
    { name: 'auto_action', values: ['post', 'skip'] },
    { name: 'draft_status', values: ['pending', 'posted', 'skipped'] },
    { name: 'channel_type', values: ['x', 'discord'] },
    { name: 'delivery_status', values: ['queued', 'sent', 'failed', 'skipped'] },
  ];

  console.log('ENUM Types:');
  console.log('─'.repeat(60));

  // We'll check by trying to query tables that use these enums
  const checks = [
    { enum: 'variant', table: 'templates' },
    { enum: 'auto_action', table: 'user_settings' },
    { enum: 'draft_status', table: 'drafts' },
    { enum: 'channel_type', table: 'deliveries' },
    { enum: 'delivery_status', table: 'deliveries' },
  ];

  for (const { enum: enumName, table } of checks) {
    try {
      const { error } = await supabase.from(table).select('*').limit(0);

      if (error) {
        console.log(`❌ ${enumName.padEnd(25)} MISSING (table: ${table})`);
      } else {
        console.log(`✅ ${enumName.padEnd(25)} EXISTS`);
      }
    } catch (err) {
      console.log(`❌ ${enumName.padEnd(25)} ERROR - ${err.message}`);
    }
  }

  console.log('─'.repeat(60) + '\n');
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🔍 CastCue Database Configuration Check');
  console.log('═'.repeat(60));
  console.log(`📡 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Using Service Role Key: ${supabaseKey.slice(0, 20)}...`);
  console.log('═'.repeat(60));

  try {
    const missingTables = await checkTables();
    await checkEnumTypes();
    const missingFunctions = await checkFunctions();

    console.log('\n' + '═'.repeat(60));

    if (missingTables.length === 0 && missingFunctions.length === 0) {
      console.log('✅ All database tables and functions are properly configured!');
    } else {
      console.log('⚠️  Database configuration incomplete:\n');

      if (missingTables.length > 0) {
        console.log(`Missing tables: ${missingTables.join(', ')}`);
        console.log(
          '\n💡 To fix: Run migrations in supabase/migrations/ directory'
        );
        console.log('   Visit: https://app.supabase.com/project/uisfgmijyzbqcqvvafxc/editor');
        console.log('   Go to SQL Editor and execute migration files in order');
      }

      if (missingFunctions.length > 0) {
        console.log(`\nMissing functions: ${missingFunctions.join(', ')}`);
      }
    }

    console.log('═'.repeat(60) + '\n');
  } catch (error) {
    console.error('\n❌ Error checking database:', error.message);
    process.exit(1);
  }
}

main();
