#!/usr/bin/env node
/**
 * Test script for Azure Marketplace Metering Service API
 * 
 * This script validates:
 * 1. Configuration is complete
 * 2. Azure AD authentication works
 * 3. Access token can be obtained
 * 
 * Usage:
 *   node scripts/test-marketplace-api.js
 * 
 * Note: This does NOT emit actual usage events, only tests authentication.
 */

require('dotenv').config({ path: './env/.env.local' });
const config = require('../src/config');
const { getInstance } = require('../src/services/meteringApiService');

async function main() {
    console.log('='.repeat(70));
    console.log('Azure Marketplace Metering Service API - Test Script');
    console.log('='.repeat(70));
    console.log();

    console.log('Configuration:');
    console.log('  Metering Enabled:', config.marketplace.enabled);
    console.log('  Tenant ID:', config.marketplace.tenantId ? '✓ Set' : '✗ Missing');
    console.log('  Client ID:', config.marketplace.clientId ? '✓ Set' : '✗ Missing');
    console.log('  Client Secret:', config.marketplace.clientSecret ? '✓ Set' : '✗ Missing');
    console.log('  Metering API URL:', config.marketplace.meteringApiUrl);
    console.log('  Retry Max:', config.marketplace.retryMax);
    console.log('  Retry Delay:', config.marketplace.retryDelay + 'ms');
    console.log();

    if (!config.marketplace.enabled) {
        console.log('⚠️  Marketplace metering is DISABLED');
        console.log('   Set MARKETPLACE_METERING_ENABLED=true to enable');
        console.log();
        console.log('Skipping API test...');
        return;
    }

    console.log('Testing Marketplace API connection...');
    console.log();

    try {
        const service = getInstance();
        await service.testConnection();
        
        console.log();
        console.log('='.repeat(70));
        console.log('✅ SUCCESS - Marketplace API connection test passed!');
        console.log('='.repeat(70));
        console.log();
        console.log('Next steps:');
        console.log('  1. Set MARKETPLACE_METERING_ENABLED=true in production');
        console.log('  2. Set SAAS_ENABLE_USAGE_TRACKING=true to enable usage tracking');
        console.log('  3. Test with actual subscription to emit usage events');
        console.log();

    } catch (error) {
        console.log();
        console.log('='.repeat(70));
        console.log('❌ FAILED - Marketplace API connection test failed');
        console.log('='.repeat(70));
        console.log();
        console.error('Error:', error.message);
        console.log();
        
        if (error.response) {
            console.log('Response details:');
            console.log('  Status:', error.response.status);
            console.log('  Data:', JSON.stringify(error.response.data, null, 2));
        }
        
        console.log();
        console.log('Troubleshooting:');
        console.log('  1. Verify Azure AD app registration exists');
        console.log('  2. Check MARKETPLACE_METERING_TENANT_ID is correct');
        console.log('  3. Check MARKETPLACE_METERING_CLIENT_ID is correct');
        console.log('  4. Check MARKETPLACE_METERING_CLIENT_SECRET is valid');
        console.log('  5. Verify app has permission to call Marketplace API');
        console.log('     Required resource: 20e940b3-4c77-4b0b-9a53-9e16a1b010a7');
        console.log();
        
        process.exit(1);
    }
}

// Run test
main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
