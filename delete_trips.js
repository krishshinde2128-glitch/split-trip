import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBMyrM80Ngk7R_SR5knrFsSS88K5tCMhhk",
  authDomain: "splitwise-be244.firebaseapp.com",
  projectId: "splitwise-be244",
  storageBucket: "splitwise-be244.firebasestorage.app",
  messagingSenderId: "235737949948",
  appId: "1:235737949948:web:e2d785b0ff7c4404345979"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteAllTrips() {
  console.log("Fetching trips...");
  const tripsSnapshot = await getDocs(collection(db, "trips"));
  
  for (const tripDoc of tripsSnapshot.docs) {
    const tripId = tripDoc.id;
    console.log(`Deleting trip: ${tripId}`);
    
    // Delete members
    const membersSnap = await getDocs(collection(db, "trips", tripId, "members"));
    for (const memberDoc of membersSnap.docs) {
      await deleteDoc(doc(db, "trips", tripId, "members", memberDoc.id));
    }
    
    // Delete expenses
    const expensesSnap = await getDocs(collection(db, "trips", tripId, "expenses"));
    for (const expenseDoc of expensesSnap.docs) {
      await deleteDoc(doc(db, "trips", tripId, "expenses", expenseDoc.id));
    }
    
    // Delete trip
    await deleteDoc(doc(db, "trips", tripId));
    console.log(`Trip ${tripId} deleted.`);
  }
  
  console.log("All trips deleted.");
  process.exit(0);
}

deleteAllTrips().catch(console.error);
