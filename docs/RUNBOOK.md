# QA Framework Runbook

## Purpose

This runbook provides operational guidance for troubleshooting common issues, maintaining the QA framework,
and quick reference commands for daily tasks.

**Target Audience**: QA Engineers, DevOps, Support Teams

---

## Quick Command Reference

### Docker Commands

```powershell
# Start Odoo and PostgreSQL containers
docker-compose up -d

# Stop containers
docker-compose down

# View container logs
docker-compose logs -f odoo
docker-compose logs -f db

# Restart Odoo only
docker-compose restart odoo

# Rebuild containers (after config changes)
docker-compose up -d --build

# Check container status
docker-compose ps

# Access Odoo shell
docker exec -it logistics-qa-odoo bash

# Access PostgreSQL shell
docker exec -it logistics-qa-postgres psql -U odoo -d logistics_qa_db
```

### Test Execution Commands

```powershell
# Run smoke tests
npm run test:smoke

# Run API tests only
npm run test:api

# Run web UI tests
npm run test:web

# Run with specific tag
npx cucumber-js --tags @vehicle-management

# Run multiple tags
npx cucumber-js --tags "@smoke and not @api"

# Run in headed mode (see browser)
$env:HEADLESS="false"; npx cucumber-js --tags @smoke

# Run single scenario by line number
npx cucumber-js features/smoke.feature:12

# Run with retry on failure
npx cucumber-js --retry 2

# Dry run (validate syntax without execution)
npx cucumber-js --dry-run
```

### Report Generation

```powershell
# Generate Cucumber HTML report
npm run report:cucumber

# Open report in browser
start reports/cucumber/index.html

# View JSON report
cat reports/cucumber/cucumber.json
```

### Code Quality Commands

```powershell
# Run linter
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Check code formatting
npm run format:check

# Format code automatically
npm run format

# TypeScript type checking
npm run type-check
```

---

## Common Issues & Solutions

### Issue 1: Docker Containers Won't Start

**Symptoms**:

- `docker-compose up -d` hangs or fails
- Port already in use errors
- Container exits immediately

**Diagnosis**:

```powershell
# Check if ports 8069 or 5432 are in use
netstat -ano | findstr :8069
netstat -ano | findstr :5432

# Check Docker logs
docker-compose logs odoo
docker-compose logs db
```

**Solutions**:

**A. Port Conflict**:

```powershell
# Find process using port 8069
netstat -ano | findstr :8069
# Kill process by PID
taskkill /PID <PID> /F

# Or change port in docker-compose.yml
# ports:
#   - "8070:8069"  # Use 8070 instead
```

**B. Previous Containers Running**:

```powershell
# Stop all containers
docker-compose down

# Remove orphaned containers
docker-compose down --remove-orphans

# Clean up and restart
docker-compose down -v
docker-compose up -d
```

**C. Database Connection Issues**:

```powershell
# Check PostgreSQL is ready
docker exec logistics-qa-postgres pg_isready -U odoo

# Reset database
docker-compose down -v  # WARNING: Deletes all data
docker-compose up -d
```

---

### Issue 2: "Element Not Found" Errors

**Symptoms**:

- Test fails with "locator.click: Timeout 30000ms exceeded"
- Cannot find button/field/text

**Diagnosis**:

```gherkin
# Add debug step before failure
When I wait 5 seconds  # Visual inspection
And I take screenshot  # Manual verification
```

**Solutions**:

**A. Incorrect UI-MAP Key**:

```gherkin
# ❌ WRONG
When I click "Save" button

# ✅ CORRECT
When I click "save" button
```

**B. Element Not Ready**:

```gherkin
# Add explicit wait
When I wait for page to load
And I click "save" button
```

**C. Odoo Version Mismatch**:

```typescript
// Check actual button label in Odoo 17
// Update src/ui-map/buttons.ts if needed
export const BUTTONS = {
  create: 'New', // Odoo 17 uses "New" not "Create"
  // ...
};
```

