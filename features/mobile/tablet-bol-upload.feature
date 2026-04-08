@tablet @critical @module_loads
Feature: Tablet BOL Upload
  As a fleet driver or owner-operator
  I want to upload Bill of Lading documents from my tablet
  So that I can digitize paperwork while on the road

  Background:
    Given Odoo is accessible at "http://localhost:8069"
    And I login with username "admin" and password "admin"

  # ========================================
  # BOL Photo Upload Scenarios
  # ========================================

  @galaxy-tab @camera @smoke
  Scenario: BOL photo upload on Galaxy Tab from camera
    Given I am using "galaxy-tab" device
    And I navigate to "loads" page
    When I open load details for load "LD-2024-001"
    And I click "Upload BOL" button
    Then I should see the upload modal
    When I click "Take Photo" button
    And I capture a document photo
    And I confirm the photo capture
    Then I should see the photo preview
    When I click "Upload" button
    Then I should see "BOL uploaded successfully" message
    And the BOL should be attached to the load

  @ipad-mini @camera @smoke
  Scenario: BOL photo upload on iPad Mini from camera
    Given I am using "ipad-mini" device
    And I navigate to "loads" page
    When I open load details for load "LD-2024-001"
    And I click "Upload BOL" button
    Then I should see the upload modal
    When I click "Take Photo" button
    And I capture a document photo
    And I confirm the photo capture
    Then I should see the photo preview
    When I click "Upload" button
    Then I should see "BOL uploaded successfully" message

  @galaxy-tab @gallery
  Scenario: BOL upload from device gallery
    Given I am using "galaxy-tab" device
    And I navigate to "loads" page
    When I open load details for load "LD-2024-002"
    And I click "Upload BOL" button
    And I click "Choose from Gallery" button
    And I select image "bol_sample.jpg" from gallery
    Then I should see the photo preview
    When I click "Upload" button
    Then I should see "BOL uploaded successfully" message

  # ========================================
  # Touch Target Accessibility
  # ========================================

  @galaxy-tab @accessibility @glove-mode
  Scenario: Touch targets meet minimum size for glove usage
    Given I am using "galaxy-tab" device
    And I navigate to "loads" page
    When I open load details for load "LD-2024-001"
    Then touch targets should be at least 48px
    And the "Upload BOL" button should be at least 48px
    And the "Accept Load" button should be at least 48px
    And the "Decline Load" button should be at least 48px

  @ipad-mini @accessibility
  Scenario: Touch targets meet minimum size on iPad
    Given I am using "ipad-mini" device
    And I navigate to "loads" page
    When I open load details for load "LD-2024-001"
    Then touch targets should be at least 48px
    And interactive elements should have 8px spacing

  @galaxy-tab @accessibility @thumb-zone
  Scenario: Primary actions are in thumb-reachable zone
    Given I am using "galaxy-tab" device
    And I navigate to "loads" page
    When I open load details for load "LD-2024-001"
    Then element "Accept Load" should be in thumb-reachable zone
    And element "Upload BOL" should be in thumb-reachable zone
    And element "navigation" should be in thumb-reachable zone

  @ipad-mini @accessibility @thumb-zone
  Scenario: Primary actions in thumb zone for portrait iPad
    Given I am using "ipad-mini" device
    And I navigate to "loads" page
    When I open load details for load "LD-2024-001"
    Then element "Upload BOL" should be in thumb-reachable zone
    And element "bottom navigation" should be in thumb-reachable zone

  # ========================================
  # Keyboard Overlay Handling
  # ========================================

  @galaxy-tab @keyboard
  Scenario: Form remains visible when keyboard appears on Galaxy Tab
    Given I am using "galaxy-tab" device
    And I navigate to "loads" page
    When I open load details for load "LD-2024-001"
    And I click "Add Note" button
    And I focus on the notes text field
    Then form should remain visible above keyboard
    And the "Save" button should be visible
    When I type "Driver note: Arrived at pickup location"
    Then the text should be visible in the input field

  @ipad-mini @keyboard
  Scenario: Form scrolls to keep input visible on iPad
    Given I am using "ipad-mini" device
    And I navigate to "drivers" page
    When I click "Add Driver" button
    And I fill the driver form:
      | field       | value           |
      | firstName   | John            |
      | lastName    | Doe             |
      | email       | john@test.com   |
      | phone       | 555-123-4567    |
    Then form should remain visible above keyboard
    And the "Save" button should remain accessible

  @tablet @keyboard @scrolling
  Scenario: Long form scrolls properly with keyboard open
    Given I am using "galaxy-tab" device
    And I navigate to "vehicles" page
    When I click "create" button
    And I fill "licensePlate" with "MD-TAB-001"
    Then form should remain visible above keyboard
    When I scroll to "odometer" field
    And I fill "odometer" with "50000"
    Then form should remain visible above keyboard
    And I should be able to submit the form

  # ========================================
  # Offline Upload Queue
  # ========================================

  @galaxy-tab @offline @critical
  Scenario: BOL queued for upload in offline mode
    Given I am using "galaxy-tab" device
    And I navigate to "loads" page
    And the network is "offline"
    When I open load details for load "LD-2024-003"
    And I click "Upload BOL" button
    And I click "Take Photo" button
    And I capture a document photo
    And I confirm the photo capture
    And I click "Upload" button
    Then I should see "Queued for upload" message
    And the offline queue should show 1 pending item
    And the sync indicator should show "Offline"

  @galaxy-tab @offline @sync
  Scenario: Queued uploads sync when back online
    Given I am using "galaxy-tab" device
    And I have 3 pending uploads in the offline queue
    And the network is "offline"
    When the network changes to "4G"
    Then the sync indicator should show "Syncing"
    And the offline queue should start processing
    When all uploads complete successfully
    Then the offline queue should be empty
    And I should see "All documents synced" message

  @ipad-mini @offline @rural
  Scenario: Multiple documents queued during rural coverage gap
    Given I am using "ipad-mini" device
    And I navigate to "loads" page
    And the network is "3G"
    When I upload BOL for load "LD-2024-004"
    And the network drops to "offline"
    And I upload BOL for load "LD-2024-005"
    And I upload POD for load "LD-2024-006"
    Then the offline queue should show 2 pending items
    And the first upload should complete when reconnected
    When the network changes to "4G"
    Then the offline queue should process remaining items
    And all documents should be uploaded successfully

  @tablet @offline @retry
  Scenario: Failed upload retries automatically
    Given I am using "galaxy-tab" device
    And I have a pending upload that failed
    And the network is "4G"
    When the retry interval elapses
    Then the system should retry the upload
    And the upload should complete successfully
    And the item should be removed from queue

  @tablet @offline @queue-limit
  Scenario: Queue shows warning when approaching limit
    Given I am using "galaxy-tab" device
    And I have 45 pending uploads in the offline queue
    And the network is "offline"
    When I try to upload another document
    Then I should see "Queue almost full (45/50)" warning
    When the queue reaches 50 items
    Then I should see "Queue full - connect to sync" error
    And further uploads should be blocked

  # ========================================
  # Orientation Change Handling
  # ========================================

  @galaxy-tab @orientation @landscape
  Scenario: Dashboard maintains layout after orientation change
    Given I am using "galaxy-tab" device
    And the device orientation is "landscape"
    And I navigate to "dashboard" page
    Then I should see the ELD dashboard layout
    When I rotate device to "portrait"
    Then the dashboard should adapt to portrait layout
    And all controls should remain accessible
    When I rotate device to "landscape"
    Then the dashboard should return to landscape layout

  @ipad-mini @orientation @portrait
  Scenario: Document scanner handles orientation change
    Given I am using "ipad-mini" device
    And the device orientation is "portrait"
    And I am on the document scanner screen
    When I rotate device to "landscape"
    Then the scanner viewfinder should adapt
    And the capture button should remain in thumb zone
    When I rotate device to "portrait"
    Then the scanner should return to portrait mode

  @tablet @orientation @form-data
  Scenario: Form data preserved during orientation change
    Given I am using "galaxy-tab" device
    And I navigate to "vehicles" page
    And I click "create" button
    And I fill "licensePlate" with "MD-ORIENT-001"
    And I fill "model" with "Freightliner Cascadia"
    When I rotate device to "portrait"
    Then "licensePlate" field should contain "MD-ORIENT-001"
    And "model" field should contain "Freightliner Cascadia"
    When I rotate device to "landscape"
    Then all form data should be preserved

  # ========================================
  # Signature Capture (Owner-Operator)
  # ========================================

  @ipad-mini @signature @pod
  Scenario: Capture delivery signature on POD
    Given I am using "ipad-mini" device
    And I navigate to "loads" page
    When I open load details for load "LD-2024-007"
    And I click "Capture POD Signature" button
    Then I should see the signature capture pad
    And touch targets should be at least 48px
    When I draw a signature on the pad
    And I click "Save Signature" button
    Then the signature should be attached to the POD
    And I should see "Signature captured" message

  @ipad-mini @signature @clear
  Scenario: Clear and redraw signature
    Given I am using "ipad-mini" device
    And I am on the signature capture screen
    When I draw a signature on the pad
    And I click "Clear" button
    Then the signature pad should be empty
    When I draw a new signature
    And I click "Save Signature" button
    Then the new signature should be saved

  # ========================================
  # Error Handling
  # ========================================

  @tablet @error @upload-failure
  Scenario: Handle upload failure gracefully
    Given I am using "galaxy-tab" device
    And I navigate to "loads" page
    When I attempt to upload an oversized file
    Then I should see "File too large (max 10MB)" error
    And the upload modal should remain open
    And I should be able to retry with a smaller file

  @tablet @error @camera-permission
  Scenario: Handle camera permission denied
    Given I am using "ipad-mini" device
    And camera permission is denied
    When I click "Take Photo" button
    Then I should see "Camera access required" message
    And I should see option to open settings
    And "Choose from Gallery" should remain available
