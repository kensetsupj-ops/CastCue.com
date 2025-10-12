#!/usr/bin/env node
/**
 * Supabase Migration Script
 * Runs all SQL migration files in order
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Migration files in order
const migrations = [
  '20250109_initial_schema.sql',
  '20250109_add_profile_columns.sql',
  '20250110_add_user_settings.sql',
  '20250111_create_default_templates_trigger.sql',
  '20250112_create_quotas_table.sql',
  '20250113_add_template_id_to_deliveries.sql'
];

async function runMigration(filename) {
  const filepath = path.join(__dirname, '..', 'supabase', 'migrations', filename);

  console.log(`\n📄 Running: ${filename}`);

  if (!fs.existsSync(filepath)) {
    console.error(`❌ File not found: ${filepath}`);
    return false;
  }

  const sql = fs.readFileSync(filepath, 'utf8');

  try {
    // Execute SQL using Supabase RPC
    // Note: This uses the postgres REST API to execute raw SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      // If exec_sql doesn't exist, we need to use direct connection
      // Let's try an alternative approach using the REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ sql_string: sql })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      console.log(`✅ Success: ${filename}`);
      return true;
    }

    console.log(`✅ Success: ${filename}`);
    return true;
  } catch (err) {
    console.error(`❌ Error in ${filename}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting database migrations...\n');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log(`📦 Total migrations: ${migrations.length}\n`);

  let success = 0;
  let failed = 0;

  for (const migration of migrations) {
    const result = await runMigration(migration);
    if (result) {
      success++;
    } else {
      failed++;
      // Continue with other migrations even if one fails
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Successful: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(50));

  if (failed > 0) {
    console.log('\n⚠️  Some migrations failed. Please check the errors above.');
    console.log('💡 Tip: You can run these SQLs manually in Supabase Dashboard');
    console.log('   → https://app.supabase.com/project/' + supabaseUrl.split('//')[1].split('.')[0] + '/sql/new');
  } else {
    console.log('\n🎉 All migrations completed successfully!');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