**D. Selector Changed**:

```powershell
# Run test in headed mode to debug
$env:HEADLESS="false"; npx cucumber-js features/smoke.feature:12

# Use Playwright Inspector
$env:PWDEBUG="1"; npx cucumber-js features/smoke.feature:12
```

---

### Issue 3: API Authentication Fails

**Symptoms**:

- "Authentication failed: Invalid credentials"
- "401 Unauthorized" errors
- API tests fail immediately

**Diagnosis**:

```powershell
# Test API manually
curl -X POST http://localhost:8069/web/session/authenticate `
  -H "Content-Type: application/json" `
  -d '{"jsonrpc":"2.0","method":"call","params":{"db":"logistics_qa_db","login":"admin","password":"admin"},"id":1}'
```

**Solutions**:

**A. Wrong Credentials**:

```powershell
# Check .env file
cat .env

# Verify credentials
ODOO_USERNAME=admin
ODOO_PASSWORD=admin
ODOO_DATABASE=logistics_qa_db
```

**B. Database Not Created**:

```powershell
# Access Odoo at http://localhost:8069/web/database/manager
# Create database "logistics_qa_db" if missing
```

**C. Session Expired**:

```gherkin
# Re-authenticate in Background
Background:
  Given Odoo API is authenticated  # This auto-authenticates
```

**D. Network Issues**:

```powershell
# Test connectivity
Test-NetConnection localhost -Port 8069

# Check Odoo is running
docker-compose ps
```

---

### Issue 4: Database Connection Errors

**Symptoms**:

- "Database client not initialized"
- "Connection timeout" in DB steps
- Tests skip database assertions

**Diagnosis**:

```powershell
# Check DB_ENABLED in .env
cat .env | findstr DB_ENABLED

# Test PostgreSQL connection
docker exec logistics-qa-postgres psql -U odoo -d logistics_qa_db -c "SELECT 1"
```

**Solutions**:

**A. DB Testing Not Enabled**:

```bash
# Add to .env file
DB_ENABLED=true
DB_HOST=localhost
DB_PORT=5432
DB_NAME=logistics_qa_db
DB_USER=odoo
DB_PASSWORD=odoo
```

**B. PostgreSQL Not Running**:

```powershell
# Start database container
docker-compose up -d db

# Verify it's running
docker-compose ps db
```

**C. Wrong Connection Parameters**:

```powershell
# Test connection with psql
docker exec -it logistics-qa-postgres psql -U odoo -d logistics_qa_db

# If fails, check docker-compose.yml database config
```

---

### Issue 5: Tests Pass Locally but Fail in CI/CD

**Symptoms**:

- Tests pass on developer machine
- Fail in GitHub Actions / Azure DevOps
- Timing issues in CI

**Solutions**:

**A. Increase Timeouts**:

```typescript
// In cucumber.config.ts
export default {
  timeout: 60000, // Increase to 60 seconds for CI
  // ...
};
```

**B. Add Retry Logic**:

```gherkin
# Add retry annotation
@retry
Scenario: Flaky test
  # ...
```

**C. Wait for Services**:

```yaml
# In CI/CD pipeline (GitHub Actions example)
- name: Wait for Odoo
  run: |
    timeout 60 bash -c 'until curl -f http://localhost:8069/web/login; do sleep 5; done'
```

**D. Disable Parallel Execution**:

```bash
# In package.json
"test:ci": "cucumber-js --parallel 1"
```

---

### Issue 6: Stale Test Data

**Symptoms**:

- Tests fail due to pre-existing data
- "Duplicate key" errors
- Assertions fail on unexpected records

**Solutions**:

**A. Use Unique Identifiers**:

```gherkin
# Use timestamps in test data
When I fill "licensePlate" with "MD-TEST-{timestamp}"
```

```typescript
// In step definition
const timestamp = Date.now();
const licensePlate = `MD-TEST-${timestamp}`;
```

