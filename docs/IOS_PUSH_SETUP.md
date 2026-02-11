# iOS Native Push Notifications Setup (APNs)

This document describes how to configure iOS native push notifications using Apple Push Notification service (APNs) for the NG Server.

## Overview

The server now supports both **Web Push** (for browser notifications) and **iOS Native Push** (APNs) simultaneously. This allows:

1. **Web Push**: Continue sending notifications to web browsers (existing functionality)
2. **iOS Native Push**: Send notifications to iOS devices through APNs
3. **Multi-provider System**: Automatically routes push notifications to the correct provider based on device platform

## Architecture

The push notification system uses:

- **MultiPushProvider**: Routes notifications to appropriate provider based on platform
- **WebPushProvider**: Handles web browser push notifications (existing)
- **APNsPushProvider**: Handles iOS native push notifications (new)

When a notification is sent, the system:
1. Groups devices by platform (web, ios, android)
2. Sends to each platform using the appropriate provider
3. Handles platform-specific token validation and errors

## iOS APNs Setup

### Prerequisites

1. An Apple Developer account
2. Access to the Apple Developer Portal
3. An iOS app configured with your Bundle ID

### Step 1: Create an APNs Authentication Key

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles** → **Keys**
3. Click the **+** button to create a new key
4. Enter a name (e.g., "NG Server APNs Key")
5. Check **Apple Push Notifications service (APNs)**
6. Click **Continue** and **Register**
7. **Download** the `.p8` key file (you can only download it once!)
8. Note the **Key ID** (shown on the confirmation page)
9. Note your **Team ID** (found in the top right of the developer portal or in Membership section)

### Step 2: Configure Environment Variables

Add the following environment variables to your `.env` file or Railway environment:

```bash
# APNs Configuration
APNS_KEY_ID=ABC1234567                    # Your 10-character Key ID
APNS_TEAM_ID=XYZ9876543                   # Your 10-character Team ID
APNS_BUNDLE_ID=com.neighbor-guard.app     # Your iOS app's Bundle ID
APNS_PRODUCTION=false                     # false for sandbox, true for production

# Option 1: Provide path to .p8 file
APNS_KEY_PATH=/path/to/AuthKey_ABC1234567.p8

# Option 2: Or paste the key content directly (for Railway/cloud)
# APNS_KEY_CONTENT=-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMG...your key...\n-----END PRIVATE KEY-----
```

**For Railway deployment**, use `APNS_KEY_CONTENT` instead of `APNS_KEY_PATH`:

1. Open your `.p8` file in a text editor
2. Copy the entire content including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
3. Replace newlines with `\n`
4. Set as `APNS_KEY_CONTENT` environment variable in Railway

### Step 3: Update iOS App Configuration

In your iOS app, ensure:

1. **Enable Push Notifications capability** in Xcode
2. **Request notification permissions** from the user
3. **Register for remote notifications**:

```swift
import UserNotifications

// Request permission
UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
    if granted {
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }
}

// Receive device token
func application(_ application: UIApplication, 
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    print("Device Token: \(token)")
    
    // Send this token to your server
    registerDeviceToken(token: token)
}

func registerDeviceToken(token: String) {
    // POST to /v1/push/devices
    let body = [
        "platform": "ios",
        "token": token,
        "deviceId": UIDevice.current.identifierForVendor?.uuidString,
        "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String,
        "locale": Locale.current.identifier,
        "timezone": TimeZone.current.identifier
    ]
    
    // Send to server (use your JWT token for authentication)
    // POST https://your-server.com/v1/push/devices
}
```

### Step 4: Register Device with Server

Once your iOS app obtains the device token, register it with the server:

**Endpoint**: `POST /v1/push/devices`

**Headers**:
```
Authorization: Bearer <user-jwt-token>
Content-Type: application/json
```

**Body**:
```json
{
  "platform": "ios",
  "token": "device-token-from-apns",
  "deviceId": "uuid-from-device",
  "appVersion": "1.0.0",
  "locale": "en_US",
  "timezone": "America/Los_Angeles"
}
```

