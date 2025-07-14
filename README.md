# Goalaroo - Child Goal Tracking PWA

A beautiful, child-friendly Progressive Web App designed to help parents track their children's behavioral goals through visual progress tracking. Features emoji-based feedback, story-based progress trails, and colorful goal management with a modern API-based architecture.

## Features

### 🎯 Core Functionality
- **JWT Authentication** - Secure email-based login with magic codes
- **Session Persistence** - Stay logged in across page refreshes for 7 days
- **Multi-Child Support** - Track goals for multiple children with unique color coding
- **Story-Based Goals** - Engaging narratives with characters and visual trails
- **Goal Types** - Timer goals (countdown/countup), Countdown goals, and Count Up goals
- **Visual Trail Progress** - Winding paths with milestone markers and character movement
- **Real-time Updates** - Live progress tracking with smooth animations
- **API-Based Architecture** - Modern backend with RESTful API endpoints

### 🎨 User Experience
- **Child-Friendly Interface** - Large buttons, simple language, emoji-based communication
- **Responsive Design** - Optimized for mobile devices with touch-friendly controls
- **Offline Support** - Works without internet connection
- **PWA Features** - Installable as a native app on mobile devices
- **Celebration Animations** - Fun rewards when goals are completed

### 🔧 Goal Management
- **Create/Edit Goals** - Add new goals and modify existing ones
- **Delete Goals** - Remove completed or outdated goals
- **Goal Status Tracking** - Monitor active, paused, completed, and waiting goals
- **Multi-Child Goals** - Assign goals to multiple children

## Quick Start

### Local Development

#### Prerequisites
- Node.js (for backend development)
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Python 3.x (for frontend development server)

#### Installation

1. **Clone or download the project files**
   ```bash
   git clone <repository-url>
   cd KidGoals
   ```

2. **Set up the backend**
   ```bash
   cd backend
   npm install
   cp env.example .env
   # Edit .env with your configuration
   npm start
   ```

3. **Start the frontend development server**
   ```bash
   # In the root directory
   python -m http.server 8000
   ```

4. **Open the application**
   - Navigate to `http://localhost:8000` in your browser
   - The frontend will connect to the backend at `http://localhost:3000`

### Production Deployment

For production deployment with AWS infrastructure, see [DEPLOYMENT.md](DEPLOYMENT.md) for complete instructions.

**Features of production deployment:**
- Cross-browser and multi-device data synchronization
- Real email authentication with magic codes
- Scalable AWS infrastructure
- Production-ready security and monitoring

### PWA Installation

1. **On Mobile Devices:**
   - Open the app in Chrome/Safari
   - Tap the "Add to Home Screen" option
   - The app will install like a native application

2. **On Desktop:**
   - Open the app in Chrome
   - Click the install icon in the address bar
   - Follow the prompts to install

## Usage Guide

### First Time Setup

1. **Authentication**
   - Enter your email address
   - Click "Send Magic Code"
   - Check your email for the 6-digit code (in development, the code is shown in an alert)
   - Enter the code to log in

2. **Add Your First Child**
   - Click the "+" button next to the child selector
   - Enter your child's name
   - Choose a unique color for them
   - Click "Add Child"

3. **Create Your First Goal**
   - Select your child from the dropdown
   - Click "Add Goal"
   - Fill in the goal details:
     - **Name**: What you want your child to achieve
     - **Type**: Countdown (avoiding something) or Count Up (achieving something)
     - **Duration**: How long the goal should take
     - **Period**: How often it resets
     - **Icon**: Choose a fun emoji
     - **Color**: Pick a motivating color

### Goal Types Explained

#### Timer Goals
- **Story**: Fiona the Fox needs to get home before sunset
- **Purpose**: Track time-based activities with countdown or countup timers
- **Example**: "Practice piano for 30 minutes"
- **Progress**: Fox moves along a forest trail, leaving paw prints at milestones
- **Success**: Fox reaches home safely when the time period is completed