**B. Clean Up Before Test**:

```gherkin
Background:
  Given Odoo API is authenticated
  And I delete all test vehicles starting with "MD-TEST"
```

**C. Reset Database (Nuclear Option)**:

```powershell
# WARNING: Deletes ALL data
docker-compose down -v
docker-compose up -d

# Wait for Odoo to initialize
Start-Sleep -Seconds 30
```

---

### Issue 7: Slow Test Execution

**Symptoms**:

- Tests take too long to complete
- Timeouts on simple operations

**Diagnosis**:

```powershell
# Profile test execution
npx cucumber-js --format @cucumber/pretty-formatter
```

**Solutions**:

**A. Reduce Unnecessary Waits**:

```gherkin
# ❌ BAD
When I wait 5 seconds
And I click "save" button

# ✅ GOOD
When I click "save" button  # Has built-in wait
```

**B. Use API for Setup**:

```gherkin
# Instead of UI navigation for test data
Given Odoo API is authenticated
When I create Odoo record in "fleet.vehicle" with:
  | license_plate | MD-SETUP-001 |
# Then test UI functionality
```

**C. Run in Parallel**:

```bash
# Enable parallel execution
npx cucumber-js --parallel 4
```

**D. Optimize Selectors**:

```typescript
// Use specific selectors
this.page.getByRole('button', { name: 'Save', exact: true });
```

---

### Issue 8: Screenshot/Video Not Captured

**Symptoms**:

- No screenshots in reports/screenshots/
- Missing failure evidence

**Solutions**:

**A. Enable Screenshots**:

```typescript
// In src/support/hooks.ts - Already configured
After(async function (scenario) {
  if (scenario.result?.status === Status.FAILED) {
    await this.screenshot(`failure-${Date.now()}`);
  }
});
```

**B. Check Directory Permissions**:

```powershell
# Ensure directory exists
mkdir -p reports/screenshots

# Check write permissions
Test-Path reports/screenshots -PathType Container
```

**C. Manual Screenshot for Debugging**:

```gherkin
When I take screenshot "debug-vehicle-form"
```

---

### Issue 9: TypeScript Compilation Errors

**Symptoms**:

- `npm run test:smoke` fails with TypeScript errors
- "Cannot find module" errors

**Solutions**:

**A. Install Dependencies**:

```powershell
# Clean install
rm -rf node_modules package-lock.json
npm install
```

**B. Type Check**:

```powershell
# Check for type errors
npm run type-check

# Fix auto-fixable issues
npm run lint:fix
```

**C. Verify tsconfig.json**:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

---

### Issue 10: Odoo Module Not Loaded

**Symptoms**:

- "Model 'fleet.vehicle' does not exist"
- 404 errors on fleet URLs
- Missing menu items

**Solutions**:

**A. Install Fleet Module**:

```bash
# Access Odoo container
docker exec -it logistics-qa-odoo bash

# Inside container, enable Fleet module via web UI:
# http://localhost:8069 → Apps → Search "Fleet" → Install
```

**B. Update Module List**:

```powershell
# Restart Odoo with update
docker-compose restart odoo
```

**C. Check Module in Database**:

```sql
-- Access PostgreSQL
docker exec -it logistics-qa-postgres psql -U odoo -d logistics_qa_db

-- Check installed modules
SELECT name, state FROM ir_module_module WHERE name = 'fleet';
```

---

## Maintenance Tasks

### Weekly Tasks

#### ✅ Review Failed Tests

```powershell
# Check last week's test results
npm run report:cucumber
start reports/cucumber/index.html

# Identify flaky tests (tests that pass/fail intermittently)
# Tag them with @flaky for investigation
```

#### ✅ Update Test Data

```powershell
# Clean up old test records
docker exec -it logistics-qa-postgres psql -U odoo -d logistics_qa_db
# SQL:
DELETE FROM fleet_vehicle WHERE license_plate LIKE 'MD-TEST-%' AND create_date < NOW() - INTERVAL '7 days';
```

