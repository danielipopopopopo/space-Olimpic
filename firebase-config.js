// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBNACNL8gw1Hg7754tNYfmT7Aj6yYG-nsQ",
    authDomain: "checkboxes-c1785.firebaseapp.com",
    databaseURL: "https://checkboxes-c1785-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "checkboxes-c1785",
    storageBucket: "checkboxes-c1785.firebasestorage.app",
    messagingSenderId: "48117457792",
    appId: "1:48117457792:web:9dcc747717a07943719765",
    measurementId: "G-GPPH3E4SY3"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();
