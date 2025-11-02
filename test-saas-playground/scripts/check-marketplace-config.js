const sql = require('mssql');
const { DefaultAzureCredential } = require('@azure/identity');

const config = {
    server: 'sac-02-sql.database.windows.net',
    database: 'sac-02AMPSaaSDB',
    authentication: {
        type: 'azure-active-directory-default'
    },
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

async function checkMarketplaceConfig() {
    try {
        const credential = new DefaultAzureCredential();
        const tokenResponse = await credential.getToken('https://database.windows.net/');
        
        config.authentication = {
            type: 'azure-active-directory-access-token',
            options: {
                token: tokenResponse.token
            }
        };

        await sql.connect(config);
        console.log('[Check] Connected to database\n');

        // Check IsMeteredBillingEnabled in ApplicationConfiguration
        const result = await sql.query`
            SELECT [Name], [Value], [Description]
            FROM [dbo].[ApplicationConfiguration]
            WHERE [Name] = 'IsMeteredBillingEnabled'
        `;

        console.log('=== Marketplace Metering Configuration ===\n');
        
        if (result.recordset.length === 0) {
            console.log('❌ IsMeteredBillingEnabled NOT FOUND in ApplicationConfiguration');
            console.log('\nℹ️  This setting needs to be added to the database.');
            console.log('   Run this SQL to enable:');
            console.log('');
            console.log(`   INSERT INTO [dbo].[ApplicationConfiguration]`);
            console.log(`   ([Name], [Value], [Description])`);
            console.log(`   VALUES`);
            console.log(`   ('IsMeteredBillingEnabled', 'true', 'Enable Metered Billing Feature')`);
        } else {
            const config = result.recordset[0];
            console.log(`Name: ${config.Name}`);
            console.log(`Value: ${config.Value}`);
            console.log(`Description: ${config.Description}`);
            console.log('');
            
            if (config.Value.toLowerCase() === 'true') {
                console.log('✅ Marketplace Metering is ENABLED in database');
            } else {
                console.log('❌ Marketplace Metering is DISABLED in database');
                console.log('\nTo enable, run:');
                console.log(`UPDATE [dbo].[ApplicationConfiguration]`);
                console.log(`SET [Value] = 'true'`);
                console.log(`WHERE [Name] = 'IsMeteredBillingEnabled'`);
            }
        }

        await sql.close();
    } catch (error) {
        console.error('[Error]', error.message);
        process.exit(1);
    }
}

checkMarketplaceConfig();
