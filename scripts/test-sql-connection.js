// ============================================================================
// Test Script: Verify Bot → SaaS Database Connection
// ============================================================================
// This script tests the Managed Identity connection from local environment
// simulating the Bot App Service authentication
//
// Prerequisites:
//   1. Azure CLI authenticated (az login)
//   2. User must have access to both resource groups
//   3. Firewall rules deployed (infra/deploy-sql-permissions.sh)
//   4. SQL user created (db/migrations/003-bot-managed-identity.sql)
//
// Usage:
//   node scripts/test-sql-connection.js
//
// What it tests:
//   - Managed Identity authentication (simulated via Azure AD)
//   - Network connectivity (firewall rules)
//   - SQL permissions (db_datareader, db_datawriter)
//   - Query execution on Subscriptions table
// ============================================================================

const sql = require('mssql');
const { DefaultAzureCredential } = require('@azure/identity');

// Configuration
const CONFIG = {
  server: 'sac-02-sql.database.windows.net',
  database: 'sac-02AMPSaaSDB',
  authentication: {
    type: 'azure-active-directory-default'
  },
  options: {
    encrypt: true,
    trustServerCertificate: false,
    connectTimeout: 30000,
    requestTimeout: 30000
  }
};

// Colors for console output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function logSection(title) {
  console.log('');
  log(COLORS.blue, '='.repeat(60));
  log(COLORS.blue, title);
  log(COLORS.blue, '='.repeat(60));
}

