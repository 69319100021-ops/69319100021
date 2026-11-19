import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  BLUEPRINT_LIMITS,
  type MonthlyBudget,
  type Transaction,
  type TransactionInput,
  type UserProfile,
} from '../types/finance';
import { deriveMonthKey, sanitizeTransactionInput } from '../utils/finance';

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);

  const displayName = (user.displayName || user.email?.split('@')[0] || 'ผู้ใช้งาน').slice(
    0,
    BLUEPRINT_LIMITS.MAX_NAME_LEN
  );
  const email = (user.email || 'user@gmail.com').slice(0, 200);
  const photoURL = user.photoURL ? user.photoURL.slice(0, 500) : undefined;

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const payload: Record<string, unknown> = {
        uid: user.uid,
        displayName,
        email,
        defaultMonthlyBudget: 30000,
        currency: 'THB',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (photoURL) {
        payload.photoURL = photoURL;
      }
      await setDoc(ref, payload);
      return {
        uid: user.uid,
        displayName,
        email,
        photoURL,
        defaultMonthlyBudget: 30000,
        currency: 'THB',
      };
    }

    const data = snap.data();
    return {
      uid: user.uid,
      displayName: typeof data.displayName === 'string' ? data.displayName : displayName,
      email: typeof data.email === 'string' ? data.email : email,
      photoURL: typeof data.photoURL === 'string' ? data.photoURL : photoURL,
      defaultMonthlyBudget:
        typeof data.defaultMonthlyBudget === 'number' ? data.defaultMonthlyBudget : 30000,
      currency: 'THB',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const d = snap.data();
      onData({
        uid,
        displayName: String(d.displayName ?? ''),
        email: String(d.email ?? ''),
        photoURL: typeof d.photoURL === 'string' ? d.photoURL : undefined,
        defaultMonthlyBudget:
          typeof d.defaultMonthlyBudget === 'number' ? d.defaultMonthlyBudget : 30000,
        currency: 'THB',
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeTransactions(
  uid: string,
  onData: (items: Transaction[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}/transactions`;
  const q = query(collection(db, 'users', uid, 'transactions'), where('userId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Transaction[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          userId: String(d.userId ?? uid),
          type: d.type === 'income' ? 'income' : 'expense',
          amount: Number(d.amount ?? 0),
          category: String(d.category ?? ''),
          note: String(d.note ?? ''),
          date: String(d.date ?? ''),
          monthKey: String(d.monthKey ?? ''),
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeBudgets(
  uid: string,
  onData: (items: MonthlyBudget[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}/budgets`;
  const q = query(collection(db, 'users', uid, 'budgets'), where('userId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: MonthlyBudget[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          userId: String(d.userId ?? uid),
          monthKey: String(d.monthKey ?? docSnap.id),
          limitAmount: Number(d.limitAmount ?? 0),
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function createTransaction(uid: string, rawInput: TransactionInput): Promise<string> {
  const path = `users/${uid}/transactions`;
  const clean = sanitizeTransactionInput(rawInput);
  const monthKey = deriveMonthKey(clean.date);

  try {
    const docRef = await addDoc(collection(db, 'users', uid, 'transactions'), {
      userId: uid,
      type: clean.type,
      amount: clean.amount,
      category: clean.category,
      note: clean.note,
      date: clean.date,
      monthKey,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateTransaction(
  uid: string,
  transactionId: string,
  rawInput: TransactionInput
): Promise<void> {
  const path = `users/${uid}/transactions/${transactionId}`;
  const clean = sanitizeTransactionInput(rawInput);
  const monthKey = deriveMonthKey(clean.date);

  try {
    await updateDoc(doc(db, 'users', uid, 'transactions', transactionId), {
      type: clean.type,
      amount: clean.amount,
      category: clean.category,
      note: clean.note,
      date: clean.date,
      monthKey,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeTransaction(uid: string, transactionId: string): Promise<void> {
  const path = `users/${uid}/transactions/${transactionId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'transactions', transactionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveMonthlyBudget(
  uid: string,
  monthKey: string,
  limitAmount: number
): Promise<void> {
  const path = `users/${uid}/budgets/${monthKey}`;
  const ref = doc(db, 'users', uid, 'budgets', monthKey);
  const clamped = Math.max(0, Math.min(BLUEPRINT_LIMITS.MAX_AMOUNT, Math.round(limitAmount * 100) / 100));

  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, {
        userId: uid,
        monthKey,
        limitAmount: clamped,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        limitAmount: clamped,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveDefaultBudget(uid: string, limitAmount: number): Promise<void> {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  const clamped = Math.max(0, Math.min(BLUEPRINT_LIMITS.MAX_AMOUNT, Math.round(limitAmount * 100) / 100));

  try {
    await updateDoc(ref, {
      defaultMonthlyBudget: clamped,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
