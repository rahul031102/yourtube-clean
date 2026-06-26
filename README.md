🎬 YourTube – Advanced Video Sharing Platform
🎬 YourTube – Advanced Video Sharing Platform

A modern full-stack video sharing platform inspired by YouTube, built using the MERN stack with Next.js. The project goes beyond basic video sharing by integrating premium subscriptions, multilingual comments, gesture-based video controls, secure authentication, and real-time WebRTC video calling.

🚀 Live Demo

Frontend: https://yourtube-indol-chi.vercel.app

Backend:https://yourtube-backend-vf53.onrender.com

✨ Features
🎥 Video Platform
Upload and watch videos
Automatic thumbnail generation
Video streaming
View counter
Responsive video player
Channel pages
💬 Smart Comments
Multilingual comments
One-click translation
City/location metadata
Like & dislike reactions
Automatic deletion after reaching dislike threshold
Unicode validation to prevent unwanted characters
📥 Downloads
Download videos
Download history
Download again functionality
Local device storage support
Premium upgrade prompt after free usage limit
👑 Premium Membership
Free, Bronze, Silver and Gold plans
Razorpay payment integration
Secure payment verification
Automatic plan upgrades
Email invoice generation
🎮 Gesture Video Player
Single tap play/pause
Double tap seek
Triple tap actions
Mobile-first gesture controls
Watch-time enforcement based on subscription plan
🔐 Authentication
Firebase Authentication
Email OTP verification
Regional OTP handling
JWT-based authorization
Protected routes
📞 Real-Time Communication
Audio Calls
Video Calls
Screen Sharing
Local WebM Recording
Download recorded calls
Real-time signaling using Socket.IO
🎨 Smart UI
Responsive design
Dynamic theme support
Mobile optimized layouts
Modern YouTube-inspired interface
🛠 Tech Stack
Frontend
Next.js
React
TypeScript
Tailwind CSS
Axios
Socket.IO Client
Firebase Authentication
Backend
Node.js
Express.js
MongoDB
Mongoose
JWT
Multer
Cloudinary
Socket.IO
Nodemailer
Third Party Services
Cloudinary
Razorpay
Firebase
IPAPI
Message Central
Google Translate API
📁 Project Structure
yourtube/
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── context/
│   ├── utils/
│   └── styles/
│
server/
├── controllers/
├── routes/
├── models/
├── middleware/
├── utils/
└── socket/
⚙️ Installation
Clone
git clone <repository-url>
cd yourtube
Install Frontend
cd yourtube
npm install
npm run dev
Install Backend
cd server
npm install
npm run dev
Environment Variables
Frontend
NEXT_PUBLIC_BACKEND_URL=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
Backend
MONGO_URI=
JWT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
EMAIL_USER=
EMAIL_PASS=
Key Highlights
Full-stack MERN architecture
Next.js frontend
Secure authentication
Cloud video storage
Premium subscription system
Real-time communication
Mobile gesture controls
Download management
Responsive UI
Production deployment
Future Enhancements
Search functionality
Channel subscriptions
Notifications
Watch Later
Playlist management
AI-powered recommendations
Live streaming
License

This project is developed for educational and internship purposes.

Author

Rahul Kumar

GitHub: https://github.com/rahul031102