**Response**:
```json
{
  "ok": true,
  "device": {
    "id": "device-uuid",
    "userId": "user-uuid",
    "platform": "ios",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

## Testing

### 1. Verify APNs Configuration

Check the server logs on startup. You should see:

```
[APNsPushProvider] APNsPushProvider initialized (SANDBOX)
[MultiPushProvider] MultiPushProvider initialized with WebPush and APNs
```

### 2. Test Push Notification

Use the test endpoint:

```bash
curl -X POST https://your-server.com/v1/notifications/test-push \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json"
```

### 3. Check Device Receives Notification

Your iOS device should receive a push notification if:
- APNs is configured correctly
- The device token is registered
- The app has notification permissions
- The device is connected to the internet

## Environment Configuration Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `APNS_KEY_ID` | Yes (for iOS) | 10-character APNs Key ID | `ABC1234567` |
| `APNS_TEAM_ID` | Yes (for iOS) | 10-character Apple Team ID | `XYZ9876543` |
| `APNS_KEY_PATH` | One of PATH or CONTENT | Path to .p8 key file | `/keys/AuthKey_ABC.p8` |
| `APNS_KEY_CONTENT` | One of PATH or CONTENT | Content of .p8 key file | `-----BEGIN PRIVATE KEY-----\n...` |
| `APNS_BUNDLE_ID` | No | iOS app Bundle ID (default: `com.neighbor-guard.app`) | `com.your.app` |
| `APNS_PRODUCTION` | No | Use production APNs (default: `false`) | `true` or `false` |

## Migration Strategy

As requested, the current approach is:

1. **Phase 1 (Current)**: Keep both Web Push and iOS Push active
   - Web Push continues to work for browsers
   - iOS Push is available for iOS devices
   - Both can run simultaneously

2. **Phase 2 (After iOS Push is Stable)**: Disable Web Push
   - Remove or comment out `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` from environment
   - WebPushProvider will gracefully skip sending (returns "not configured")
   - Only iOS (and Android in future) will receive native push

## Troubleshooting

### APNs Not Initializing

**Symptom**: Log shows "APNs not configured"

**Solutions**:
- Verify all required environment variables are set: `APNS_KEY_ID`, `APNS_TEAM_ID`, and either `APNS_KEY_PATH` or `APNS_KEY_CONTENT`
- Check that the key file path is correct and accessible
- Ensure the key content is properly formatted with `\n` for newlines

### Push Not Received on Device

**Possible causes**:
1. **Wrong APNs environment**: If using sandbox key with production app or vice versa
   - Solution: Set `APNS_PRODUCTION=true` for production apps
2. **Invalid device token**: Token might be expired or invalid
   - Solution: Re-register the device
3. **App not configured for push**: Push capability not enabled in Xcode
   - Solution: Enable Push Notifications in Xcode capabilities
4. **Bundle ID mismatch**: `APNS_BUNDLE_ID` doesn't match your app
   - Solution: Set correct Bundle ID in environment variables

### Token Errors

**Symptom**: "BadDeviceToken" or "Unregistered" in logs

**Solution**:
- Device token has expired or is invalid
- System automatically removes invalid tokens
- Re-register the device from the iOS app

## API Reference

### Register Push Device
`POST /v1/push/devices`

Register a device to receive push notifications.

**Request Body**:
```typescript
{
  platform: 'ios' | 'android' | 'web',
  token: string,              // Device token from APNs/FCM or subscription from Web Push
  deviceId?: string,          // Device identifier
  appVersion?: string,        // App version
  locale?: string,            // User locale
  timezone?: string           // User timezone
}
```

### Unregister Push Device
`DELETE /v1/push/devices/:pushDeviceId`

Remove a device from receiving push notifications.

### Test Push
`POST /v1/notifications/test-push`

Send a test push notification to all registered devices for the authenticated user.

## Security Considerations

1. **Protect your APNs Key**: The `.p8` key file should be kept secure and never committed to version control
2. **Use Environment Variables**: Always use environment variables for sensitive configuration
3. **Production vs Sandbox**: Use sandbox for development/testing, production for App Store builds
4. **Token Validation**: The system automatically removes invalid tokens to keep the database clean

## Next Steps

After iOS push is working successfully:
1. Monitor push delivery rates and errors
2. Consider adding analytics/metrics
3. Optionally disable Web Push if no longer needed
4. Add Android push support (FCM) following similar pattern

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Verify APNs configuration in Apple Developer Portal
3. Test with sandbox environment first before production
4. Ensure iOS app code is correctly handling device tokens