async function testConnection() {
  logSection('SQL Connection Test - Bot Managed Identity Simulation');
  
  let pool;
  let testResults = {
    connection: false,
    authentication: false,
    permissions: {
      select: false,
      insert: false
    },
    queries: {
      subscriptionsCount: null,
      plansCount: null,
      metricsCount: null
    }
  };

  try {
    // Test 1: Connection
    logSection('Test 1: Database Connection');
    log(COLORS.yellow, 'Connecting to Azure SQL...');
    log(COLORS.cyan, `Server: ${CONFIG.server}`);
    log(COLORS.cyan, `Database: ${CONFIG.database}`);
    log(COLORS.cyan, `Authentication: Azure AD Default (simulating Managed Identity)`);
    
    pool = await sql.connect(CONFIG);
    testResults.connection = true;
    log(COLORS.green, '✓ Connection successful');

    // Test 2: Authentication verification
    logSection('Test 2: Authentication Verification');
    log(COLORS.yellow, 'Verifying current user...');
    
    const authResult = await pool.request().query(`
      SELECT 
        SUSER_NAME() AS CurrentUser,
        SYSTEM_USER AS SystemUser,
        USER_NAME() AS DatabaseUser
    `);
    
    console.log(authResult.recordset[0]);
    testResults.authentication = true;
    log(COLORS.green, '✓ Authentication verified');

    // Test 3: Read permissions (db_datareader)
    logSection('Test 3: Read Permissions (db_datareader)');
    log(COLORS.yellow, 'Testing SELECT on Subscriptions...');
    
    const subscriptionsResult = await pool.request().query(`
      SELECT COUNT(*) AS Count FROM dbo.Subscriptions
    `);
    testResults.permissions.select = true;
    testResults.queries.subscriptionsCount = subscriptionsResult.recordset[0].Count;
    log(COLORS.green, `✓ SELECT successful - ${testResults.queries.subscriptionsCount} subscriptions found`);

    log(COLORS.yellow, 'Testing SELECT on Plans...');
    const plansResult = await pool.request().query(`
      SELECT COUNT(*) AS Count FROM dbo.Plans
    `);
    testResults.queries.plansCount = plansResult.recordset[0].Count;
    log(COLORS.green, `✓ SELECT successful - ${testResults.queries.plansCount} plans found`);

    log(COLORS.yellow, 'Testing SELECT on MeteredAuditLogs...');
    const metricsResult = await pool.request().query(`
      SELECT COUNT(*) AS Count FROM dbo.MeteredAuditLogs
    `);
    testResults.queries.metricsCount = metricsResult.recordset[0].Count;
    log(COLORS.green, `✓ SELECT successful - ${testResults.queries.metricsCount} audit logs found`);

    // Test 4: Subscription query with TeamsUserId
    logSection('Test 4: Teams Integration Query');
    log(COLORS.yellow, 'Checking for TeamsUserId population...');
    
    const teamsLinkResult = await pool.request().query(`
      SELECT 
        COUNT(*) AS TotalSubscriptions,
        SUM(CASE WHEN TeamsUserId IS NOT NULL THEN 1 ELSE 0 END) AS LinkedSubscriptions,
        SUM(CASE WHEN TeamsUserId IS NULL THEN 1 ELSE 0 END) AS UnlinkedSubscriptions
      FROM dbo.Subscriptions
      WHERE SubscriptionStatus = 'Subscribed'
    `);
    
    const stats = teamsLinkResult.recordset[0];
    console.log('  Total Active Subscriptions:', stats.TotalSubscriptions);
    console.log('  Linked to Teams:', stats.LinkedSubscriptions);
    console.log('  Not Linked:', stats.UnlinkedSubscriptions);
    
    if (stats.UnlinkedSubscriptions > 0) {
      log(COLORS.yellow, '⚠ Some subscriptions not linked to Teams (expected for Phase 1)');
    } else if (stats.LinkedSubscriptions > 0) {
      log(COLORS.green, '✓ All active subscriptions are linked to Teams');
    } else {
      log(COLORS.yellow, '⚠ No active subscriptions found');
    }

    // Test 5: Write permissions (db_datawriter) - Verify role membership
    logSection('Test 5: Write Permissions (db_datawriter)');
    log(COLORS.yellow, 'Checking db_datawriter role membership...');
    
    const writerRoleResult = await pool.request().query(`
      SELECT 
        COUNT(*) AS IsMember
      FROM sys.database_principals dp
      INNER JOIN sys.database_role_members drm ON dp.principal_id = drm.member_principal_id
      INNER JOIN sys.database_principals dr ON drm.role_principal_id = dr.principal_id
      WHERE dr.name = 'db_datawriter' 
        AND (dp.name = SYSTEM_USER OR dp.name = SUSER_NAME())
    `);
    
    if (writerRoleResult.recordset[0].IsMember > 0) {
      testResults.permissions.insert = true;
      log(COLORS.green, '✓ db_datawriter role confirmed');
      log(COLORS.cyan, '  INSERT/UPDATE/DELETE permissions available via db_datawriter role');
    } else {
      log(COLORS.yellow, '⚠ db_datawriter role not found (this test uses admin credentials)');
      log(COLORS.cyan, '  Managed Identity "bot997b9c" will have db_datawriter when running from App Service');
    }

    // Test 6: Role membership verification
    logSection('Test 6: Role Membership Verification');
    log(COLORS.yellow, 'Checking database roles...');
    
    const rolesResult = await pool.request().query(`
      SELECT 
        dp.name AS UserName,
        dr.name AS RoleName
      FROM sys.database_principals dp
      INNER JOIN sys.database_role_members drm ON dp.principal_id = drm.member_principal_id
      INNER JOIN sys.database_principals dr ON drm.role_principal_id = dr.principal_id
      WHERE dp.name = USER_NAME()
    `);
    
    if (rolesResult.recordset.length > 0) {
      console.log('  Roles assigned:');
      rolesResult.recordset.forEach(role => {
        console.log(`    - ${role.RoleName}`);
      });
      log(COLORS.green, '✓ Role memberships verified');
    } else {
      log(COLORS.yellow, '⚠ No explicit role memberships found (may be inherited)');
    }

  } catch (error) {
    log(COLORS.red, '✗ Test failed');
    console.error('Error details:', error.message);
    
    // Provide diagnostic information
    if (error.code === 'ELOGIN') {
      log(COLORS.red, '\nAuthentication failed. Possible causes:');
      console.log('  - Managed Identity user not created in SQL (run db/migrations/003-bot-managed-identity.sql)');
      console.log('  - Current Azure AD user not authorized');
      console.log('  - Azure AD admin not configured on SQL Server');
    } else if (error.code === 'ETIMEOUT') {
      log(COLORS.red, '\nConnection timeout. Possible causes:');
      console.log('  - Firewall rules not configured (run infra/deploy-sql-permissions.sh)');
      console.log('  - Network connectivity issues');
      console.log('  - SQL Server not accessible');
    } else if (error.code === 'EREQUEST') {
      log(COLORS.red, '\nQuery execution failed. Possible causes:');
      console.log('  - Insufficient permissions (missing db_datareader or db_datawriter role)');
      console.log('  - Table does not exist');
      console.log('  - Syntax error in query');
    }
    
    return false;
  } finally {
    if (pool) {
      await pool.close();
    }
  }

  // Summary
  logSection('Test Summary');
  console.log('Connection:         ', testResults.connection ? '✓ PASS' : '✗ FAIL');
  console.log('Authentication:     ', testResults.authentication ? '✓ PASS' : '✗ FAIL');
  console.log('Read Permissions:   ', testResults.permissions.select ? '✓ PASS' : '✗ FAIL');
  console.log('Write Permissions:  ', testResults.permissions.insert ? '✓ PASS' : '✗ FAIL');
  console.log('');
  
  if (testResults.connection && testResults.authentication && 
      testResults.permissions.select && testResults.permissions.insert) {
    log(COLORS.green, '✓ ALL TESTS PASSED');
    log(COLORS.green, 'Bot → SaaS Database integration is ready');
    console.log('');
    log(COLORS.yellow, 'Next steps:');
    console.log('  1. Deploy bot with updated environment variables');
    console.log('  2. Test bot subscription check in Teams');
    console.log('  3. Monitor Application Insights for connection logs');
    return true;
  } else {
    log(COLORS.red, '✗ SOME TESTS FAILED');
    log(COLORS.yellow, 'Review error messages above and fix issues before proceeding');
    return false;
  }
}

// Run tests
testConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