#### ✅ Dependency Updates

```powershell
# Check for outdated packages
npm outdated

# Update non-breaking changes
npm update

# Review and test major version updates manually
```

---

### Monthly Tasks

#### ✅ Performance Review

```powershell
# Profile slow tests
npx cucumber-js --format @cucumber/pretty-formatter > test-timing.log

# Analyze timing
cat test-timing.log | Select-String "ms"
```

#### ✅ Coverage Analysis

```powershell
# Review feature coverage
# Ensure all critical flows have @critical tag

# Check which features are tested
Get-ChildItem features -Recurse -Filter *.feature | Select-String "@critical"
```

#### ✅ Docker Image Updates

```powershell
# Pull latest Odoo image
docker-compose pull

# Rebuild containers
docker-compose up -d --build

# Test smoke scenarios
npm run test:smoke
```

#### ✅ Database Cleanup

```powershell
# Backup database
docker exec logistics-qa-postgres pg_dump -U odoo logistics_qa_db > backup-$(Get-Date -Format 'yyyy-MM-dd').sql

# Clean test data (vehicles with 'TEST' or 'MD-' prefix)
docker exec -it logistics-qa-postgres psql -U odoo -d logistics_qa_db -c "DELETE FROM fleet_vehicle WHERE license_plate ~ '^(MD-TEST|MD-TEMP|TEST)';"
```

---

### Quarterly Tasks

#### ✅ Framework Upgrade

```powershell
# Update Playwright
npm install @playwright/test@latest

# Update Cucumber
npm install @cucumber/cucumber@latest

# Run regression suite
npm run test:all
```

#### ✅ Security Audit

```powershell
# Run npm security audit
npm audit

# Fix vulnerabilities
npm audit fix

# Review high-severity issues manually
npm audit --json | ConvertFrom-Json | Select-Object -ExpandProperty vulnerabilities
```

#### ✅ Documentation Review

```powershell
# Update step library
# Review docs/STEP_LIBRARY.md for new steps

# Update API testing guide
# Add new endpoints to docs/API_TESTING.md

# Update this runbook with new issues/solutions
```

---

## Debugging Tips

### Enable Debug Mode

```powershell
# Run with Playwright Inspector
$env:PWDEBUG="1"
npx cucumber-js features/smoke.feature

# Enable verbose logging
$env:DEBUG="pw:api"
npx cucumber-js features/smoke.feature

# Run in headed mode with slow motion
$env:HEADLESS="false"
$env:SLOWMO="1000"  # 1 second delay between actions
npx cucumber-js features/smoke.feature
```

### Pause Test Execution

```typescript
// In step definition, add:
await this.page.pause(); // Opens Playwright Inspector
```

### Inspect Element Selectors

```gherkin
# In feature file, add temporary step:
When I wait 30 seconds  # Manually inspect page
```

```powershell
# Run with headed browser
$env:HEADLESS="false"
npx cucumber-js features/smoke.feature:15
```

### Check Logs

```powershell
# Odoo logs
docker-compose logs -f odoo | Select-String "ERROR"

# PostgreSQL logs
docker-compose logs -f db | Select-String "ERROR"

# Test execution logs (if configured)
cat logs/test-execution.log
```

---

## Environment Variables Reference

| Variable        | Default                 | Description                      |
| --------------- | ----------------------- | -------------------------------- |
| `BASE_URL`      | `http://localhost:8069` | Odoo instance URL                |
| `ODOO_USERNAME` | `admin`                 | Odoo login username              |
| `ODOO_PASSWORD` | `admin`                 | Odoo login password              |
| `ODOO_DATABASE` | `logistics_qa_db`               | Odoo database name               |
| `HEADLESS`      | `true`                  | Run browser in headless mode     |
| `SLOWMO`        | `0`                     | Slow down actions (milliseconds) |
| `DB_ENABLED`    | `false`                 | Enable database assertions       |
| `DB_HOST`       | `localhost`             | PostgreSQL host                  |
| `DB_PORT`       | `5432`                  | PostgreSQL port                  |
| `DB_NAME`       | `logistics_qa_db`               | Database name                    |
| `DB_USER`       | `odoo`                  | Database username                |
| `DB_PASSWORD`   | `odoo`                  | Database password                |
| `TIMEOUT`       | `30000`                 | Default step timeout (ms)        |
| `DEBUG`         | -                       | Enable debug logging             |

