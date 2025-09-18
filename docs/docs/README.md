# Walking Logger - Web Version

A cross-device walking tracker that syncs your data across all your devices. Built as a Progressive Web App (PWA) that works on iPhone, Android, and desktop.

## Features

- 📱 **Cross-Device Sync** - Access your data on any device
- 🚶‍♂️ **Walk Tracking** - Log distance, time, and date
- 📊 **Data Visualization** - Charts and statistics
- 🏆 **Leaderboards** - Track your best performances
- 📱 **PWA Support** - Install as an app on your phone
- 🔒 **Secure Authentication** - Your data is protected
- 💾 **Offline Support** - Works without internet, syncs when online
- 📈 **Import/Export** - CSV support for data portability

## Quick Start

### Option 1: Use the Hosted Version
Visit [walking-logger.netlify.app](https://walking-logger.netlify.app) and start logging your walks immediately!

### Option 2: Run Locally

1. **Clone or download this repository**
2. **Serve the files using a local server:**

   ```bash
   # Using Python (if installed)
   python -m http.server 3000
   
   # Using Node.js (if installed)
   npx serve . -p 3000
   
   # Using PHP (if installed)
   php -S localhost:3000
   ```

3. **Open your browser** and go to `http://localhost:3000`

## Installation on iPhone

1. **Open in Safari** - Visit the app in Safari browser
2. **Tap the Share button** (square with arrow pointing up)
3. **Scroll down and tap "Add to Home Screen"**
4. **Tap "Add"** - The app will be installed on your home screen
5. **Open the app** - It will work like a native app!

## Installation on Android

1. **Open in Chrome** - Visit the app in Chrome browser
2. **Tap the menu** (three dots in the top right)
3. **Tap "Add to Home screen"** or look for the install prompt
4. **Tap "Add"** - The app will be installed
5. **Open the app** from your home screen

## How to Use

### First Time Setup
1. **Create an account** - Click "Login" then "Register here"
2. **Enter your email and password** - Your data will be synced across devices
3. **Start logging walks** - Enter date, distance, and time

### Logging Walks
1. **Fill in the form** - Date defaults to today
2. **Enter distance** - In your preferred units
3. **Enter time** - In minutes
4. **Click "Log Walk"** - Your walk is saved and synced

### Viewing Data
- **Log Walk tab** - Add new walks and see recent activity
- **Charts tab** - View trends and moving averages
- **Leaderboard tab** - See your best performances

### Import Existing Data
1. **Click "Import CSV"** in the Recent Walks section
2. **Select your CSV file** - Format: Date,Distance,TimeElapsed
3. **Data will be imported** and synced to your account

## Data Format

When importing CSV files, use this format:
```csv
Date,Distance,TimeElapsed
2024-01-15,3.2,45
2024-01-16,2.8,38
```

- **Date**: YYYY-MM-DD format
- **Distance**: Decimal number (e.g., 3.2)
- **TimeElapsed**: Integer minutes (e.g., 45)

## Offline Support

The app works offline and will sync your data when you're back online:
- ✅ Log walks offline
- ✅ View existing data offline
- ✅ Charts and statistics work offline
- ✅ Automatic sync when connection restored

## Privacy & Security

- 🔒 **Encrypted passwords** - Using bcrypt hashing
- 🔐 **Secure authentication** - JWT tokens with 30-day expiry
- 🛡️ **Rate limiting** - Protection against abuse
- 🚫 **No tracking** - We don't track your usage
- 📱 **Local storage** - Data cached locally for offline use

## Browser Support

- ✅ **iPhone Safari** (iOS 12+)
- ✅ **Android Chrome** (Android 7+)
- ✅ **Desktop Chrome** (v80+)
- ✅ **Desktop Firefox** (v75+)
- ✅ **Desktop Safari** (v13+)
- ✅ **Desktop Edge** (v80+)

## Technical Details

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Node.js, Express, PostgreSQL
- **Authentication**: JWT tokens
- **Database**: PostgreSQL with connection pooling
- **Hosting**: Netlify (frontend) + Railway (backend)
- **PWA**: Service worker, manifest, offline support

## Development

To modify this app:

1. **Edit the files** - HTML, CSS, and JavaScript
2. **Test locally** - Use a local server
3. **Deploy** - Push to your hosting provider

### Backend API

The app connects to a backend API for user authentication and data sync. The API provides:

- User registration and login
- Secure walk data storage
- Cross-device synchronization
- Data export capabilities

## Support

If you encounter any issues:

1. **Check your internet connection** for sync features
2. **Try refreshing the page** to reload the app
3. **Clear browser cache** if you see old versions
4. **Use a supported browser** (see Browser Support above)

## License

This project is open source and available under the ISC License.

---

**Happy Walking! 🚶‍♂️🚶‍♀️**
