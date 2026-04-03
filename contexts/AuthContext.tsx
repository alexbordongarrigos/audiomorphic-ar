import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { SubscriptionTier } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';

interface UserData {
  uid: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  trialEndTime?: number;
  createdAt: number;
  updatedAt: number;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateSubscription: (tier: SubscriptionTier) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  isAuthModalOpen: false,
  setAuthModalOpen: () => {},
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
  updateSubscription: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    // Ensure persistence is set to LOCAL
    setPersistence(auth, browserLocalPersistence).catch(err => console.error("Persistence error:", err));

    // IMPORTANT: Handle Redirect Result for Capacitor/Electron
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("Redirect login success:", result.user.email);
          setAuthModalOpen(false);
        }
      })
      .catch((err) => {
        if (err.code !== 'auth/no-auth-event') {
          console.warn("Redirect result error handled:", err.code);
        }
      });

    let unsubscribeDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (!currentUser) {
        setUserData(null);
        setLoading(false);
        if (unsubscribeDoc) {
          unsubscribeDoc();
          unsubscribeDoc = undefined;
        }
        return;
      }

      // User is logged in, listen to their document
      const userRef = doc(db, 'users', currentUser.uid);
      
      unsubscribeDoc = onSnapshot(userRef, async (docSnap) => {
        const isMaestro = currentUser.email === 'alexbordongarrigos@gmail.com';
        
        if (docSnap.exists()) {
          const data = docSnap.data() as UserData;
          // Force upgrade if they are maestro but not yet on lifetime
          if (isMaestro && data.subscriptionTier !== 'lifetime') {
            await updateDoc(userRef, { subscriptionTier: 'lifetime', updatedAt: Date.now() });
            data.subscriptionTier = 'lifetime';
          }
          setUserData(data);
        } else {
          // Create new user profile with 1 hour trial
          const newUserData: UserData = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            subscriptionTier: isMaestro ? 'lifetime' : 'trial',
            trialEndTime: isMaestro ? undefined : Date.now() + (60 * 60 * 1000), // 1 hour trial
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          try {
            await setDoc(userRef, newUserData);
            setUserData(newUserData);
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `users/${currentUser.uid}`);
          }
        }
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    
    const isElectron = navigator.userAgent.toLowerCase().includes('electron');
    const isCapacitor = (window as any).Capacitor?.isNative;
    const isFileProtocol = window.location.protocol === 'file:';
    const isLocalServer = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';

    console.log("Login attempt in environment:", { isElectron, isCapacitor, isFileProtocol, isLocalServer });

    // In Electron with Local Server (127.0.0.1), popup SHOULD work if authorized in Firebase.
    // Redirect is a fallback but often fails for custom protocols.
    if (isCapacitor || isFileProtocol) {
      console.log("Native Capacitor/File environment detected. Using signInWithRedirect...");
      try {
        provider.addScope('https://www.googleapis.com/auth/userinfo.email');
        provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
        await signInWithRedirect(auth, provider);
        return;
      } catch (err) {
        console.error("Native redirect failed, trying popup as fallback:", err);
      }
    }

    try {
      console.log("Attempting signInWithPopup...");
      const result = await signInWithPopup(auth, provider);
      console.log("Popup login success:", result.user.email);
      setAuthModalOpen(false);
    } catch (error: any) {
      console.warn("Popup login failed or blocked:", error.code, error.message);
      
      if (error.code === 'auth/unauthorized-domain' || error.message.includes('unauthorized domain')) {
        alert("ERROR DE CONFIGURACIÓN: Dominios no autorizados.\n\nPor favor, añada '127.0.0.1' y 'localhost' a la lista de 'Dominios Autorizados' en su Consola de Firebase -> Authentication -> Settings.");
        return;
      }

      const shouldTryRedirect = 
        error.code === 'auth/popup-blocked' || 
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/cancelled-popup-request' ||
        error.code === 'auth/operation-not-allowed';

      if (shouldTryRedirect || isElectron) {
        console.log("Attempting signInWithRedirect as fallback...");
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectError: any) {
          console.error("Redirect fallback failed:", redirectError.code, redirectError.message);
          if (redirectError.message.includes('requested action is invalid')) {
             alert("Error de Firebase: 'The requested action is invalid'. \n\nPosibles causas:\n1. '127.0.0.1' no está en Dominios Autorizados de Firebase.\n2. La API de Google Identity no está habilitada en Google Cloud.");
          }
        }
      } else {
        console.error("Google Login failed:", error);
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const updateSubscription = async (tier: SubscriptionTier) => {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    const updates: Partial<UserData> = {
      subscriptionTier: tier,
      updatedAt: Date.now(),
    };

    if (tier === 'trial') {
      updates.trialEndTime = Date.now() + 60 * 60 * 1000; // 1 hour trial
    } else {
      updates.trialEndTime = undefined; // Clear trial end time if subscribing to another tier
    }

    try {
      await updateDoc(userRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, isAuthModalOpen, setAuthModalOpen, loginWithGoogle, logout, updateSubscription }}>
      {children}
    </AuthContext.Provider>
  );
};