#### Countdown Goals
- **Story**: Fiona the Fox needs to get home before sunset
- **Purpose**: Track when your child avoids negative behaviors
- **Example**: "No hitting for 10 times"
- **Progress**: Fox moves along a forest trail, leaving paw prints at milestones
- **Success**: Fox reaches home safely when the countdown reaches zero

#### Count Up Goals
- **Story**: Ruby the Rabbit collects magical gems to unlock treasures
- **Purpose**: Track positive behaviors your child achieves
- **Example**: "Read 5 books"
- **Progress**: Rabbit hops along collecting gems at milestone intervals
- **Success**: Rabbit unlocks the treasure chest when the target is reached

### Managing Goals

- **View Progress**: Tap any goal card to see the story trail and character progress
- **Edit Goals**: Modify goal names, colors, and assignments
- **Delete Goals**: Remove goals permanently
- **Multi-Child Assignment**: Assign goals to multiple children

## Technical Details

### Architecture
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js/Express with RESTful API
- **Database**: DynamoDB for data persistence
- **Authentication**: JWT with magic code email verification
- **PWA**: Service Worker for offline functionality

### File Structure
```
KidGoals/
├── index.html          # Main application file
├── styles.css          # All CSS styles
├── app.js             # Frontend application logic
├── manifest.json      # PWA manifest
├── sw.js             # Service Worker
├── backend/           # Backend API server
│   ├── server.js      # Express server
│   ├── swagger.js     # API documentation
│   └── package.json   # Backend dependencies
├── terraform/         # Infrastructure as Code
└── README.md         # This file
```

### Data Structure

#### User Object
```javascript
{
  email: string,
  id: string,
  loginTime: number
}
```

#### Child Object
```javascript
{
  id: string,
  name: string,
  color: string,
  createdAt: number
}
```

#### Goal Object
```javascript
{
  id: string,
  childId: string,
  name: string,
  duration: number,
  unit: 'hours' | 'days' | 'weeks',
  period: 'continuous' | 'daily' | 'weekly',
  type: 'countdown' | 'countup',
  icon: string,
  color: string,
  status: 'active' | 'paused' | 'completed' | 'waiting',
  startTime: number,
  totalDuration: number,
  createdAt: number
}
```

## Browser Support

- **Chrome**: Full support (recommended for PWA features)
- **Firefox**: Full support
- **Safari**: Full support (iOS PWA installation)
- **Edge**: Full support

## Development

### Local Development
1. Start the development server
2. Open browser dev tools
3. Test on mobile devices using browser dev tools
4. Test PWA installation

### Testing Checklist
- [ ] Authentication flow
- [ ] Child management
- [ ] Goal creation and editing
- [ ] Timer accuracy
- [ ] Pause/resume functionality
- [ ] Progress calculations
- [ ] Modal interactions
- [ ] Responsive design
- [ ] PWA installation
- [ ] Offline functionality

### Deployment
- Host on HTTPS (required for PWA features)
- Configure proper MIME types
- Test on actual mobile devices
- Validate with Lighthouse

## Privacy & Security

- **Local Storage**: All data is stored locally on your device
- **No Server**: No data is transmitted to external servers
- **Email Validation**: Basic email format validation
- **Secure Codes**: Random 6-digit authentication codes
- **Session Management**: 7-day session persistence with automatic expiry

## Troubleshooting

### Common Issues

1. **PWA not installing**
   - Ensure you're using HTTPS
   - Check that the manifest.json is accessible
   - Verify Service Worker is registered

2. **Goals not updating**
   - Refresh the page to restart timers
   - Check browser console for errors
   - Clear browser cache if needed

3. **Data not persisting**
   - Check if localStorage is enabled
   - Ensure sufficient storage space
   - Try clearing and re-adding data

### Browser Console Errors
- Check for JavaScript errors in browser dev tools
- Verify all files are loading correctly
- Ensure no CORS issues with local development

## Contributing

This is a standalone application built with vanilla web technologies. To contribute:

1. Fork the repository
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review browser console for errors
3. Test in different browsers
4. Create an issue with detailed information

---

**Made with ❤️ for families everywhere** 