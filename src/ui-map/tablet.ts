/**
 * UI-MAP: Tablet-Specific Selectors and Constants
 * 
 * Maps tablet-specific UI elements for BOL upload, document scanning,
 * and mobile-optimized fleet management workflows.
 * 
 * Usage:
 *   import { TabletSelectors, TabletConstants } from '../ui-map/tablet';
 *   const btn = TabletSelectors.uploadModal.cameraButton;
 *   const minSize = TabletConstants.MIN_TOUCH_TARGET;
 */

/**
 * Tablet-specific UI element selectors
 * Organized by functional area for fleet driver and owner-operator workflows
 */
export const TabletSelectors = {
  /**
   * BOL Upload Modal - Bill of Lading document capture
   */
  uploadModal: {
    container: '[data-testid="bol-upload-modal"], .o_dialog.modal',
    title: '.modal-title, .o_dialog_title',
    closeButton: '[data-testid="modal-close"], .btn-close, .o_dialog_close',
    cameraButton: '[data-testid="camera-capture"], button:has-text("Take Photo"), .o_camera_button',
    galleryButton: '[data-testid="gallery-select"], button:has-text("Choose from Gallery"), .o_gallery_button',
    fileInput: 'input[type="file"][accept*="image"], input.o_file_input',
    previewImage: '[data-testid="image-preview"], .o_preview_image, img.preview',
    uploadButton: '[data-testid="upload-submit"], button:has-text("Upload"), .o_upload_button',
    cancelButton: '[data-testid="upload-cancel"], button:has-text("Cancel")',
    progressBar: '[data-testid="upload-progress"], .progress, .o_progress_bar',
    progressText: '[data-testid="upload-progress-text"], .progress-text',
    retakeButton: '[data-testid="retake-photo"], button:has-text("Retake")',
  },

  /**
   * Offline Queue Indicator - Shows pending uploads
   */
  offlineQueue: {
    indicator: '[data-testid="offline-queue"], .offline-indicator, .o_offline_banner',
    count: '[data-testid="queue-count"], .queue-count, .o_queue_badge',
    syncButton: '[data-testid="sync-now"], button:has-text("Sync"), .o_sync_button',
    retryButton: '[data-testid="retry-upload"], button:has-text("Retry")',
    pendingList: '[data-testid="pending-uploads"], .pending-list',
    pendingItem: '[data-testid="pending-item"], .pending-item',
    statusIcon: '[data-testid="sync-status"], .sync-status-icon',
  },

  /**
   * Document Scanner - BOL/POD capture interface
   */
  scanner: {
    viewfinder: '[data-testid="scanner-viewfinder"], .scanner-view, .o_camera_preview',
    captureButton: '[data-testid="capture-button"], .capture-btn, .o_capture_button',
    flashToggle: '[data-testid="flash-toggle"], .flash-toggle',
    switchCamera: '[data-testid="switch-camera"], .camera-switch',
    cropOverlay: '[data-testid="crop-overlay"], .crop-frame',
    confirmCapture: '[data-testid="confirm-capture"], button:has-text("Use Photo")',
    discardCapture: '[data-testid="discard-capture"], button:has-text("Discard")',
  },

  /**
   * Signature Capture - Digital signature pad
   */
  signaturePad: {
    canvas: '[data-testid="signature-canvas"], canvas.signature-pad, .o_signature_canvas',
    clearButton: '[data-testid="clear-signature"], button:has-text("Clear")',
    saveButton: '[data-testid="save-signature"], button:has-text("Save")',
    drawingArea: '[data-testid="drawing-area"], .drawing-area',
    instructions: '[data-testid="sign-instructions"], .signature-instructions',
  },

  /**
   * Touch-Optimized Form Controls
   */
  touchForm: {
    largeInput: 'input.o_input, input.form-control',
    largeButton: 'button.btn, .o_button',
    dropdown: '.o_field_widget select, .o_dropdown',
    datePickerTrigger: '.o_datepicker_input, [data-testid="date-picker"]',
    checkbox: 'input[type="checkbox"], .o_checkbox_input',
    radioButton: 'input[type="radio"], .o_radio_input',
  },

  /**
   * Navigation Elements - Bottom nav for thumb access
   */
  navigation: {
    bottomNav: '[data-testid="bottom-nav"], .bottom-navigation, .o_mobile_nav',
    tabBar: '[data-testid="tab-bar"], .tab-bar',
    homeTab: '[data-testid="nav-home"], [aria-label="Home"]',
    loadsTab: '[data-testid="nav-loads"], [aria-label="Loads"]',
    chatTab: '[data-testid="nav-chat"], [aria-label="Chat"]',
    profileTab: '[data-testid="nav-profile"], [aria-label="Profile"]',
  },

  /**
   * Load Management - Driver load assignment UI
   */
  loadManagement: {
    loadCard: '[data-testid="load-card"], .load-card, .o_kanban_record',
    loadId: '[data-testid="load-id"], .load-id',
    originAddress: '[data-testid="origin-address"], .origin',
    destinationAddress: '[data-testid="destination-address"], .destination',
    acceptButton: '[data-testid="accept-load"], button:has-text("Accept")',
    declineButton: '[data-testid="decline-load"], button:has-text("Decline")',
    detailsButton: '[data-testid="load-details"], button:has-text("Details")',
    statusBadge: '[data-testid="load-status"], .status-badge',
  },

  /**
   * Driver Chat - In-app messaging UI
   */
  driverChat: {
    container: '[data-testid="chat-container"], .chat-container, .o_mail_thread',
    messageInput: '[data-testid="message-input"], textarea.chat-input, .o_composer_text_field',
    sendButton: '[data-testid="send-message"], button:has-text("Send"), .o_composer_send',
    messageList: '[data-testid="message-list"], .message-list, .o_mail_thread_content',
    messageItem: '[data-testid="message-item"], .message, .o_mail_message',
    attachButton: '[data-testid="attach-file"], .attach-button, .o_composer_attachment_button',
  },

  /**
   * Keyboard and Input Handling
   */
  keyboard: {
    keyboardOverlay: '.keyboard-spacer, [data-keyboard-spacer]',
    scrollContainer: '.scroll-container, [data-scroll-on-focus]',
    focusedInput: ':focus',
  },
} as const;

