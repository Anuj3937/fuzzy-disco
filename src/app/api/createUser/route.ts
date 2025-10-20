
import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// This function initializes the Firebase Admin SDK
function initializeAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }

  // Decode the base64 service account key from environment variables
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8')
  );

  return initializeApp({
    credential: cert(serviceAccount)
  });
}

export async function POST(request: Request) {
  initializeAdminApp();

  try {
    const { email, role } = await request.json();

    // Input Validation
    if (!email || !role || !['student', 'teacher', 'parent'].includes(role)) {
      return NextResponse.json({ error: 'Invalid email or role provided.' }, { status: 400 });
    }
    
    // Determine the default password based on the role
    const password = role === "student" ? "student123" : role === 'teacher' ? 'teacher123' : 'parent123';

    // 1. Create user in Firebase Authentication
    const userRecord = await getAuth().createUser({
      email,
      password,
      emailVerified: false,
    });

    // 2. Set the user's role using custom claims
    await getAuth().setCustomUserClaims(userRecord.uid, { role });

    // 3. Create the user's profile document in Firestore
    await getFirestore().collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      role,
    });

    return NextResponse.json({ message: `Successfully created user ${email} with role ${role}.` });

  } catch (error: any) {
    console.error("Error creating user:", error);
    
    // Provide a more specific error message to the client if available
    const errorMessage = error.code === 'auth/email-already-exists' 
      ? 'A user with this email already exists.'
      : 'An unexpected error occurred on the server.';
      
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
