import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Sua configuração do Firebase para a web
const firebaseConfig = {
  apiKey: "AIzaSyC59U70hVi-fAz_7bbqML8TvLgkeRrAAsY",
  authDomain: "academia-209bf.firebaseapp.com",
  projectId: "academia-209bf",
  storageBucket: "academia-209bf.firebasestorage.app",
  messagingSenderId: "118910612569",
  appId: "1:118910612569:web:66b026a025a5d2bb642d48",
  measurementId: "G-3BENZJ08JV"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Cloud Firestore e obtém uma referência para o serviço
export const db = getFirestore(app);