/**
 * Tablet-specific constants for touch optimization and network handling
 */
export const TabletConstants = {
  /**
   * Touch Target Sizes (in pixels)
   * Based on WCAG 2.1 AAA and Material Design guidelines
   */
  MIN_TOUCH_TARGET: 48,              // Minimum for glove-friendly interaction (WCAG)
  RECOMMENDED_TOUCH_TARGET: 56,      // Recommended for large buttons
  TOUCH_TARGET_SPACING: 8,           // Minimum space between touch targets

  /**
   * Thumb Zone Calculations
   * Bottom 60% of screen is easily reachable with one-handed use
   */
  THUMB_ZONE_RATIO: 0.6,             // Bottom 60% of screen
  THUMB_ZONE_MARGIN: 20,             // Margin from bottom edge (px)
  SAFE_AREA_TOP: 44,                 // iOS safe area top (notch)
  SAFE_AREA_BOTTOM: 34,              // iOS safe area bottom (home indicator)

  /**
   * Network Timeouts (in milliseconds)
   * Adjusted for varying cellular coverage in rural/highway areas
   */
  UPLOAD_TIMEOUT_4G: 10000,          // 10 seconds for good 4G
  UPLOAD_TIMEOUT_3G: 30000,          // 30 seconds for 3G/rural
  UPLOAD_TIMEOUT_OFFLINE: 0,         // Queue for later (no timeout)
  SYNC_RETRY_INTERVAL: 30000,        // Retry sync every 30 seconds
  CONNECTION_CHECK_INTERVAL: 5000,   // Check connectivity every 5 seconds

  /**
   * File Upload Limits
   */
  MAX_FILE_SIZE_MB: 10,              // Maximum file size in MB
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/heic', 'image/webp'],
  COMPRESSION_QUALITY: 0.8,          // JPEG compression quality

  /**
   * Animation and Timing
   */
  KEYBOARD_ANIMATION_MS: 300,        // Keyboard show/hide animation
  ORIENTATION_DEBOUNCE_MS: 100,      // Debounce for orientation changes
  SCROLL_INTO_VIEW_DELAY_MS: 150,    // Delay before scrolling input into view
  LONG_PRESS_MS: 500,                // Long press gesture duration

  /**
   * Viewport Breakpoints
   */
  TABLET_MIN_WIDTH: 600,             // Minimum tablet width
  TABLET_MAX_WIDTH: 1400,            // Maximum tablet width
  LANDSCAPE_MIN_ASPECT_RATIO: 1.3,   // Aspect ratio threshold for landscape

  /**
   * Offline Queue Limits
   */
  MAX_QUEUE_SIZE: 50,                // Maximum items in offline queue
  QUEUE_STORAGE_KEY: 'logistics_offline_queue',
} as const;

/**
 * Device-specific configurations
 */
export const DeviceProfiles = {
  /**
   * Galaxy Tab Active4 Pro - Fleet Driver Configuration
   */
  'galaxy-tab': {
    name: 'Galaxy Tab Active4 Pro',
    platform: 'Android' as const,
    osVersion: '13',
    model: 'SM-T636B',
    viewport: { width: 1200, height: 800 },
    orientation: 'landscape' as const,
    deviceScaleFactor: 2,
    useCase: 'ELD Dashboard',
    features: ['rugged', 'glove-mode', 'sunlight-readable'],
    touchTargetMultiplier: 1.2,      // 20% larger touch targets for gloves
  },

  /**
   * iPad Mini 6 - Owner-Operator Configuration
   */
  'ipad-mini': {
    name: 'iPad Mini 6',
    platform: 'iOS' as const,
    osVersion: '17',
    model: 'iPad14,1',
    viewport: { width: 744, height: 1133 },
    orientation: 'portrait' as const,
    deviceScaleFactor: 2,
    useCase: 'Document Scanner',
    features: ['camera-optimized', 'portable', 'signature-capture'],
    touchTargetMultiplier: 1.0,      // Standard touch targets
  },
} as const;

/**
 * Network condition profiles for testing
 */
export const NetworkProfiles = {
  '4G': {
    downloadThroughput: 4 * 1024 * 1024,    // 4 Mbps
    uploadThroughput: 1 * 1024 * 1024,      // 1 Mbps
    latency: 50,                            // 50ms
  },
  '3G': {
    downloadThroughput: 750 * 1024,         // 750 Kbps
    uploadThroughput: 250 * 1024,           // 250 Kbps
    latency: 200,                           // 200ms
  },
  'offline': {
    downloadThroughput: 0,
    uploadThroughput: 0,
    latency: 0,
    offline: true,
  },
} as const;

/**
 * Type exports for TypeScript consumers
 */
export type TabletSelectorKey = keyof typeof TabletSelectors;
export type DeviceProfileKey = keyof typeof DeviceProfiles;
export type NetworkProfileKey = keyof typeof NetworkProfiles;
