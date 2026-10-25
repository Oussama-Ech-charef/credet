import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  runTransaction,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import { logError } from "@/lib/logger";
import type {
  Client,
  ClientDetailResponse,
  ClientInput,
  Entry,
  EntryDeleteResponse,
  EntryInput,
  EntryMutationResponse,
  OperationType,
  ShopSettings,
  StatsOverview,
} from "@/lib/types";

function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export class FirestoreService {
  private db = getFirestoreDb();

  private async getNextId(counterName: "client_id" | "entry_id"): Promise<number> {
    const counterRef = doc(this.db, "metadata", "counters");

    try {
      return await runTransaction(this.db, async (transaction) => {
        const snap = await transaction.get(counterRef);
        let nextId = 1;
        if (snap.exists()) {
          const current = snap.data()[counterName] || 0;
          nextId = current + 1;
          transaction.update(counterRef, { [counterName]: nextId });
        } else {
          transaction.set(counterRef, { [counterName]: nextId }, { merge: true });
        }
        return nextId;
      });
    } catch (error) {
      await logError("FirestoreService", error, {
        operation: "getNextId",
        counter: counterName,
      });
      throw error;
    }
  }

  async getSettings(): Promise<ShopSettings> {
    const docRef = doc(this.db, "settings", "general");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        shop_name: data.shop_name || "Credet Shop",
        shop_phone: data.shop_phone || "",
        currency: data.currency || "DH",
        updated_at: data.updated_at || null,
      };
    }

    const defaultSettings: ShopSettings = {
      shop_name: "Credet Shop",
      shop_phone: "",
      currency: "DH",
      updated_at: new Date().toISOString(),
    };
    await setDoc(docRef, defaultSettings);
    return defaultSettings;
  }

  async updateSettings(input: Partial<ShopSettings>): Promise<ShopSettings> {
    const docRef = doc(this.db, "settings", "general");
    const current = await this.getSettings();
    const updated: ShopSettings = {
      shop_name: input.shop_name !== undefined ? String(input.shop_name).trim() : current.shop_name,
      shop_phone: input.shop_phone !== undefined ? String(input.shop_phone).trim() : current.shop_phone,
      currency: input.currency !== undefined ? String(input.currency).trim() : current.currency,
      updated_at: new Date().toISOString(),
    };
    await setDoc(docRef, updated, { merge: true });
    return updated;
  }

  async listClients(options?: { search?: string; status?: "all" | "debt" | "settled" }): Promise<Client[]> {
    const clientsRef = collection(this.db, "clients");
    // Note: compound where+orderBy requires a Firestore composite index.
    // We fetch with a single where filter and sort client-side to avoid
    // index creation for this small single-admin dataset.
    const q = query(clientsRef, where("is_archived", "==", false));
    const snap = await getDocs(q);

    let clients: Client[] = [];
    snap.forEach((d) => {
      const data = d.data();
      clients.push({
        id: Number(data.id),
        name: data.name || "",
        phone: data.phone || null,
        address: data.address || null,
        notes: data.notes || null,
        is_archived: Boolean(data.is_archived),
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        total_debt: roundMoney(data.total_debt || 0),
        total_paid: roundMoney(data.total_paid || 0),
        current_balance: roundMoney(data.current_balance || 0),
        entries_count: Number(data.entries_count || 0),
        last_operation_date: data.last_operation_date || null,
      });
    });

    if (options?.search) {
      const queryText = options.search.trim().toLowerCase();
      clients = clients.filter(
        (c) =>
          c.name.toLowerCase().includes(queryText) ||
          (c.phone && c.phone.includes(queryText)) ||
          (c.address && c.address.toLowerCase().includes(queryText)),
      );
    }

    if (options?.status === "debt") {
      clients = clients.filter((c) => c.current_balance > 0);
    } else if (options?.status === "settled") {
      clients = clients.filter((c) => c.current_balance <= 0);
    }

    // Sort client-side by name (Arabic-aware)
    clients.sort((a, b) => a.name.localeCompare(b.name, "ar"));

    return clients;
  }

  async getClient(id: number): Promise<ClientDetailResponse> {
    const docRef = doc(this.db, "clients", String(id));
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      throw new Error("لم يتم العثور على العميل المطلوب.");
    }

    const data = snap.data();
    const client = {
      id: Number(data.id),
      name: data.name || "",
      phone: data.phone || null,
      address: data.address || null,
      notes: data.notes || null,
      is_archived: Boolean(data.is_archived),
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
      entries_count: Number(data.entries_count || 0),
      last_operation_date: data.last_operation_date || null,
    };

    return {
      client,
      total_debt: roundMoney(data.total_debt || 0),
      total_paid: roundMoney(data.total_paid || 0),
      current_balance: roundMoney(data.current_balance || 0),
    };
  }

  async createClient(input: ClientInput): Promise<Client> {
    const id = await this.getNextId("client_id");
    const docRef = doc(this.db, "clients", String(id));
    const now = new Date().toISOString();

    const newClient: Client = {
      id,
      name: input.name.trim(),
      phone: input.phone ? input.phone.trim() : null,
      address: input.address ? input.address.trim() : null,
      notes: input.notes ? input.notes.trim() : null,
      is_archived: false,
      created_at: now,
      updated_at: now,
      total_debt: 0,
      total_paid: 0,
      current_balance: 0,
      entries_count: 0,
      last_operation_date: null,
    };

    await setDoc(docRef, newClient);
    return newClient;
  }

  async updateClient(id: number, input: Partial<ClientInput>): Promise<Client> {
    const docRef = doc(this.db, "clients", String(id));
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error("العميل غير موجود.");
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.phone !== undefined) updates.phone = input.phone ? input.phone.trim() : null;
    if (input.address !== undefined) updates.address = input.address ? input.address.trim() : null;
    if (input.notes !== undefined) updates.notes = input.notes ? input.notes.trim() : null;

    await updateDoc(docRef, updates);
    const updatedSnap = await getDoc(docRef);
    const data = updatedSnap.data()!;

    return {
      id: Number(data.id),
      name: data.name,
      phone: data.phone,
      address: data.address,
      notes: data.notes,
      is_archived: data.is_archived,
      created_at: data.created_at,
      updated_at: data.updated_at,
      total_debt: roundMoney(data.total_debt),
      total_paid: roundMoney(data.total_paid),
      current_balance: roundMoney(data.current_balance),
      entries_count: Number(data.entries_count),
      last_operation_date: data.last_operation_date,
    };
  }

  async deleteClient(id: number): Promise<{ success: boolean; id: number }> {
    const docRef = doc(this.db, "clients", String(id));
    await updateDoc(docRef, { is_archived: true, updated_at: new Date().toISOString() });
    return { success: true, id };
  }

  async listEntries(clientId: number, range?: { from?: string; to?: string }): Promise<Entry[]> {
    const entriesRef = collection(this.db, "credit_entries");
    // Single where filter — no composite index needed.
    // Entries are sorted client-side by operation_date.
    const q = query(
      entriesRef,
      where("client_id", "==", clientId),
    );
    const snap = await getDocs(q);

    let entries: Entry[] = [];
    snap.forEach((d) => {
      const data = d.data();
      entries.push({
        id: Number(data.id),
        client_id: Number(data.client_id),
        operation_type: data.operation_type,
        amount: roundMoney(data.amount),
        description: data.description || "",
        operation_date: data.operation_date || "",
        note: data.note || null,
        created_at: data.created_at || "",
        updated_at: data.updated_at || "",
      });
    });

    // Sort client-side by operation_date ascending
    entries.sort((a, b) => {
      if (a.operation_date !== b.operation_date) {
        return a.operation_date < b.operation_date ? -1 : 1;
      }
      return a.id - b.id;
    });

    if (range?.from) {
      entries = entries.filter((e) => e.operation_date >= range.from!);
    }
    if (range?.to) {
      entries = entries.filter((e) => e.operation_date <= range.to!);
    }

    return entries;
  }

  private async recalculateClientBalance(clientId: number): Promise<{
    total_debt: number;
    total_paid: number;
    current_balance: number;
    entries_count: number;
    last_operation_date: string | null;
  }> {
    const entriesRef = collection(this.db, "credit_entries");
    const q = query(entriesRef, where("client_id", "==", clientId));
    const snap = await getDocs(q);

    let totalDebt = 0;
    let totalPaid = 0;
    let lastDate: string | null = null;
    let count = 0;

    snap.forEach((d) => {
      const data = d.data();
      const amount = Number(data.amount) || 0;
      count++;
      if (data.operation_type === "DEBT") {
        totalDebt += amount;
      } else {
        totalPaid += amount;
      }
      if (!lastDate || (data.operation_date && data.operation_date > lastDate)) {
        lastDate = data.operation_date;
      }
    });

    totalDebt = roundMoney(totalDebt);
    totalPaid = roundMoney(totalPaid);
    const balance = roundMoney(totalDebt - totalPaid);

    const clientDocRef = doc(this.db, "clients", String(clientId));
    await updateDoc(clientDocRef, {
      total_debt: totalDebt,
      total_paid: totalPaid,
      current_balance: balance,
      entries_count: count,
      last_operation_date: lastDate,
      updated_at: new Date().toISOString(),
    });

    return {
      total_debt: totalDebt,
      total_paid: totalPaid,
      current_balance: balance,
      entries_count: count,
      last_operation_date: lastDate,
    };
  }

  async createEntry(clientId: number, input: EntryInput): Promise<EntryMutationResponse> {
    const id = await this.getNextId("entry_id");
    const docRef = doc(this.db, "credit_entries", String(id));
    const now = new Date().toISOString();
    const amount = roundMoney(Number(input.amount));

    const newEntry: Entry = {
      id,
      client_id: clientId,
      operation_type: input.operation_type,
      amount,
      description: input.description.trim(),
      operation_date: input.operation_date || now.slice(0, 10),
      note: input.note ? input.note.trim() : null,
      created_at: now,
      updated_at: now,
    };

    await setDoc(docRef, newEntry);
    const balance = await this.recalculateClientBalance(clientId);

    return {
      ...newEntry,
      ...balance,
    };
  }

  async updateEntry(id: number, input: Partial<EntryInput>): Promise<EntryMutationResponse> {
    const docRef = doc(this.db, "credit_entries", String(id));
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error("المعاملة غير موجودة.");
    }

    const current = snap.data();
    const clientId = Number(current.client_id);
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.operation_type !== undefined) updates.operation_type = input.operation_type;
    if (input.amount !== undefined) updates.amount = roundMoney(Number(input.amount));
    if (input.description !== undefined) updates.description = input.description.trim();
    if (input.operation_date !== undefined) updates.operation_date = input.operation_date;
    if (input.note !== undefined) updates.note = input.note ? input.note.trim() : null;

    await updateDoc(docRef, updates);
    const balance = await this.recalculateClientBalance(clientId);

    const updatedSnap = await getDoc(docRef);
    const data = updatedSnap.data()!;

    return {
      id: Number(data.id),
      client_id: Number(data.client_id),
      operation_type: data.operation_type,
      amount: roundMoney(data.amount),
      description: data.description,
      operation_date: data.operation_date,
      note: data.note,
      created_at: data.created_at,
      updated_at: data.updated_at,
      ...balance,
    };
  }

  async deleteEntry(id: number): Promise<EntryDeleteResponse> {
    const docRef = doc(this.db, "credit_entries", String(id));
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error("المعاملة غير موجودة.");
    }

    const clientId = Number(snap.data().client_id);
    await deleteDoc(docRef);
    const balance = await this.recalculateClientBalance(clientId);

    return {
      success: true,
      client_id: clientId,
      ...balance,
    };
  }

  async getStats(): Promise<StatsOverview> {
    const clients = await this.listClients({ status: "all" });
    const debtors = clients.filter((c) => c.current_balance > 0);
    const totalReceivable = debtors.reduce((sum, c) => sum + c.current_balance, 0);

    const todayStr = new Date().toISOString().slice(0, 10);
    const entriesRef = collection(this.db, "credit_entries");
    // Fetch all entries without orderBy to avoid needing a single-field index.
    // Sort client-side after fetch.
    const q = query(entriesRef);
    const snap = await getDocs(q);

    let collectedToday = 0;
    const recentActivity: StatsOverview["recent_activity"] = [];

    const clientsMap = new Map<number, string>();
    clients.forEach((c) => clientsMap.set(c.id, c.name));

    // Collect all entries then sort client-side by created_at descending
    const allEntries: Array<{
      id: number;
      client_id: number;
      operation_type: OperationType;
      amount: number;
      description: string;
      operation_date: string;
      created_at: string;
    }> = [];

    snap.forEach((d) => {
      const data = d.data();
      const amount = Number(data.amount) || 0;
      if (data.operation_type === "PAYMENT" && data.operation_date === todayStr) {
        collectedToday += amount;
      }
      allEntries.push({
        id: Number(data.id),
        client_id: Number(data.client_id),
        operation_type: data.operation_type as OperationType,
        amount: roundMoney(amount),
        description: data.description || "",
        operation_date: data.operation_date || "",
        created_at: data.created_at || "",
      });
    });

    // Sort by created_at descending, then take top 10
    allEntries
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 10)
      .forEach((entry) => {
        recentActivity.push({
          ...entry,
          client_name: clientsMap.get(entry.client_id) || "عميل",
        });
      });

    return {
      total_debtors: debtors.length,
      total_receivable_amount: roundMoney(totalReceivable),
      total_collected_today: roundMoney(collectedToday),
      recent_activity: recentActivity,
    };
  }

  async seedInitialDataIfNeeded(): Promise<boolean> {
    const clientsRef = collection(this.db, "clients");
    const snap = await getDocs(clientsRef);
    if (!snap.empty) {
      return false;
    }

    const client1 = await this.createClient({
      name: "محمد العلمي",
      phone: "0612345678",
      address: "حي المسيرة، الدار البيضاء",
      notes: "عميل دائم",
    });

    await this.createEntry(client1.id, {
      operation_type: "DEBT",
      amount: 1250.5,
      description: "مواد غذائية - دفعة أولى",
      operation_date: new Date(Date.now() - 12 * 86400000).toISOString().slice(0, 10),
    });

    await this.createEntry(client1.id, {
      operation_type: "PAYMENT",
      amount: 500,
      description: "دفعة نقدية",
      operation_date: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10),
    });

    const client2 = await this.createClient({
      name: "فاطمة الزهراء بنعلي",
      phone: "0623456789",
      address: "حي الأمل، الرباط",
      notes: "تسديد شهري",
    });

    await this.createEntry(client2.id, {
      operation_type: "DEBT",
      amount: 800,
      description: "ملابس أطفال",
      operation_date: new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10),
    });

    await this.createEntry(client2.id, {
      operation_type: "PAYMENT",
      amount: 800,
      description: "تسديد كامل",
      operation_date: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10),
    });

    return true;
  }
}

export const firestoreService = new FirestoreService();
