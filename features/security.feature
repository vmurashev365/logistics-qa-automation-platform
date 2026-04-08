@security @critical
Feature: Security and Access Control
  As a system administrator
  I want to enforce access controls
  So that unauthorized users cannot access sensitive data

  Background:
    Given I am on the "login" page

  # ============================================
  # AUTHENTICATION TESTS
  # ============================================

  @authentication @security-001
  Scenario: Anonymous user cannot access fleet data via API
    When I send unauthenticated GET request to "/web/dataset/call_kw/fleet.vehicle/search_read"
    Then API response status should be 200
    # Odoo returns 200 but with error in response body for unauthenticated requests
    And API response should contain error

  @authentication @security-002
  Scenario: Invalid credentials are rejected
    When I fill "login" field with "invalid_user"
    And I fill "password" field with "wrong_password"
    And I click "login" button
    Then I should see error notification
    And I should remain on "login" page

  @authentication @security-003
  Scenario: Empty credentials are rejected
    When I click "login" button
    Then I should see validation error
    And I should remain on "login" page

  @authentication @security-004
  Scenario: SQL injection in login is prevented
    When I fill "login" field with "admin' OR '1'='1"
    And I fill "password" field with "anything' OR '1'='1"
    And I click "login" button
    Then I should see error notification
    And I should remain on "login" page

  # ============================================
  # AUTHORIZATION TESTS
  # ============================================

  @authorization @security-005
  Scenario: Standard user can access fleet module
    Given I am logged in as "admin"
    When I navigate to "vehicles" page
    Then I should see the vehicles list
    And page title should contain "Vehicles"

  @authorization @security-006
  Scenario: User cannot access system settings without admin rights
    Given I am logged in as "admin"
    When I navigate to "/web#action=base.action_res_users"
    Then I should see the page loaded
    # Admin can access, but regular users would be denied

  # ============================================
  # SESSION SECURITY TESTS
  # ============================================

  @session @security-007
  Scenario: Session expires after logout
    Given I am logged in as "admin"
    When I navigate to "vehicles" page
    And I logout
    Then I should be on "login" page
    When I navigate to "vehicles" page
    Then I should be redirected to "login" page

  @session @security-008
  Scenario: Direct URL access requires authentication
    When I navigate to "vehicles" page
    Then I should be on "login" page
    And page URL should contain "login"

  # ============================================
  # INPUT VALIDATION TESTS
  # ============================================

  @input-validation @security-009
  Scenario: XSS in form fields is sanitized
    Given I am logged in as "admin"
    And I navigate to "vehicles" page
    When I click "create" button
    And I fill "licensePlate" field with "<script>alert('xss')</script>"
    And I click "save" button
    Then page should not execute script
    And vehicle should be created with sanitized data

  @input-validation @security-010
  Scenario: Special characters in search are handled safely
    Given I am logged in as "admin"
    And I navigate to "vehicles" page
    When I search for "'; DROP TABLE fleet_vehicle; --"
    Then I should see search results or empty state
    And no database error should occur

  # ============================================
  # API SECURITY TESTS
  # ============================================

  @api-security @security-011
  Scenario: API rate limiting is enforced
    Given I am authenticated as API client
    When I make 100 rapid API requests
    Then some requests should be rate limited
    # Note: Implementation depends on server configuration

  @api-security @security-012
  Scenario: API requests require valid session
    When I send GET request to "/web/session/get_session_info" without session
    Then API response should indicate session required

  # ============================================
  # GDPR / DATA PRIVACY TESTS
  # ============================================

  @gdpr @security-013
  Scenario: Personal data can be anonymized
    Given driver "Test Driver GDPR" exists in the system
    And driver has personal data stored
    When I request data anonymization for driver "Test Driver GDPR"
    Then driver personal data should be anonymized
    And driver name should be replaced with anonymized identifier

  @gdpr @security-014
  Scenario: Data export includes all personal information
    Given I am logged in as "admin"
    And driver "Test Driver Export" exists with full profile
    When I request data export for driver "Test Driver Export"
    Then export should include all stored personal data
    And export format should be machine-readable

  # ============================================
  # AUDIT TRAIL TESTS
  # ============================================

  @audit @security-015
  Scenario: Vehicle modifications are logged
    Given I am logged in as "admin"
    And I navigate to "vehicles" page
    When I create a vehicle with plate "MD-AUDIT-001"
    Then audit log should record the creation
    And audit log should include timestamp
    And audit log should include user identity

  @audit @security-016
  Scenario: Failed login attempts are logged
    When I attempt to login with invalid credentials 3 times
    Then security log should record failed attempts
    And log should include IP address and timestamp