### Setting Environment Variables

**PowerShell (Windows)**:

```powershell
$env:HEADLESS="false"
$env:SLOWMO="1000"
npx cucumber-js --tags @smoke
```

**Bash (Linux/Mac)**:

```bash
export HEADLESS=false
export SLOWMO=1000
npx cucumber-js --tags @smoke
```

**Permanent (add to .env file)**:

```bash
HEADLESS=false
SLOWMO=1000
TIMEOUT=60000
```

---

## Useful SQL Queries

### List All Test Vehicles

```sql
SELECT id, license_plate, model_id, driver_id, create_date
FROM fleet_vehicle
WHERE license_plate LIKE 'MD-TEST%'
ORDER BY create_date DESC;
```

### Count Vehicles by State

```sql
SELECT state, COUNT(*)
FROM fleet_vehicle
GROUP BY state;
```

### Find Vehicles Without Drivers

```sql
SELECT id, license_plate
FROM fleet_vehicle
WHERE driver_id IS NULL;
```

### Delete Test Data

```sql
DELETE FROM fleet_vehicle
WHERE license_plate ~ '^(MD-TEST|MD-TEMP|TEST)';
```

### Check Database Size

```sql
SELECT pg_size_pretty(pg_database_size('logistics_qa_db')) AS database_size;
```

---

## Escalation Procedures

### Level 1: Self-Service

- Review this runbook
- Check logs and error messages
- Run tests in debug mode
- Search GitHub issues

### Level 2: Team Support

- Post in QA Slack channel
- Tag `@qa-team` with issue details
- Provide: error message, feature file, screenshots

### Level 3: Engineering Escalation

- Create GitHub issue with:
  - Steps to reproduce
  - Expected vs actual behavior
  - Logs and screenshots
  - Environment details
- Tag: `@engineering-lead`

### Level 4: Critical Production Issue

- Immediately notify:
  - QA Team Lead
  - DevOps Team
  - Product Owner
- Create incident ticket
- Follow incident response plan

---

## Health Check Commands

Run these commands to verify framework health:

```powershell
# 1. Check Docker services
docker-compose ps

# 2. Verify Odoo is accessible
curl http://localhost:8069/web/login

# 3. Test database connection
docker exec logistics-qa-postgres pg_isready -U odoo

# 4. Run smoke tests
npm run test:smoke

# 5. Generate report
npm run report:cucumber

# 6. Check for outdated dependencies
npm outdated

# 7. Run linter
npm run lint

# 8. Type check
npm run type-check
```

If all commands succeed, framework is healthy ✅

---

## Resources

- **Framework Repository**: [Internal GitLab/GitHub Link]
- **Odoo Documentation**: <https://www.odoo.com/documentation/17.0/>
- **Playwright Docs**: <https://playwright.dev/>
- **Cucumber Docs**: <https://cucumber.io/docs/cucumber/>
- **Team Slack**: `#qa-automation`
- **On-Call Schedule**: [Link to PagerDuty/OpsGenie]

---

## Change Log

| Date       | Author  | Changes                  |
| ---------- | ------- | ------------------------ |
| 2026-01-13 | QA Team | Initial runbook creation |
| -          | -       | -                        |

---

**Last Updated**: January 2026  
**Framework Version**: 1.0.0  
**Maintained By**: QA Automation Team  
**Next Review Date**: April 2026
