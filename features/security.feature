@security @critical
Feature: Security and Access Control
  As a system administrator
  I want Odoo to refuse access that is not authenticated or not authorised
  So that fleet data is only seen and changed by the people allowed to

  # ============================================
  # AUTHENTICATION TESTS
  # ============================================

  @authentication @security-001
  Scenario: Anonymous user cannot read fleet data via API
    When I call "search_read" on "fleet.vehicle" through JSON-RPC without a session
    Then Odoo should refuse the call as "Session expired" and return no data

  @authentication @security-002 @browser
  Scenario: Invalid credentials are rejected
    Given I am on the "login" page
    When I fill "login" field with "invalid_user"
    And I fill "password" field with "wrong_password"
    And I click "login" button
    Then the login page should say "Wrong login/password"
    And I should not be signed in

  @authentication @security-003 @browser
  Scenario: Empty credentials are not submitted
    Given I am on the "login" page
    When I click "login" button
    Then the browser should refuse to submit the login form with an empty "login" field
    And I should not be signed in

  @authentication @security-004 @browser
  Scenario: SQL injection in login is rejected like any wrong password
    Given I am on the "login" page
    When I fill "login" field with "admin' OR '1'='1"
    And I fill "password" field with "anything' OR '1'='1"
    And I click "login" button
    Then the login page should say "Wrong login/password"
    And I should not be signed in

  # ============================================
  # AUTHORIZATION TESTS
  # ============================================

  @authorization @security-005 @browser
  Scenario: Administrator can open the fleet vehicles list
    Given I am logged in as admin
    When I navigate to "vehicles" page
    Then the vehicles list should be shown
    And page title should contain "Vehicles"

  @authorization @security-006 @browser @odoo-api
  Scenario: A user without administrator rights is refused the system parameters
    Given I am signed in as a fleet user without administrator rights
    When I navigate to "/web#action=base.ir_config_list_action"
    Then Odoo should show an "Access Error" about "System Parameter" records
    And no system parameters should be listed

  # ============================================
  # SESSION SECURITY TESTS
  # ============================================

  @session @security-007 @browser
  Scenario: Session expires after logout
    Given I am logged in as admin
    When I navigate to "vehicles" page
    And I logout
    Then I should be on "login" page
    When I navigate to "vehicles" page
    Then I should be redirected to "login" page

  @session @security-008 @browser
  Scenario: Direct URL access requires authentication
    When I navigate to "vehicles" page
    Then I should be on "login" page
    And page URL should contain "login"

  # ============================================
  # INPUT VALIDATION TESTS
  # ============================================

  @input-validation @security-009 @browser @odoo-api
  Scenario: Script in a license plate is stored as text and never run
    Given I am logged in as admin
    And I navigate to "vehicles" page
    And the page is watched for script execution
    When I click "create" button
    And I fill "licensePlate" field with "MD-XSS-<img src=x onerror='window.__xss_triggered=true'>"
    And I choose vehicle model "Audi/A1"
    And I click "save" button
    Then vehicle "MD-XSS-<img src=x onerror='window.__xss_triggered=true'>" should be saved in Odoo with model "Audi/A1"
    When I navigate to "vehicles" page
    Then the vehicles list should show the plate "MD-XSS-<img src=x onerror='window.__xss_triggered=true'>" as text
    And no script from the license plate should have run

  @input-validation @security-010 @browser @odoo-api
  Scenario: SQL text in the vehicle search is treated as a search term
    Given I am logged in as admin
    And I navigate to "vehicles" page
    When I search for "'; DROP TABLE fleet_vehicle; --"
    Then the vehicles search for "'; DROP TABLE fleet_vehicle; --" should find no vehicles
    And no database error should occur
    And Odoo should still answer vehicle queries through JSON-RPC

  # ============================================
  # BRUTE-FORCE PROTECTION
  # Odoo counts failed logins per source address, so the lockout refuses the right
  # password too and affects everything that signs in from this machine: @serial keeps
  # other scenarios from running next to it in a parallel run.
  # ============================================

  @authentication @lockout @serial @security-011 @browser @odoo-api
  Scenario: Repeated failed logins lock out further attempts for a while
    Given Odoo is configured to lock out logins from one address after 3 failed attempts for 10 seconds
    When I attempt to login with invalid credentials 3 times
    And I try to sign in with the administrator credentials
    Then the login page should say "Too many login failures, please wait a bit before trying again."
    And I should not be signed in
    When the login lockout period has passed
    And I try to sign in with the administrator credentials
    Then I should be signed in as the administrator

  # ============================================
  # API SECURITY TESTS
  # ============================================

  @api-security @security-012
  Scenario: Session information is refused without a session
    When I call "/web/session/get_session_info" through JSON-RPC without a session
    Then Odoo should refuse the call as "Session expired" and return no data

  # ============================================
  # GDPR / DATA PRIVACY TESTS
  # ============================================

  # @wip: Odoo 17 Community with Fleet has no anonymisation feature to request. The scenario
  # records the requirement; the suites exclude @wip, and its "When" step is pending.
  @gdpr @security-013 @wip @odoo-api
  Scenario: Personal data can be anonymized
    Given driver "Test Driver GDPR" exists in the system
    And driver "Test Driver GDPR" has personal data stored
    When I request data anonymization for driver "Test Driver GDPR"
    Then driver "Test Driver GDPR" personal data should be anonymized

  @gdpr @security-014 @odoo-api
  Scenario: Data export includes all personal information
    Given driver "Test Driver Export" exists with full profile
    When I export driver "Test Driver Export" with Odoo's data export
    Then the export should contain the stored name, email, phone, street, city and country of driver "Test Driver Export"

  # ============================================
  # AUDIT TRAIL TESTS
  # ============================================

  @audit @security-015 @browser @odoo-api
  Scenario: Vehicle creation is recorded in the vehicle history
    Given I am logged in as admin
    And I navigate to "vehicles" page
    When I create a vehicle with plate "MD-AUDIT-001"
    Then the history of vehicle "MD-AUDIT-001" should record "Vehicle created" by the signed-in user during this scenario

  @audit @security-016 @browser
  Scenario: Failed login attempts are written to the Odoo server log
    When I attempt to login with invalid credentials 3 times
    Then the Odoo server log should record each failed login with its source IP address and time
