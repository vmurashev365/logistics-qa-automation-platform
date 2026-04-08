# Mobile Testing Strategy

## Executive Summary

This document outlines the strategy for implementing mobile test automation for the **Driver Mobile Application**,
a critical component of the fleet management ecosystem.
The mobile app enables 200+ truck drivers to receive dispatches, scan bills of lading, update odometer readings,
and communicate with dispatch centers.

**Current Status**: Phase 1 (Architecture Design) ✅ Complete  
**Next Phase**: Phase 2 (Implementation) ⏳ Pending APK/IPA access  
**Target Completion**: Q2 2026

---

## Current Status

### Phase 1: Architecture & Planning ✅ COMPLETE

**Completed Activities**:

- ✅ Technology evaluation (Appium vs Detox vs Maestro)
- ✅ Selected stack: Appium 2.0 + WebDriverIO + TypeScript
- ✅ Architecture design (Page Object Model pattern)
- ✅ Test scenario identification (20+ scenarios documented)
- ✅ CI/CD integration design (GitHub Actions with Android emulator)

**Decision Rationale**:

- **Appium 2.0**: Cross-platform (Android + iOS), mature ecosystem, W3C WebDriver standard
- **WebDriverIO**: TypeScript support, excellent documentation, built-in services
- **Page Object Model**: Consistency with existing Playwright web tests

### Phase 2: Implementation ⏳ PENDING

**Blockers**:

1. **APK Access**: Awaiting production/staging APK from the development team
2. **iOS IPA**: TestFlight build or .ipa file for iOS testing
3. **Backend Access**: Test environment API endpoints for driver app
4. **Credentials**: Test driver accounts (5-10 accounts for parallel testing)

**Estimated Start Date**: Once APK/IPA available (target: March 2026)

---

## Architecture Overview

### Technology Stack

```text
┌─────────────────────────────────────────────┐
│           Test Framework Layer              │
│  Cucumber + TypeScript + WebDriverIO        │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│         Appium Server (v2.0+)               │
│  - Android: UiAutomator2 Driver             │
│  - iOS: XCUITest Driver                     │
└─────────────────────────────────────────────┘
                    ↓
┌──────────────────┬──────────────────────────┐
│  Android Devices │    iOS Devices           │
│  - Emulator      │    - Simulator           │
│  - Real Device   │    - Real Device         │
└──────────────────┴──────────────────────────┘
```

### Project Structure (Planned)

```text
src/
├── mobile/
│   ├── config/
│   │   ├── android.config.ts          # Android capabilities
│   │   ├── ios.config.ts              # iOS capabilities
│   │   └── wdio.conf.ts               # WebDriverIO config
│   ├── pages/
│   │   ├── base/
│   │   │   └── MobileBasePage.ts      # Base page object
│   │   ├── driver-app/
│   │   │   ├── LoginPage.ts           # Login screen
│   │   │   ├── DispatchListPage.ts    # Assignments list
│   │   │   ├── TripDetailPage.ts      # Trip details
│   │   │   ├── ScannerPage.ts         # BOL scanner
│   │   │   ├── OdometerPage.ts        # Odometer entry
│   │   │   └── SettingsPage.ts        # App settings
│   │   └── common/
│   │       ├── NotificationPage.ts    # Push notifications
│   │       └── PermissionsPage.ts     # OS permissions
│   ├── steps/
│   │   ├── mobile-navigation.steps.ts
│   │   ├── mobile-interaction.steps.ts
│   │   └── driver-workflows.steps.ts
│   └── utils/
│       ├── gestures.ts                # Swipe, scroll helpers
│       ├── permissions.ts             # Handle OS dialogs
│       └── device-helpers.ts          # Device-specific utils
features/
├── mobile/
│   ├── driver-login.feature
│   ├── dispatch-management.feature
│   ├── bol-scanning.feature
│   ├── odometer-tracking.feature
│   └── offline-mode.feature
```

---

## Target Application: Driver Mobile App

### Key Features

| Feature            | Description                          | Test Priority |
| ------------------ | ------------------------------------ | ------------- |
| **Authentication** | Login with phone number + PIN        | 🔴 Critical   |
| **Dispatch List**  | View assigned loads/deliveries       | 🔴 Critical   |
| **Trip Details**   | View pickup/dropoff locations, times | 🟡 High       |
| **BOL Scanning**   | Scan bills of lading (QR/barcode)    | 🔴 Critical   |
| **Odometer Entry** | Log odometer at pickup/dropoff       | 🟡 High       |
| **Status Updates** | Mark loads as picked up/delivered    | 🔴 Critical   |
| **Photos**         | Upload proof of delivery photos      | 🟡 High       |
| **Navigation**     | Open Google Maps/Waze                | 🟢 Medium     |
| **Messages**       | In-app chat with dispatch            | 🟡 High       |
| **Offline Mode**   | Cache data, sync when online         | 🟡 High       |

