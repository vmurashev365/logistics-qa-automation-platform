Feature: HOS compliance and ELD integration

  @integration @hos @eld @compliance @critical
  Scenario: 11-hour driving warning approaches limit
    Given demo HOS context for driver "D1" and vehicle "V1"
    And driver "D1" starts OFF_DUTY for 600 minutes
    When driver "D1" drives for 600 minutes
    Then HOS status for driver "D1" should show WARNING for "DRIVE_11"
    And remaining driving minutes for "D1" should be 60

  @integration @hos @eld @compliance @critical
  Scenario: 11-hour driving violation
    Given demo HOS context for driver "D1" and vehicle "V1"
    And driver "D1" starts OFF_DUTY for 600 minutes
    When driver "D1" drives for 700 minutes
    Then HOS status for driver "D1" should show VIOLATION for "DRIVE_11"

  @integration @hos @eld @compliance
  Scenario: 14-hour duty window violation
    Given demo HOS context for driver "D1" and vehicle "V1"
    And driver "D1" starts OFF_DUTY for 600 minutes
    When driver "D1" is ON_DUTY for 850 minutes
    Then HOS status for driver "D1" should show VIOLATION for "DUTY_14"

  @integration @hos @eld @compliance
  Scenario: 30-minute break violation after 8 hours driving
    Given demo HOS context for driver "D1" and vehicle "V1"
    And driver "D1" starts OFF_DUTY for 600 minutes
    When driver "D1" drives for 485 minutes
    Then HOS status for driver "D1" should show VIOLATION for "BREAK_30"

  @integration @hos @eld @compliance
  Scenario: 30-minute break qualifies and clears requirement
    Given demo HOS context for driver "D1" and vehicle "V1"
    And driver "D1" starts OFF_DUTY for 600 minutes
    When driver "D1" drives for 240 minutes
    And driver "D1" is ON_DUTY for 30 minutes
    And driver "D1" drives for 240 minutes
    Then no HOS violations should be present for "D1"

  @integration @hos @eld @compliance
  Scenario: 70-hour cycle violation across simulated days
    Given demo HOS context for driver "D1" and vehicle "V1"
    And driver "D1" starts OFF_DUTY for 600 minutes
    When driver "D1" is ON_DUTY for 720 minutes
    And driver "D1" starts OFF_DUTY for 600 minutes
    And driver "D1" is ON_DUTY for 720 minutes
    And driver "D1" starts OFF_DUTY for 600 minutes
    And driver "D1" is ON_DUTY for 720 minutes
    And driver "D1" starts OFF_DUTY for 600 minutes
    And driver "D1" is ON_DUTY for 720 minutes
    And driver "D1" starts OFF_DUTY for 600 minutes
    And driver "D1" is ON_DUTY for 720 minutes
    And driver "D1" starts OFF_DUTY for 600 minutes
    And driver "D1" is ON_DUTY for 720 minutes
    Then HOS status for driver "D1" should show VIOLATION for "CYCLE_70_8"

  @integration @hos @eld @compliance
  Scenario: 34-hour restart clears cycle violation
    Given demo HOS context for driver "D1" and vehicle "V1"
    And driver "D1" starts OFF_DUTY for 600 minutes
    When driver "D1" is ON_DUTY for 720 minutes
    And driver "D1" starts OFF_DUTY for 600 minutes
    And driver "D1" is ON_DUTY for 720 minutes
    And driver "D1" starts OFF_DUTY for 600 minutes
    And driver "D1" is ON_DUTY for 720 minutes
    And driver "D1" starts OFF_DUTY for 600 minutes
    And driver "D1" is ON_DUTY for 720 minutes
    And driver "D1" starts OFF_DUTY for 600 minutes
    And driver "D1" is ON_DUTY for 720 minutes
    And driver "D1" starts OFF_DUTY for 600 minutes
    And driver "D1" is ON_DUTY for 720 minutes
    Then HOS status for driver "D1" should show VIOLATION for "CYCLE_70_8"
    And driver "D1" starts OFF_DUTY for 2040 minutes
    Then no HOS violations should be present for "D1"

  @integration @hos @eld @compliance
  Scenario: Duty status transitions remain compliant
    Given demo HOS context for driver "D1" and vehicle "V1"
    And driver "D1" starts OFF_DUTY for 600 minutes
    When driver "D1" is ON_DUTY for 120 minutes
    And driver "D1" drives for 180 minutes
    And driver "D1" starts OFF_DUTY for 60 minutes
    Then no HOS violations should be present for "D1"

  @integration @hos @eld @compliance
  Scenario: Motion start triggers deterministic driving
    Given demo HOS context for driver "D1" and vehicle "V1"
    And driver "D1" starts OFF_DUTY for 600 minutes
    When driver "D1" drives for 15 minutes
    Then remaining driving minutes for "D1" should be 645
    And DOT inspection data for "D1" for 1 days should be generated
