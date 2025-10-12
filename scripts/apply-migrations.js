/**
 * Apply database migrations to Supabase
 * Usage: node scripts/apply-migrations.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function applyMigrations() {
  const { createClient } = require('@supabase/supabase-js');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
    process.exit(1);
  }

  console.log('🔧 Connecting to Supabase...');
  console.log(`URL: ${supabaseUrl}`);

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Read the migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', 'all_migrations.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  console.log('📄 Migration file loaded');
  console.log(`Size: ${(migrationSQL.length / 1024).toFixed(2)} KB`);

  // Split SQL into individual statements (rough approach)
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📊 Found ${statements.length} SQL statements`);
  console.log('');
  console.log('⚠️  Note: This script will execute SQL statements sequentially.');
  console.log('    Some statements may fail if they already exist (this is expected).');
  console.log('');

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';

    // Skip empty or comment-only statements
    if (statement.trim().length < 5) {
      skippedCount++;
      continue;
    }

    // Show progress for long operations
    if (i % 10 === 0) {
      console.log(`📍 Progress: ${i}/${statements.length} statements processed`);
    }

    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        // Check if error is due to already existing objects
        if (
          error.message?.includes('already exists') ||
          error.message?.includes('does not exist') ||
          error.message?.includes('IF NOT EXISTS')
        ) {
          // This is expected for idempotent migrations
          skippedCount++;
        } else {
          console.error(`❌ Error in statement ${i}:`, error.message);
          console.error('Statement:', statement.substring(0, 100) + '...');
          errorCount++;
        }
      } else {
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Exception in statement ${i}:`, err.message);
      errorCount++;
    }
  }

  console.log('');
  console.log('✅ Migration process completed!');
  console.log(`   Success: ${successCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log('');

  if (errorCount > 0) {
    console.log('⚠️  Some errors occurred. Please review the output above.');
    console.log('   You may need to execute the migration SQL manually in Supabase Studio.');
  } else {
    console.log('🎉 All migrations applied successfully!');
  }
}

applyMigrations().catch(console.error);