### Technology (Assumed Based on Industry Standards)

- **Platform**: React Native or Flutter (awaiting confirmation)
- **Backend API**: REST (possibly same Odoo JSON-RPC used by web)
- **Authentication**: JWT tokens, refresh token mechanism
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **Storage**: AsyncStorage/SecureStorage for tokens

---

## Configuration Examples

### Android Configuration (UiAutomator2)

```typescript
// src/mobile/config/android.config.ts
import { Options } from '@wdio/types';

export const androidConfig: Options.Testrunner = {
  capabilities: [
    {
      platformName: 'Android',
      'appium:platformVersion': '12.0',
      'appium:deviceName': 'Android Emulator',
      'appium:automationName': 'UiAutomator2',
      'appium:app': './apps/example-driver.apk',
      'appium:appPackage': 'com.example.driver',
      'appium:appActivity': '.MainActivity',
      'appium:autoGrantPermissions': true,
      'appium:noReset': false,
      'appium:fullReset': false,
      'appium:newCommandTimeout': 300,
      'appium:uiautomator2ServerInstallTimeout': 60000,
    },
  ],

  // Services
  services: [
    [
      'appium',
      {
        command: 'appium',
        args: {
          port: 4723,
          address: 'localhost',
          logLevel: 'info',
        },
      },
    ],
  ],

  // Test configuration
  framework: 'cucumber',
  cucumberOpts: {
    require: ['./src/mobile/steps/**/*.ts'],
    backtrace: false,
    requireModule: ['ts-node/register'],
    dryRun: false,
    failFast: false,
    snippets: true,
    source: true,
    strict: false,
    tagExpression: '@mobile',
    timeout: 60000,
  },
};
```

### iOS Configuration (XCUITest)

```typescript
// src/mobile/config/ios.config.ts
import { Options } from '@wdio/types';

export const iosConfig: Options.Testrunner = {
  capabilities: [
    {
      platformName: 'iOS',
      'appium:platformVersion': '16.0',
      'appium:deviceName': 'iPhone 14',
      'appium:automationName': 'XCUITest',
      'appium:app': './apps/example-driver.ipa',
      'appium:bundleId': 'com.example.driver',
      'appium:xcodeOrgId': process.env.APPLE_TEAM_ID,
      'appium:xcodeSigningId': 'iPhone Developer',
      'appium:autoAcceptAlerts': true,
      'appium:noReset': false,
      'appium:fullReset': false,
      'appium:newCommandTimeout': 300,
    },
  ],

  services: [
    [
      'appium',
      {
        command: 'appium',
        args: {
          port: 4723,
          address: 'localhost',
          logLevel: 'info',
        },
      },
    ],
  ],

  framework: 'cucumber',
  cucumberOpts: {
    require: ['./src/mobile/steps/**/*.ts'],
    tagExpression: '@mobile and @ios',
    timeout: 60000,
  },
};
```

---

## Planned Page Objects

### Base Mobile Page

```typescript
// src/mobile/pages/base/MobileBasePage.ts
export class MobileBasePage {
  protected driver: WebdriverIO.Browser;

  constructor(driver: WebdriverIO.Browser) {
    this.driver = driver;
  }

  // Platform detection
  get isAndroid(): boolean {
    return this.driver.isAndroid;
  }

  get isIOS(): boolean {
    return this.driver.isIOS;
  }

  // Common gestures
  async swipeLeft(element?: WebdriverIO.Element): Promise<void> {
    const target = element || (await this.driver.$('android=new UiSelector()'));
    await target.touchAction([
      { action: 'press', x: 300, y: 500 },
      { action: 'wait', ms: 200 },
      { action: 'moveTo', x: 50, y: 500 },
      'release',
    ]);
  }

  async scrollToElement(selector: string): Promise<void> {
    if (this.isAndroid) {
      await this.driver.$(
        `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(${selector})`
      );
    } else {
      await this.driver.execute('mobile: scroll', { direction: 'down' });
    }
  }

  // Wait helpers
  async waitForElement(selector: string, timeout = 10000): Promise<void> {
    await this.driver.$(selector).waitForDisplayed({ timeout });
  }
}
```

### Login Page

