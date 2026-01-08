# FusionAuth OAuth Demo - React Native App

This is a [**React Native**](https://reactnative.dev) project demonstrating OAuth 2.0 / OpenID Connect authentication with FusionAuth using `react-native-app-auth`.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Required NPM Packages](#required-npm-packages)
- [Platform-Specific Setup](#platform-specific-setup)
  - [iOS Setup](#ios-setup)
  - [Android Setup](#android-setup)
- [How It Works](#how-it-works)
  - [OAuth Flow with FusionAuth](#oauth-flow-with-fusionauth)
  - [Deep Linking](#deep-linking)
- [Configuration](#configuration)
- [Running the App](#running-the-app)
- [Troubleshooting](#troubleshooting)

## Prerequisites

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

- Node.js >= 20
- React Native 0.83+
- iOS: Xcode, CocoaPods
- Android: Android Studio, JDK
- FusionAuth server running (default: `http://localhost:9011`)

## Installation

### Step 1: Install Dependencies

```sh
# Install npm packages
npm install

# For iOS, install CocoaPods dependencies
cd ios
bundle exec pod install
cd ..
```

## Required NPM Packages

### Core Dependencies

| Package | Version | Purpose |
|--------|---------|---------|
| `react-native-app-auth` | ^8.1.0 | OAuth 2.0 / OpenID Connect authentication library. Handles the complete OAuth flow including login, token exchange, and redirect handling. |
| `react-native-keychain` | ^10.0.0 | Secure storage for tokens. Stores access tokens, refresh tokens, and other sensitive data in iOS Keychain / Android Keystore. |

### Why These Packages?

- **`react-native-app-auth`**: 
  - Implements OAuth 2.0 Authorization Code Flow with PKCE
  - Uses native secure browsers (ASWebAuthenticationSession on iOS, Custom Tabs on Android)
  - Follows RFC 8252 best practices (no WebViews)
  - Supports any OAuth 2.0 / OpenID Connect provider

- **`react-native-keychain`**:
  - Provides encrypted, secure storage for sensitive tokens
  - Persists tokens across app restarts
  - Uses platform-native secure storage (Keychain/Keystore)
  - Prevents tokens from being lost when app closes

## Platform-Specific Setup

### iOS Setup

#### Files Created/Modified

##### 1. **Created: `ios/AwesomeProject/AwesomeProject-Bridging-Header.h`**

**Purpose**: Exposes Objective-C headers to Swift code.

**Why Needed**: 
- `react-native-app-auth` is written in Objective-C
- Your `AppDelegate.swift` is in Swift
- Swift cannot directly import Objective-C modules
- Bridging header acts as a translation layer

**Contents**:
```objective-c
#import <React/RCTBridgeModule.h>
#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>
#import "RNAppAuth.h"
#import "RNAppAuthAuthorizationFlowManager.h"
#import "RNAppAuthAuthorizationFlowManagerDelegate.h"
```

##### 2. **Modified: `ios/AwesomeProject/AppDelegate.swift`**

**Changes Made**:

1. **Protocol Conformance** (Line 6):
   ```swift
   class AppDelegate: UIResponder, UIApplicationDelegate, RNAppAuthAuthorizationFlowManager
   ```
   - **Why**: Required by `react-native-app-auth` to handle OAuth redirects
   - **Purpose**: Makes AppDelegate the authorization flow manager

2. **Authorization Flow Delegate Property** (Line 8):
   ```swift
   weak var authorizationFlowManagerDelegate: RNAppAuthAuthorizationFlowManagerDelegate?
   ```
   - **Why**: Required protocol property
   - **Purpose**: Stores reference to the OAuth flow delegate

3. **URL Handling Method** (Lines 35-47):
   ```swift
   func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
     // Handle OAuth redirect URL for react-native-app-auth
     if let delegate = authorizationFlowManagerDelegate,
        delegate.resumeExternalUserAgentFlow(with: url) {
       return true
     }
     // Fallback to React Native Linking Manager
     return RCTLinkingManager.application(app, open: url, options: options)
   }
   ```
   - **Why**: Handles deep link redirects from OAuth provider
   - **Purpose**: 
     - First tries to resume OAuth flow (if active)
     - Falls back to React Native's Linking Manager for other deep links
     - Critical for OAuth redirect URL to work

##### 3. **Modified: `ios/AwesomeProject.xcodeproj/project.pbxproj`**

**Changes Made**:
- Added `SWIFT_OBJC_BRIDGING_HEADER` build setting to Debug and Release configurations
- Value: `"AwesomeProject/AwesomeProject-Bridging-Header.h"`

**Why**: Tells Xcode where to find the bridging header file so Swift can access Objective-C code.

##### 4. **Already Configured: `ios/AwesomeProject/Info.plist`**

**URL Scheme Configuration** (Lines 25-34):
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>fusionauth.demo</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>fusionauth.demo</string>
    </array>
  </dict>
</array>
```

**Why**: 
- Registers custom URL scheme `fusionauth.demo://`
- Allows OAuth provider to redirect back to your app
- Must match `redirectUrl` in your config (`fusionauth.demo:/oauthredirect`)

**Network Security** (Lines 40-54):
```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsLocalNetworking</key>
  <true/>
  <key>NSExceptionDomains</key>
  <dict>
    <key>localhost</key>
    <dict>
      <key>NSExceptionAllowsInsecureHTTPLoads</key>
      <true/>
    </dict>
  </dict>
</dict>
```

**Why**: Allows HTTP connections to localhost (for local FusionAuth server)

### Android Setup

#### Files Modified

##### 1. **Modified: `android/app/src/main/AndroidManifest.xml`**

**Deep Link Intent Filter** (if not auto-added):
```xml
<activity
  android:name=".MainActivity"
  android:launchMode="singleTask"
  android:exported="true">
  <!-- ... existing intent filters ... -->
  
  <!-- OAuth Redirect Intent Filter -->
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="fusionauth.demo" />
  </intent-filter>
</activity>
```

**Why**: 
- Registers `fusionauth.demo://` URL scheme
- Allows OAuth provider to redirect back to your app
- `singleTask` launch mode prevents multiple instances

**Note**: `react-native-app-auth` may auto-add this via autolinking. Verify it exists.

##### 2. **Network Security Configuration**

If using HTTP (not HTTPS) for local FusionAuth:

**Create**: `android/app/src/main/res/xml/network_security_config.xml`
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
    </domain-config>
</network-security-config>
```

**Update**: `AndroidManifest.xml`
```xml
<application
  android:networkSecurityConfig="@xml/network_security_config"
  ...>
```

**Why**: Allows HTTP connections to localhost (Android emulator uses `10.0.2.2` for host machine)

##### 3. **No Changes Needed: `MainApplication.kt`**

**Why**: React Native autolinking automatically registers `react-native-app-auth` package. No manual code changes required.

## How It Works

### OAuth Flow with FusionAuth

Here's the complete OAuth 2.0 Authorization Code Flow with PKCE:

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Your App  │         │  FusionAuth  │         │   Browser    │
│  (React     │         │   Server      │         │  (Secure)    │
│   Native)   │         │              │         │              │
└──────┬──────┘         └──────┬───────┘         └──────┬───────┘
       │                        │                        │
       │ 1. authorize()        │                        │
       │───────────────────────>│                        │
       │                        │                        │
       │ 2. Open Browser        │                        │
       │─────────────────────────────────────────────────>│
       │                        │                        │
       │                        │ 3. User Logs In        │
       │                        │<───────────────────────│
       │                        │                        │
       │                        │ 4. Authorization Code  │
       │                        │───────────────────────>│
       │                        │                        │
       │ 5. Redirect with Code  │                        │
       │<─────────────────────────────────────────────────│
       │ fusionauth.demo://     │                        │
       │ oauthredirect?code=... │                        │
       │                        │                        │
       │ 6. Exchange Code       │                        │
       │    for Tokens          │                        │
       │───────────────────────>│                        │
       │                        │                        │
       │ 7. Return Tokens       │                        │
       │<───────────────────────│                        │
       │ {                      │                        │
       │   accessToken,         │                        │
       │   refreshToken,        │                        │
       │   idToken              │                        │
       │ }                      │                        │
       │                        │                        │
       │ 8. Store in Keychain   │                        │
       │                        │                        │
```

#### Step-by-Step Flow:

1. **User Clicks "Login"** → `authorize(config)` is called
2. **App Opens Secure Browser** → Native browser (SFSafariViewController on iOS, Custom Tabs on Android)
3. **User Authenticates** → Enters credentials on FusionAuth login page
4. **FusionAuth Redirects** → `fusionauth.demo:/oauthredirect?code=ABC123&state=XYZ`
5. **App Receives Redirect** → `AppDelegate.application(_:open:options:)` handles URL
6. **OAuth Flow Resumes** → `react-native-app-auth` processes the redirect
7. **Code Exchange** → App exchanges authorization code for tokens
8. **Tokens Received** → Access token, refresh token, ID token
9. **Secure Storage** → Tokens stored in Keychain/Keystore
10. **App Ready** → User is authenticated, tokens available for API calls

### Deep Linking

#### How Deep Links Work in OAuth:

1. **URL Scheme Registration**:
   - iOS: `Info.plist` → `CFBundleURLSchemes`
   - Android: `AndroidManifest.xml` → `intent-filter` with `data android:scheme`

2. **OAuth Redirect**:
   - FusionAuth redirects to: `fusionauth.demo:/oauthredirect?code=...`
   - OS recognizes the URL scheme and opens your app

3. **App Receives URL**:
   - iOS: `AppDelegate.application(_:open:options:)`
   - Android: `MainActivity` receives intent

4. **OAuth Library Handles It**:
   - `react-native-app-auth` processes the redirect
   - Extracts authorization code
   - Exchanges code for tokens

#### Deep Link Flow:

```
FusionAuth Server
      │
      │ Redirect: fusionauth.demo:/oauthredirect?code=ABC123
      │
      ▼
Operating System
      │
      │ Recognizes URL scheme "fusionauth.demo"
      │
      ▼
Your App Opens
      │
      │ AppDelegate.application(_:open:options:)
      │ or MainActivity receives Intent
      │
      ▼
react-native-app-auth
      │
      │ Processes redirect
      │ Extracts code
      │ Exchanges for tokens
      │
      ▼
Your App Code
      │
      │ Receives tokens
      │ Stores in Keychain
      │ Updates UI
```

## Configuration

### FusionAuth Configuration

Edit `config.ts` to match your FusionAuth setup:

```typescript
export const configs: {fusionauth: AuthConfiguration} = {
  fusionauth: {
    serviceConfiguration: {
      authorizationEndpoint: 'http://localhost:9011/oauth2/authorize',
      tokenEndpoint: 'http://localhost:9011/oauth2/token',
      revocationEndpoint: 'http://localhost:9011/oauth2/revoke',
    },
    clientId: 'YOUR_CLIENT_ID',
    clientSecret: 'YOUR_CLIENT_SECRET',
    redirectUrl: 'fusionauth.demo:/oauthredirect',
    scopes: ['openid', 'profile', 'email'],
    dangerouslyAllowInsecureHttpRequests: true, // Only for localhost
  },
};
```

### URL Configuration by Platform

- **iOS Simulator**: `http://localhost:9011`
- **Android Emulator**: `http://10.0.2.2:9011` (10.0.2.2 = host machine's localhost)
- **Physical Devices**: Use your computer's IP address (e.g., `http://192.168.1.100:9011`)

### Redirect URL

Must match in three places:
1. **FusionAuth Application Settings**: Allowed redirect URLs
2. **App Config** (`config.ts`): `redirectUrl: 'fusionauth.demo:/oauthredirect'`
3. **Native Config**:
   - iOS: `Info.plist` → `CFBundleURLSchemes`
   - Android: `AndroidManifest.xml` → `intent-filter` → `data android:scheme`

## Running the App

### Step 1: Start Metro

```sh
npm start
```

### Step 2: Start FusionAuth

Make sure your FusionAuth server is running on `http://localhost:9011`

### Step 3: Run on Device/Simulator

#### iOS

```sh
# Install pods (first time or after dependency changes)
cd ios
bundle exec pod install
cd ..

# Run on iOS
npm run ios
```

#### Android

```sh
# Run on Android
npm run android
```

## Troubleshooting

### Common Issues

#### 1. "No such module 'RNAppAuth'" (iOS)

**Solution**: 
- Verify `AwesomeProject-Bridging-Header.h` exists
- Check `project.pbxproj` has `SWIFT_OBJC_BRIDGING_HEADER` setting
- Clean build: Product → Clean Build Folder (Shift+Cmd+K)

#### 2. "AppDelegate does not conform to RNAppAuthAuthorizationFlowManager"

**Solution**: 
- Ensure `AppDelegate` conforms to protocol (line 6)
- Add `authorizationFlowManagerDelegate` property (line 8)
- Implement `application(_:open:options:)` method (lines 35-47)

#### 3. Login Opens but Redirect Doesn't Work

**Solution**:
- Verify URL scheme matches in `Info.plist` (iOS) or `AndroidManifest.xml` (Android)
- Check `redirectUrl` in `config.ts` matches native configuration
- Ensure `application(_:open:options:)` is implemented correctly

#### 4. "Network request failed" or Can't Connect to FusionAuth

**Solution**:
- **iOS**: Verify `NSAppTransportSecurity` allows localhost HTTP
- **Android**: Check `network_security_config.xml` allows cleartext traffic
- **Emulator**: Use `10.0.2.2` instead of `localhost` for Android
- **Physical Device**: Use your computer's IP address, not `localhost`

#### 5. Tokens Not Persisting

**Solution**:
- Verify `react-native-keychain` is installed
- Check Keychain/Keystore permissions
- Ensure tokens are being stored after successful login

### Debug Tips

1. **Check Console Logs**: Look for OAuth flow messages
2. **Verify URL Scheme**: Test deep link manually: `xcrun simctl openurl booted "fusionauth.demo://test"`
3. **Check FusionAuth Logs**: Verify authorization requests are received
4. **Network Inspector**: Use React Native Debugger or Chrome DevTools to inspect network requests

## Learn More

- [React Native Documentation](https://reactnative.dev)
- [react-native-app-auth GitHub](https://github.com/FormidableLabs/react-native-app-auth)
- [FusionAuth Documentation](https://fusionauth.io/blog/securing-react-native-with-oauth?utm_source)
- [OAuth 2.0 RFC 8252](https://tools.ietf.org/html/rfc8252)

## License

YORKIE
