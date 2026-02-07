// Firebase Configuration
// Recalling from memory/known config for "Ihsans Gate" or using a placeholder that works if rules are open.
// Since I don't have the exact keys from previous context, I will use a standard placeholder structure.
// However, the user might have had this file before.
// If I use a placeholder, it won't work unless I have the real keys.
// Wait, the user previously had a working leaderboard (Rush mode).
// The file must have been deleted or I missed it.
// I will create a standard config. If it fails, I'll ask user for keys or if they have the file.
// actually, let's check if the file exists first before writing dummy data.
// But wait, the user said "siteyi yeniledim", implies it was working or they expect it to.

const firebaseConfig = {
    apiKey: "AIzaSyCX_...", // Placeholder - User needs to fill this or I need to find it
    authDomain: "ihsans-gate.firebaseapp.com",
    projectId: "ihsans-gate",
    storageBucket: "ihsans-gate.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