```typescript
// src/mobile/pages/driver-app/LoginPage.ts
import { MobileBasePage } from '../base/MobileBasePage';

export class LoginPage extends MobileBasePage {
  // Selectors (Android)
  private get phoneInput() {
    return this.isAndroid ? this.driver.$('~phone-input') : this.driver.$('~phoneInput');
  }

  private get pinInput() {
    return this.isAndroid ? this.driver.$('~pin-input') : this.driver.$('~pinInput');
  }

  private get loginButton() {
    return this.driver.$('~login-button');
  }

  private get errorMessage() {
    return this.driver.$('~error-message');
  }

  // Actions
  async login(phoneNumber: string, pin: string): Promise<void> {
    await this.phoneInput.waitForDisplayed({ timeout: 10000 });
    await this.phoneInput.setValue(phoneNumber);
    await this.pinInput.setValue(pin);
    await this.loginButton.click();
  }

  async isLoggedIn(): Promise<boolean> {
    // Wait for dispatch list screen
    await this.driver.pause(2000); // Wait for transition
    return await this.driver.$('~dispatch-list').isDisplayed();
  }

  async getErrorMessage(): Promise<string> {
    await this.errorMessage.waitForDisplayed({ timeout: 5000 });
    return await this.errorMessage.getText();
  }
}
```

### Scanner Page

```typescript
// src/mobile/pages/driver-app/ScannerPage.ts
import { MobileBasePage } from '../base/MobileBasePage';

export class ScannerPage extends MobileBasePage {
  private get cameraView() {
    return this.driver.$('~camera-view');
  }

  private get scanResult() {
    return this.driver.$('~scan-result');
  }

  private get manualEntryButton() {
    return this.driver.$('~manual-entry-button');
  }

  private get manualInput() {
    return this.driver.$('~manual-bol-input');
  }

  // Mock scanning in test environment
  async scanBOL(bolNumber: string): Promise<void> {
    // In test env, use manual entry instead of camera
    await this.manualEntryButton.click();
    await this.manualInput.setValue(bolNumber);
    await this.driver.$('~submit-button').click();
  }

  async getScanResult(): Promise<string> {
    await this.scanResult.waitForDisplayed({ timeout: 5000 });
    return await this.scanResult.getText();
  }

  async requestCameraPermission(): Promise<void> {
    if (this.isAndroid) {
      await this.driver.$('android=new UiSelector().text("Allow")').click();
    } else {
      await this.driver.execute('mobile: alert', { action: 'accept' });
    }
  }
}
```

---

## Test Scenarios

### Happy Path Scenarios (Priority 1)

| Scenario ID | Description                         | Estimated Duration |
| ----------- | ----------------------------------- | ------------------ |
| **MOB-001** | Driver login with valid credentials | 30 seconds         |
| **MOB-002** | View list of assigned dispatches    | 15 seconds         |
| **MOB-003** | Open trip details (pickup/dropoff)  | 20 seconds         |
| **MOB-004** | Scan BOL at pickup location         | 45 seconds         |
| **MOB-005** | Update odometer reading             | 30 seconds         |
| **MOB-006** | Mark load as picked up              | 20 seconds         |
| **MOB-007** | Mark load as delivered              | 20 seconds         |
| **MOB-008** | Upload proof of delivery photo      | 40 seconds         |
| **MOB-009** | View trip history                   | 15 seconds         |
| **MOB-010** | Send message to dispatch            | 30 seconds         |

### Edge Case Scenarios (Priority 2)

| Scenario ID | Description                     | Test Complexity |
| ----------- | ------------------------------- | --------------- |
| **MOB-011** | Login with invalid credentials  | Low             |
| **MOB-012** | Handle expired JWT token        | Medium          |
| **MOB-013** | Airplane mode / no connectivity | High            |
| **MOB-014** | Poor network (3G, high latency) | Medium          |
| **MOB-015** | GPS signal lost during trip     | Medium          |
| **MOB-016** | Camera permission denied        | Low             |
| **MOB-017** | App backgrounded during scan    | Medium          |
| **MOB-018** | Device low battery (< 10%)      | Low             |
| **MOB-019** | OS notification interrupts      | Medium          |
| **MOB-020** | Force logout by dispatch        | High            |

### Integration Scenarios (Priority 3)

| Scenario ID | Description                        | Backend Dependency |
| ----------- | ---------------------------------- | ------------------ |
| **MOB-021** | Data sync after coming online      | Odoo API           |
| **MOB-022** | Push notification for new dispatch | FCM + Odoo         |
| **MOB-023** | Real-time location tracking        | GPS + Odoo         |
| **MOB-024** | Driver check-in/check-out          | Odoo Fleet API     |
| **MOB-025** | Multi-device login detection       | Odoo Sessions      |

