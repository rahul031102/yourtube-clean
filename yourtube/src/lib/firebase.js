// // Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// import { getAuth, GoogleAuthProvider } from "firebase/auth";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// const firebaseConfig = {
//   apiKey: "AIzaSyCyxbdclt2ocA5zgE-MDy1ndYIFqVMAr30",
//   authDomain: "yourtube-8cda9.firebaseapp.com",
//   projectId: "yourtube-8cda9",
//   storageBucket: "yourtube-8cda9.firebasestorage.app",
//   messagingSenderId: "921641878423",
//   appId: "1:921641878423:web:0d65801eebaf2b25f03ad2",
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);
// const provider = new GoogleAuthProvider();
// export { auth, provider };

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC3N6LLO97R4a8MqYB9J7nGcw9Z66Fr1hE",
  authDomain: "yourtube-rahul.firebaseapp.com",
  projectId: "yourtube-rahul",
  storageBucket: "yourtube-rahul.firebasestorage.app",
  messagingSenderId: "1033631420738",
  appId: "1:1033631420738:web:d10a66ec78adce5c2c78db",
  measurementId: "G-SC9R64X7Z8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
export { auth, provider };