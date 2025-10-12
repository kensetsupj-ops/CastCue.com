/**
 * Check current database state
 * Usage: node scripts/check-database.js
 */

// Load environment variables from .env.local
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !line.startsWith('#')) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
}

async function checkDatabase() {
  const { createClient } = require('@supabase/supabase-js');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
    process.exit(1);
  }

  console.log('🔧 Connecting to Supabase...');
  console.log(`URL: ${supabaseUrl}\n`);

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const tables = [
    'profiles',
    'twitch_accounts',
    'x_connections',
    'discord_webhooks',
    'eventsub_subscriptions',
    'streams',
    'samples',
    'templates',
    'deliveries',
    'links',
    'clicks',
    'quotas',
    'push_subscriptions',
    'drafts',
    'user_settings'
  ];

  console.log('📊 Checking database tables...\n');

  const results = {
    existing: [],
    missing: [],
    errors: []
  };

  for (const table of tables) {
    try {
      // Try to query the table
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          results.missing.push(table);
          console.log(`❌ ${table.padEnd(25)} - NOT FOUND`);
        } else {
          results.errors.push({ table, error: error.message });
          console.log(`⚠️  ${table.padEnd(25)} - ERROR: ${error.message}`);
        }
      } else {
        results.existing.push(table);
        console.log(`✅ ${table.padEnd(25)} - EXISTS (${count || 0} rows)`);
      }
    } catch (err) {
      results.errors.push({ table, error: err.message });
      console.log(`❌ ${table.padEnd(25)} - EXCEPTION: ${err.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📈 Summary:');
  console.log(`   ✅ Existing tables: ${results.existing.length}/${tables.length}`);
  console.log(`   ❌ Missing tables:  ${results.missing.length}/${tables.length}`);
  console.log(`   ⚠️  Errors:         ${results.errors.length}`);
  console.log('='.repeat(60) + '\n');

  if (results.missing.length > 0) {
    console.log('🔧 Missing tables:');
    results.missing.forEach(t => console.log(`   - ${t}`));
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Open Supabase Studio: https://app.supabase.com/project/uisfgmijyzbqcqvvafxc/sql');
    console.log('   2. Copy the contents of: supabase/migrations/all_migrations.sql');
    console.log('   3. Paste into the SQL Editor');
    console.log('   4. Click "Run" to execute the migration');
    console.log('');
  } else if (results.errors.length === 0) {
    console.log('🎉 All tables exist! Database is properly configured.');
    console.log('');
    console.log('📋 You can now:');
    console.log('   - Start the development server: npm run dev');
    console.log('   - Test Twitch/X integrations');
    console.log('   - Deploy to production');
  }

  // Check for specific critical tables
  console.log('\n🔍 Checking critical configurations...\n');

  if (results.existing.includes('quotas')) {
    const { data, error } = await supabase
      .from('quotas')
      .select('*')
      .limit(5);

    if (!error) {
      console.log(`✅ quotas table structure confirmed (${data?.length || 0} records)`);
    }
  }

  if (results.existing.includes('templates')) {
    const { data, error } = await supabase
      .from('templates')
      .select('id, name, variant')
      .limit(3);

    if (!error && data) {
      console.log(`✅ templates table working (${data.length} templates found)`);
      data.forEach(t => console.log(`   - ${t.name} (${t.variant})`));
    }
  }

  if (results.existing.includes('user_settings')) {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1);

    if (!error) {
      console.log(`✅ user_settings table confirmed`);
    }
  }

  console.log('');
}

checkDatabase().catch(console.error);