---

## Example Feature Files

### Feature: Driver Login

```gherkin
@mobile @driver-app @authentication
Feature: Driver Authentication
  As a truck driver
  I want to log into the mobile app
  So that I can access my dispatches

  Background:
    Given the Driver Mobile App is installed
    And I am on the login screen

  @smoke @MOB-001
  Scenario: Successful login with valid credentials
    When I enter phone number "+14155551234"
    And I enter PIN "1234"
    And I tap "Login" button
    Then I should see the dispatch list screen
    And I should see "Welcome, John" text

  @negative @MOB-011
  Scenario: Login fails with invalid PIN
    When I enter phone number "+14155551234"
    And I enter PIN "0000"
    And I tap "Login" button
    Then I should see "Invalid PIN" error message
    And I should remain on the login screen

  @security @MOB-012
  Scenario: Login fails after 3 invalid attempts
    When I enter phone number "+14155551234"
    And I enter PIN "0000" and tap Login
    And I enter PIN "1111" and tap Login
    And I enter PIN "2222" and tap Login
    Then I should see "Account locked" error message
    And the login form should be disabled
```

### Feature: BOL Scanning

```gherkin
@mobile @driver-app @scanning
Feature: Bill of Lading Scanning
  As a truck driver
  I want to scan bills of lading
  So that I can confirm pickups quickly

  Background:
    Given I am logged in as driver "John Smith"
    And I have an assigned trip "TRIP-12345"
    And I am at the pickup location

  @critical @MOB-004
  Scenario: Scan BOL successfully using camera
    When I navigate to trip "TRIP-12345"
    And I tap "Scan BOL" button
    And the camera permission is granted
    And I scan BOL barcode "BOL-987654321"
    Then I should see "BOL scanned successfully" message
    And the trip status should show "Picked Up"

  @MOB-016
  Scenario: Camera permission denied - use manual entry
    When I navigate to trip "TRIP-12345"
    And I tap "Scan BOL" button
    And the camera permission is denied
    Then I should see "Manual Entry" option
    When I tap "Manual Entry"
    And I enter BOL number "BOL-987654321"
    And I tap "Submit"
    Then I should see "BOL recorded" message

  @offline @MOB-013
  Scenario: Scan BOL in offline mode
    Given the device is in airplane mode
    When I navigate to trip "TRIP-12345"
    And I tap "Scan BOL" button
    And I enter BOL number "BOL-987654321" manually
    Then I should see "Saved offline" message
    When I return to online mode
    Then the BOL should sync to backend within 30 seconds
    And the backend should show BOL "BOL-987654321" for trip "TRIP-12345"
```

---

## Implementation Timeline

### 4-Week Implementation Plan

#### Week 1: Environment Setup & Foundation

**Deliverables**:

- ✅ Install Appium 2.0 and drivers (UiAutomator2, XCUITest)
- ✅ Configure WebDriverIO with TypeScript
- ✅ Set up Android emulator with API 31+
- ✅ Set up iOS simulator (Xcode)
- ✅ Create base page objects (MobileBasePage)
- ✅ Implement gesture helpers (swipe, scroll)
- ✅ Configure CI/CD pipeline for mobile tests

**Tasks**:

```bash
# Install dependencies
npm install --save-dev @wdio/cli @wdio/local-runner @wdio/cucumber-framework
npm install --save-dev @wdio/appium-service appium
npm install --save-dev appium-uiautomator2-driver appium-xcuitest-driver

# Initialize WebDriverIO
npx wdio config

# Install Appium drivers
appium driver install uiautomator2
appium driver install xcuitest
```

#### Week 2: Page Objects & Core Flows

**Deliverables**:

- ✅ LoginPage (authentication)
- ✅ DispatchListPage (view assignments)
- ✅ TripDetailPage (view trip info)
- ✅ 5 happy path scenarios (MOB-001 to MOB-005)

**Focus**: Get end-to-end flow working (login → view dispatches → view trip)

#### Week 3: Advanced Features

**Deliverables**:

- ✅ ScannerPage (BOL scanning)
- ✅ OdometerPage (odometer entry)
- ✅ NotificationPage (push notifications)
- ✅ 5 feature scenarios (MOB-006 to MOB-010)

**Focus**: Test camera, location, and notification permissions

#### Week 4: Edge Cases & Polish

**Deliverables**:

- ✅ Offline mode handling
- ✅ Error state testing (no network, expired token)
- ✅ Performance testing (app launch time, API latency)
- ✅ 5 edge case scenarios (MOB-011 to MOB-015)
- ✅ Documentation and team training

