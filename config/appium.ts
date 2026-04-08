/**
 * Appium Configuration Helper
 * 
 * Loads platform-specific Appium capabilities from appium.json
 * and resolves environment variable placeholders.
 * 
 * Usage:
 *   const caps = getCapabilities('android');
 *   const url = getAppiumUrl();
 */

import * as appiumConfig from './appium.json';

/**
 * Supported mobile platforms
 */
export type Platform = 'android' | 'ios';

/**
 * Appium capability configuration
 */
export interface AppiumCapabilities {
  platformName: string;
  automationName: string;
  deviceName: string;
  platformVersion?: string;
  app?: string;
  bundleId?: string;
  appPackage?: string;
  appActivity?: string;
  [key: string]: any;
}

/**
 * Get Appium capabilities for specified platform
 * 
 * Loads configuration from appium.json and replaces environment variable
 * placeholders with actual values from process.env.
 * 
 * @param platform - Target platform ('android' or 'ios')
 * @returns Appium capabilities object with resolved environment variables
 * @throws Error if platform is invalid or required environment variables are missing
 * 
 * @example
 * ```typescript
 * // Set environment variable
 * process.env.ANDROID_APP_PATH = './apps/driver.apk';
 * 
 * // Get capabilities
 * const caps = getCapabilities('android');
 * console.log(caps.app); // './apps/driver.apk'
 * ```
 */
export function getCapabilities(platform: Platform): AppiumCapabilities {
  if (!['android', 'ios'].includes(platform)) {
    throw new Error(`Invalid platform: ${platform}. Must be 'android' or 'ios'.`);
  }

  // Get base capabilities from config
  const baseCaps = appiumConfig[platform];
  if (!baseCaps) {
    throw new Error(`No configuration found for platform: ${platform}`);
  }

  // Clone to avoid mutating original config
  const capabilities: AppiumCapabilities = JSON.parse(JSON.stringify(baseCaps));

  // Resolve environment variable placeholders
  const resolvedCaps = resolveEnvVariables(capabilities, platform);

  // Validate required fields
  validateCapabilities(resolvedCaps, platform);

  return resolvedCaps;
}

/**
 * Get Appium server URL
 * 
 * Returns the Appium server URL from APPIUM_URL environment variable,
 * or defaults to 'http://localhost:4723' if not set.
 * 
 * @returns Appium server URL
 * 
 * @example
 * ```typescript
 * const url = getAppiumUrl();
 * console.log(url); // 'http://localhost:4723'
 * 
 * process.env.APPIUM_URL = 'http://192.168.1.100:4723';
 * console.log(getAppiumUrl()); // 'http://192.168.1.100:4723'
 * ```
 */
export function getAppiumUrl(): string {
  return process.env.APPIUM_URL || 'http://localhost:4723';
}

/**
 * Resolve environment variable placeholders in capabilities
 * 
 * Replaces ${VAR_NAME} patterns with values from process.env.
 * 
 * @param capabilities - Capabilities object with placeholders
 * @param platform - Target platform (for error messages)
 * @returns Capabilities with resolved values
 * @private
 */
function resolveEnvVariables(
  capabilities: Record<string, any>,
  platform: Platform
): AppiumCapabilities {
  const resolved: Record<string, any> = {};

  for (const [key, value] of Object.entries(capabilities)) {
    if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
      // Extract environment variable name
      const envVarName = value.slice(2, -1); // Remove ${ and }
      const envValue = process.env[envVarName];

      if (!envValue) {
        // Special handling for optional variables
        if (isOptionalEnvVar(envVarName, platform)) {
          console.warn(`⚠️  Optional env var ${envVarName} not set for ${platform}`);
          resolved[key] = value; // Keep placeholder
          continue;
        }

        throw new Error(
          `Environment variable ${envVarName} is required for ${platform} but not set. ` +
          `Please set it in your .env file or environment.`
        );
      }

      resolved[key] = envValue;
    } else {
      resolved[key] = value;
    }
  }

  return resolved as AppiumCapabilities;
}

/**
 * Check if environment variable is optional for platform
 * 
 * @param envVarName - Environment variable name
 * @param platform - Target platform
 * @returns true if variable is optional
 * @private
 */
function isOptionalEnvVar(envVarName: string, platform: Platform): boolean {
  const optionalVars: Record<Platform, string[]> = {
    android: ['APPLE_TEAM_ID'],
    ios: ['ANDROID_APP_PATH'],
  };

  return optionalVars[platform]?.includes(envVarName) || false;
}

/**
 * Validate required capability fields
 * 
 * @param capabilities - Capabilities to validate
 * @param platform - Target platform
 * @throws Error if required fields are missing
 * @private
 */
function validateCapabilities(capabilities: AppiumCapabilities, platform: Platform): void {
  const requiredFields: Record<Platform, string[]> = {
    android: ['platformName', 'automationName', 'deviceName'],
    ios: ['platformName', 'automationName', 'deviceName'],
  };

  const required = requiredFields[platform];
  const missing = required.filter(field => !capabilities[field]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required capabilities for ${platform}: ${missing.join(', ')}`
    );
  }

  // Check app or bundleId is provided
  if (platform === 'ios' && !capabilities.app && !capabilities.bundleId) {
    console.warn('⚠️  Neither app nor bundleId specified for iOS. Using default bundleId.');
  }

  if (platform === 'android' && !capabilities.app && !capabilities.appPackage) {
    console.warn('⚠️  Neither app nor appPackage specified for Android. Using default appPackage.');
  }
}

/**
 * Get all available platforms
 * 
 * @returns Array of platform names
 */
export function getAvailablePlatforms(): Platform[] {
  return Object.keys(appiumConfig) as Platform[];
}

/**
 * Check if platform configuration exists
 * 
 * @param platform - Platform name to check
 * @returns true if platform is configured
 */
export function isPlatformSupported(platform: string): platform is Platform {
  return platform in appiumConfig;
}

/**
 * Get raw configuration without environment variable resolution
 * 
 * Useful for debugging or inspecting the base configuration.
 * 
 * @param platform - Target platform
 * @returns Raw capabilities from appium.json
 */
export function getRawCapabilities(platform: Platform): AppiumCapabilities {
  if (!isPlatformSupported(platform)) {
    throw new Error(`Invalid platform: ${platform}`);
  }
  return JSON.parse(JSON.stringify(appiumConfig[platform]));
}
