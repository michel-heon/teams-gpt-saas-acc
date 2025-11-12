-- ============================================================================
-- Migration 003: Bot Managed Identity SQL User Creation
-- ============================================================================
-- Creates the Managed Identity user for the Teams Bot and grants necessary
-- permissions for SaaS Accelerator database operations
--
-- Prerequisites:
--   1. Firewall rules configured (infra/sql-permissions.bicep deployed)
--   2. Bot Managed Identity created (azure.bicep deployed)
--   3. Azure AD admin configured on SQL Server
--   4. Connected as Azure AD admin (heon@cotechnoe.net)
--
-- Connection String Example:
--   sqlcmd -S sac-02-sql.database.windows.net -d sac-02AMPSaaSDB -G -U heon@cotechnoe.net
--
-- GAP Resolution: GAP #3 - Grants Managed Identity SQL permissions
-- ============================================================================

USE [sac-02AMPSaaSDB];
GO

-- ============================================================================
-- Step 1: Verify current Azure AD authentication context
-- ============================================================================

PRINT '=== Verifying Azure AD Authentication ===';
SELECT 
    SUSER_NAME() AS CurrentUser,
    SYSTEM_USER AS SystemUser,
    @@VERSION AS SQLVersion;
GO

-- ============================================================================
-- Step 2: Drop existing user if present (for idempotency)
-- ============================================================================

PRINT '=== Checking for existing Managed Identity user ===';

IF EXISTS (SELECT * FROM sys.database_principals WHERE name = 'bot997b9c')
BEGIN
    PRINT 'Removing existing user: bot997b9c';
    DROP USER [bot997b9c];
END
ELSE
BEGIN
    PRINT 'No existing user found - proceeding with creation';
END
GO

-- ============================================================================
-- Step 3: Create Managed Identity user from Azure AD External Provider
-- ============================================================================

PRINT '=== Creating Managed Identity User ===';

-- Create user for Bot Managed Identity
-- The name MUST match the Managed Identity name in Azure (bot997b9c)
CREATE USER [bot997b9c] FROM EXTERNAL PROVIDER;
GO

PRINT 'Successfully created user: bot997b9c';
GO

-- ============================================================================
-- Step 4: Grant db_datareader role (read permissions)
-- ============================================================================

PRINT '=== Granting db_datareader role ===';

ALTER ROLE db_datareader ADD MEMBER [bot997b9c];
GO

PRINT 'Successfully granted db_datareader to bot997b9c';
GO

-- ============================================================================
-- Step 5: Grant db_datawriter role (write permissions)
-- ============================================================================

PRINT '=== Granting db_datawriter role ===';

ALTER ROLE db_datawriter ADD MEMBER [bot997b9c];
GO

PRINT 'Successfully granted db_datawriter to bot997b9c';
GO

-- ============================================================================
-- Step 6: Grant additional permissions for specific operations
-- ============================================================================

PRINT '=== Granting additional table permissions ===';

-- Explicitly grant SELECT on critical tables
GRANT SELECT ON dbo.Subscriptions TO [bot997b9c];
GRANT SELECT ON dbo.Plans TO [bot997b9c];
GRANT SELECT ON dbo.MeteredDimensions TO [bot997b9c];

-- Explicitly grant INSERT/UPDATE on audit tables
GRANT INSERT ON dbo.MeteredAuditLogs TO [bot997b9c];
GRANT INSERT ON dbo.TeamsMessageLogs TO [bot997b9c];

PRINT 'Successfully granted table-level permissions';
GO

-- ============================================================================
-- Step 7: Verify permissions granted
-- ============================================================================

PRINT '=== Verifying Permissions ===';

-- Check user exists
SELECT 
    name AS UserName,
    type_desc AS UserType,
    authentication_type_desc AS AuthenticationType,
    create_date AS CreatedDate
FROM sys.database_principals
WHERE name = 'bot997b9c';

-- Check role memberships
SELECT 
    dp.name AS UserName,
    dr.name AS RoleName
FROM sys.database_principals dp
INNER JOIN sys.database_role_members drm ON dp.principal_id = drm.member_principal_id
INNER JOIN sys.database_principals dr ON drm.role_principal_id = dr.principal_id
WHERE dp.name = 'bot997b9c';

-- Check explicit permissions
SELECT 
    pr.principal_id,
    pr.name AS UserName,
    pe.permission_name,
    pe.state_desc AS PermissionState,
    o.name AS ObjectName,
    o.type_desc AS ObjectType
FROM sys.database_permissions pe
INNER JOIN sys.database_principals pr ON pe.grantee_principal_id = pr.principal_id
LEFT JOIN sys.objects o ON pe.major_id = o.object_id
WHERE pr.name = 'bot997b9c';

GO

PRINT '=== Migration 003 Completed Successfully ===';
PRINT 'Bot Managed Identity "bot997b9c" has been granted:';
PRINT '  - db_datareader role (read all tables)';
PRINT '  - db_datawriter role (write all tables)';
PRINT '  - Explicit SELECT on Subscriptions, Plans, MeteredDimensions';
PRINT '  - Explicit INSERT on MeteredAuditLogs, TeamsMessageLogs';
PRINT '';
PRINT 'Next steps:';
PRINT '  1. Update Bot App Service environment variables (Task #3)';
PRINT '  2. Test connection via saasIntegration.testConnection() (Task #4)';
GO