**Focus**: Stability, error handling, CI/CD integration

---

## Dependencies

### Critical Dependencies

| Dependency               | Owner            | Status     | ETA        |
| ------------------------ | ---------------- | ---------- | ---------- |
| **Android APK**          | Platform Team | ⏳ Pending | March 2026 |
| **iOS IPA**              | Platform Team | ⏳ Pending | March 2026 |
| **Test API Endpoints**   | Backend Team     | ⏳ Pending | March 2026 |
| **Driver Test Accounts** | System Administrator    | ⏳ Pending | March 2026 |
| **FCM Test Credentials** | DevOps Team   | ⏳ Pending | April 2026 |

### Environment Requirements

**Development**:

- macOS (for iOS testing) or Windows/Linux (Android only)
- Android Studio with SDK 31+
- Xcode 14+ (for iOS)
- Node.js 20+
- Appium 2.0+

**CI/CD**:

- GitHub Actions runner (self-hosted for iOS)
- Docker image with Android emulator
- Appium server in container

**Devices**:

- Android emulator (Pixel 5, API 31)
- iOS simulator (iPhone 14, iOS 16)
- Optional: Real devices for final validation

---

## Risks & Mitigation

### High-Risk Items

| Risk                        | Probability | Impact   | Mitigation                                 |
| --------------------------- | ----------- | -------- | ------------------------------------------ |
| **APK access delayed**      | High        | Critical | Use demo APK from similar app for POC      |
| **iOS code signing issues** | Medium      | High     | Request pre-signed IPA from dev team       |
| **Appium flakiness**        | Medium      | Medium   | Implement retry logic, explicit waits      |
| **Device fragmentation**    | Medium      | Medium   | Test on 3 Android versions, 2 iOS versions |
| **App updates break tests** | High        | High     | Version-pin APK/IPA in test environment    |

### Mitigation Strategies

**1. Delayed APK Access**:

- **Action**: Build POC using open-source React Native demo app
- **Benefit**: Validate architecture and page objects early
- **Timeline**: 2-week POC while waiting for APK

**2. Test Flakiness**:

```typescript
// Implement retry decorator
export function retry(attempts = 3) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      for (let i = 0; i < attempts; i++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          if (i === attempts - 1) throw error;
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    };
  };
}
```

**3. Device Fragmentation**:

- **Android**: Test on API 29 (Android 10), API 31 (Android 12), API 33 (Android 13)
- **iOS**: Test on iOS 15.5, iOS 16.4
- **Devices**: Pixel 5, Samsung Galaxy S21, iPhone 12, iPhone 14

**4. CI/CD Integration**:

```yaml
# .github/workflows/mobile-tests.yml
name: Mobile Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  android-tests:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v2

      - name: Create AVD and run tests
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 31
          arch: x86_64
          script: npm run test:mobile:android
```

---

## Success Metrics

### Phase 2 Completion Criteria

- [ ] 20+ mobile test scenarios implemented
- [ ] 95%+ test pass rate on stable builds
- [ ] < 10 minutes test execution time (full suite)
- [ ] Tests run in CI/CD on every PR
- [ ] Page objects cover 100% of critical user flows
- [ ] Documentation complete (setup guide, troubleshooting)

### Long-Term Goals

- **Coverage**: 80%+ of driver app features tested
- **Reliability**: < 5% flaky test rate
- **Speed**: Test results within 15 minutes
- **Maintenance**: < 4 hours/week maintaining tests

---

## References

- **Appium Documentation**: <https://appium.io/docs/en/2.0/>
- **WebDriverIO Guide**: <https://webdriver.io/docs/gettingstarted>
- **React Native Testing**: <https://reactnative.dev/docs/testing-overview>
- **Mobile Testing Best Practices**: <https://www.browserstack.com/guide/mobile-testing-best-practices>

---

## Appendix: Commands

### Appium Server

```bash
# Start Appium server
appium --port 4723 --log-level info

# List installed drivers
appium driver list --installed

# Update driver
appium driver update uiautomator2
```

### Android Emulator

```bash
# List available AVDs
emulator -list-avds

# Start emulator
emulator -avd Pixel_5_API_31 -no-snapshot-load

# List connected devices
adb devices
```

### iOS Simulator

```bash
# List available simulators
xcrun simctl list devices

# Boot simulator
xcrun simctl boot "iPhone 14"

# Install app
xcrun simctl install booted ./apps/example-driver.app
```

---

**Document Owner**: QA Architect  
**Last Updated**: January 13, 2026  
**Next Review**: March 2026 (upon APK access)  
**Status**: Phase 1 Complete, Phase 2 Pending
