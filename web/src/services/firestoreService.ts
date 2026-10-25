import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type Transaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logError, markErrorLogged } from "@/lib/logger";
import type {
  ActivityItem,
  Client,
  ClientDetailResponse,
  ClientInput,
  ClientStatus,
  Entry,
  EntryDeleteResponse,
  EntryInput,
  EntryMutationResponse,
  OperationType,
  ShopSettings,
  StatsOverview,
} from "@/lib/types";

const COUNTER_COLLECTION = "metadata";
const COUNTER_DOCUMENT = "counters";

function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function toNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toText(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return fallback;
}

function toNullableText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();
  return text ? text : null;
}

function toOperationType(value: unknown): OperationType {
  return value === "PAYMENT" ? "PAYMENT" : "DEBT";
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function requireText(value: unknown, message: string): string {
  const text = toNullableText(value);
  if (!text) {
    throw new Error(message);
  }

  return text;
}

function requirePositiveAmount(value: unknown): number {
  const amount = roundMoney(Number(value));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("المبلغ يجب أن يكون أكبر من صفر.");
  }

  return amount;
}

function contributionFor(
  operationType: OperationType,
  amount: number,
): { debt: number; paid: number } {
  return operationType === "DEBT"
    ? { debt: amount, paid: 0 }
    : { debt: 0, paid: amount };
}

function clientTotalsFromData(data: DocumentData): {
  total_debt: number;
  total_paid: number;
  current_balance: number;
} {
  const totalDebt = roundMoney(toNumber(data.total_debt));
  const totalPaid = roundMoney(toNumber(data.total_paid));
  const currentBalance =
    data.current_balance !== undefined && data.current_balance !== null
      ? roundMoney(toNumber(data.current_balance))
      : roundMoney(totalDebt - totalPaid);

  return {
    total_debt: totalDebt,
    total_paid: totalPaid,
    current_balance: currentBalance,
  };
}

function mapClientBase(
  documentId: string,
  data: DocumentData,
): ClientDetailResponse["client"] {
  return {
    id: toNumber(data.id, Number(documentId)),
    name: toText(data.name),
    phone: toNullableText(data.phone),
    address: toNullableText(data.address),
    notes: toNullableText(data.notes),
    is_archived: Boolean(data.is_archived),
    created_at: toText(data.created_at, new Date().toISOString()),
    updated_at: toText(data.updated_at, new Date().toISOString()),
    entries_count: Math.max(0, Math.floor(toNumber(data.entries_count))),
    last_operation_date: toNullableText(data.last_operation_date),
  };
}

function mapClient(documentId: string, data: DocumentData): Client {
  return {
    ...mapClientBase(documentId, data),
    ...clientTotalsFromData(data),
  };
}

function mapEntry(documentId: string, data: DocumentData): Entry {
  return {
    id: toNumber(data.id, Number(documentId)),
    client_id: toNumber(data.client_id),
    operation_type: toOperationType(data.operation_type),
    amount: roundMoney(toNumber(data.amount)),
    description: toText(data.description),
    operation_date: toText(data.operation_date),
    note: toNullableText(data.note),
    created_at: toText(data.created_at),
    updated_at: toText(data.updated_at),
  };
}

function mapSettings(data: DocumentData): ShopSettings {
  return {
    shop_name: toText(data.shop_name, "Credet Shop"),
    shop_phone: toText(data.shop_phone),
    currency: toText(data.currency, "DH"),
    updated_at: toNullableText(data.updated_at),
  };
}

async function runLoggedTransaction<T>(
  operation: (transaction: Transaction) => Promise<T>,
): Promise<T> {
  try {
    return await runTransaction(db, operation);
  } catch (error) {
    logError("FirestoreService", error);
    markErrorLogged(error);
    throw error;
  }
}

export class FirestoreService {
  private async getNextId(counterName: "client_id" | "entry_id"): Promise<number> {
    // Keep the same counter document as the mobile app so both clients
    // allocate IDs from one shared sequence.
    const counterRef = doc(db, COUNTER_COLLECTION, COUNTER_DOCUMENT);

    return await runLoggedTransaction(async (transaction) => {
      const snap = await transaction.get(counterRef);
      const current = snap.exists()
        ? Math.max(0, Math.floor(toNumber(snap.data()[counterName])))
        : 0;
      const nextId = current + 1;

      if (snap.exists()) {
        transaction.update(counterRef, { [counterName]: nextId });
      } else {
        transaction.set(counterRef, { [counterName]: nextId }, { merge: true });
      }

      return nextId;
    });
  }

  async getSettings(): Promise<ShopSettings> {
    const docRef = doc(db, "settings", "general");
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return mapSettings(snap.data());
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
    const docRef = doc(db, "settings", "general");
    const current = await this.getSettings();
    const updated: ShopSettings = {
      shop_name:
        input.shop_name !== undefined
          ? String(input.shop_name).trim()
          : current.shop_name,
      shop_phone:
        input.shop_phone !== undefined
          ? String(input.shop_phone).trim()
          : current.shop_phone,
      currency:
        input.currency !== undefined
          ? String(input.currency).trim()
          : current.currency,
      updated_at: new Date().toISOString(),
    };

    await setDoc(docRef, updated, { merge: true });
    return updated;
  }

  async listClients(
    options: { search?: string; status?: ClientStatus } = {},
  ): Promise<Client[]> {
    // A single equality filter plus in-memory search/sort avoids composite
    // Firestore indexes while keeping the dataset small and predictable.
    const snap = await getDocs(
      query(collection(db, "clients"), where("is_archived", "==", false)),
    );

    let clients = snap.docs.map((document) =>
      mapClient(document.id, document.data()),
    );

    const search = normalizeSearchText(options.search || "");
    if (search) {
      clients = clients.filter((client) =>
        [client.name, client.phone || "", client.address || ""].some((value) =>
          normalizeSearchText(value).includes(search),
        ),
      );
    }

    if (options.status === "debt") {
      clients = clients.filter((client) => client.current_balance > 0);
    } else if (options.status === "settled") {
      clients = clients.filter((client) => client.current_balance <= 0);
    }

    clients.sort(
      (left, right) =>
        left.name.localeCompare(right.name, "ar") || left.id - right.id,
    );

    return clients;
  }

  async getClient(id: number): Promise<ClientDetailResponse> {
    const snap = await getDoc(doc(db, "clients", String(id)));
    const data = snap.data();

    if (!snap.exists() || !data) {
      throw new Error("لم يتم العثور على الكليان المطلوب.");
    }

    return {
      client: mapClientBase(snap.id, data),
      ...clientTotalsFromData(data),
    };
  }

  async createClient(input: ClientInput): Promise<Client> {
    const name = requireText(input.name, "اسم الكليان مطلوب.");
    const id = await this.getNextId("client_id");
    const now = new Date().toISOString();

    const newClient: Client = {
      id,
      name,
      phone: toNullableText(input.phone),
      address: toNullableText(input.address),
      notes: toNullableText(input.notes),
      is_archived: false,
      created_at: now,
      updated_at: now,
      total_debt: 0,
      total_paid: 0,
      current_balance: 0,
      entries_count: 0,
      last_operation_date: null,
    };

    await setDoc(doc(db, "clients", String(id)), newClient);
    return newClient;
  }

  async updateClient(id: number, input: Partial<ClientInput>): Promise<Client> {
    const docRef = doc(db, "clients", String(id));
    const snap = await getDoc(docRef);

    if (!snap.exists() || !snap.data()) {
      throw new Error("الكليان غير موجود.");
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) {
      updates.name = requireText(input.name, "اسم الكليان مطلوب.");
    }
    if (input.phone !== undefined) {
      updates.phone = toNullableText(input.phone);
    }
    if (input.address !== undefined) {
      updates.address = toNullableText(input.address);
    }
    if (input.notes !== undefined) {
      updates.notes = toNullableText(input.notes);
    }

    await updateDoc(docRef, updates);

    const updatedSnap = await getDoc(docRef);
    const updatedData = updatedSnap.data();

    if (!updatedSnap.exists() || !updatedData) {
      throw new Error("تعذر تحميل بيانات الكليان بعد التحديث.");
    }

    return mapClient(updatedSnap.id, updatedData);
  }

  async deleteClient(id: number): Promise<{ success: boolean; id: number }> {
    const docRef = doc(db, "clients", String(id));
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      throw new Error("لم يتم العثور على الكليان المطلوب.");
    }

    await updateDoc(docRef, {
      is_archived: true,
      updated_at: new Date().toISOString(),
    });

    return { success: true, id };
  }

  async listEntries(clientId: number): Promise<Entry[]> {
    const snap = await getDocs(
      query(
        collection(db, "credit_entries"),
        where("client_id", "==", clientId),
      ),
    );

    return snap.docs
      .map((document) => mapEntry(document.id, document.data()))
      .sort((left, right) => {
        if (left.operation_date !== right.operation_date) {
          return left.operation_date < right.operation_date ? 1 : -1;
        }

        return right.id - left.id;
      });
  }

  async createEntry(
    clientId: number,
    input: EntryInput,
  ): Promise<EntryMutationResponse> {
    if (input.operation_type !== "DEBT" && input.operation_type !== "PAYMENT") {
      throw new Error("نوع الحركة غير صالح.");
    }

    const amount = requirePositiveAmount(input.amount);
    const description = requireText(
      input.description,
      "وصف الحركة مطلوب.",
    );
    const id = await this.getNextId("entry_id");
    const now = new Date().toISOString();
    const operationDate = toText(input.operation_date, now.slice(0, 10));
    const entryRef = doc(db, "credit_entries", String(id));
    const clientRef = doc(db, "clients", String(clientId));

    const newEntry: Entry = {
      id,
      client_id: clientId,
      operation_type: input.operation_type,
      amount,
      description,
      operation_date: operationDate,
      note: toNullableText(input.note),
      created_at: now,
      updated_at: now,
    };

    return await runLoggedTransaction(async (transaction) => {
      const clientSnap = await transaction.get(clientRef);
      const clientData = clientSnap.data();

      if (!clientSnap.exists() || !clientData) {
        throw new Error("لم يتم العثور على الكليان المطلوب.");
      }

      const totals = clientTotalsFromData(clientData);
      const contribution = contributionFor(
        input.operation_type,
        amount,
      );
      const totalDebt = roundMoney(totals.total_debt + contribution.debt);
      const totalPaid = roundMoney(totals.total_paid + contribution.paid);
      const currentBalance = roundMoney(totalDebt - totalPaid);
      const currentLastDate = toNullableText(
        clientData.last_operation_date,
      );
      const lastOperationDate =
        !currentLastDate || operationDate > currentLastDate
          ? operationDate
          : currentLastDate;

      transaction.set(entryRef, newEntry);
      transaction.update(clientRef, {
        total_debt: totalDebt,
        total_paid: totalPaid,
        current_balance: currentBalance,
        entries_count:
          Math.max(0, Math.floor(toNumber(clientData.entries_count))) + 1,
        last_operation_date: lastOperationDate,
        updated_at: now,
      });

      return {
        ...newEntry,
        total_debt: totalDebt,
        total_paid: totalPaid,
        current_balance: currentBalance,
      };
    });
  }

  async updateEntry(
    id: number,
    input: Partial<EntryInput>,
  ): Promise<EntryMutationResponse> {
    const entryRef = doc(db, "credit_entries", String(id));
    const now = new Date().toISOString();

    const outcome = await runLoggedTransaction(async (transaction) => {
      const entrySnap = await transaction.get(entryRef);
      const currentEntry = entrySnap.data();

      if (!entrySnap.exists() || !currentEntry) {
        throw new Error("المعاملة غير موجودة.");
      }

      const clientId = toNumber(currentEntry.client_id);
      if (clientId <= 0) {
        throw new Error("بيانات الحركة غير صالحة.");
      }

      const clientRef = doc(db, "clients", String(clientId));
      const clientSnap = await transaction.get(clientRef);
      const clientData = clientSnap.data();

      if (!clientSnap.exists() || !clientData) {
        throw new Error("لم يتم العثور على الكليان المطلوب.");
      }

      const oldOperationType = toOperationType(currentEntry.operation_type);
      const oldAmount = roundMoney(toNumber(currentEntry.amount));
      const nextOperationType =
        input.operation_type !== undefined
          ? input.operation_type
          : oldOperationType;

      if (
        nextOperationType !== "DEBT" &&
        nextOperationType !== "PAYMENT"
      ) {
        throw new Error("نوع الحركة غير صالح.");
      }

      const nextAmount =
        input.amount !== undefined
          ? requirePositiveAmount(input.amount)
          : oldAmount;
      const oldOperationDate = toText(currentEntry.operation_date);
      const nextOperationDate =
        input.operation_date !== undefined
          ? requireText(input.operation_date, "تاريخ الحركة مطلوب.")
          : oldOperationDate;
      const nextDescription =
        input.description !== undefined
          ? requireText(input.description, "وصف الحركة مطلوب.")
          : toText(currentEntry.description);

      const updates: Record<string, unknown> = { updated_at: now };
      if (input.operation_type !== undefined) {
        updates.operation_type = nextOperationType;
      }
      if (input.amount !== undefined) {
        updates.amount = nextAmount;
      }
      if (input.description !== undefined) {
        updates.description = nextDescription;
      }
      if (input.operation_date !== undefined) {
        updates.operation_date = nextOperationDate;
      }
      if (input.note !== undefined) {
        updates.note = toNullableText(input.note);
      }

      const previousContribution = contributionFor(
        oldOperationType,
        oldAmount,
      );
      const nextContribution = contributionFor(
        nextOperationType,
        nextAmount,
      );
      const totals = clientTotalsFromData(clientData);
      const totalDebt = Math.max(
        0,
        roundMoney(
          totals.total_debt -
            previousContribution.debt +
            nextContribution.debt,
        ),
      );
      const totalPaid = Math.max(
        0,
        roundMoney(
          totals.total_paid -
            previousContribution.paid +
            nextContribution.paid,
        ),
      );
      const currentBalance = roundMoney(totalDebt - totalPaid);
      const currentLastDate = toNullableText(
        clientData.last_operation_date,
      );
      const lastOperationDate =
        !currentLastDate || nextOperationDate > currentLastDate
          ? nextOperationDate
          : currentLastDate;
      const shouldRefreshLastDate = Boolean(
        currentLastDate &&
          oldOperationDate === currentLastDate &&
          nextOperationDate < currentLastDate,
      );

      transaction.update(entryRef, updates);
      transaction.update(clientRef, {
        total_debt: totalDebt,
        total_paid: totalPaid,
        current_balance: currentBalance,
        last_operation_date: lastOperationDate,
        updated_at: now,
      });

      const updatedEntry = mapEntry(entryRef.id, {
        ...currentEntry,
        ...updates,
      });

      return {
        result: {
          ...updatedEntry,
          total_debt: totalDebt,
          total_paid: totalPaid,
          current_balance: currentBalance,
        } satisfies EntryMutationResponse,
        clientId,
        shouldRefreshLastDate,
      };
    });

    if (outcome.shouldRefreshLastDate) {
      // The balance is already committed atomically. This derived date is
      // repaired from the remaining entries without risking the saved data.
      try {
        await this.refreshLastOperationDate(outcome.clientId);
      } catch {
        // A later ledger mutation or page refresh will repair the date.
      }
    }

    return outcome.result;
  }

  async deleteEntry(id: number): Promise<EntryDeleteResponse> {
    const entryRef = doc(db, "credit_entries", String(id));

    const outcome = await runLoggedTransaction(async (transaction) => {
      const entrySnap = await transaction.get(entryRef);
      const currentEntry = entrySnap.data();

      if (!entrySnap.exists() || !currentEntry) {
        throw new Error("المعاملة غير موجودة.");
      }

      const clientId = toNumber(currentEntry.client_id);
      if (clientId <= 0) {
        throw new Error("بيانات الحركة غير صالحة.");
      }

      const clientRef = doc(db, "clients", String(clientId));
      const clientSnap = await transaction.get(clientRef);
      const clientData = clientSnap.data();

      if (!clientSnap.exists() || !clientData) {
        throw new Error("لم يتم العثور على الكليان المطلوب.");
      }

      const operationType = toOperationType(currentEntry.operation_type);
      const amount = roundMoney(toNumber(currentEntry.amount));
      const contribution = contributionFor(operationType, amount);
      const totals = clientTotalsFromData(clientData);
      const totalDebt = Math.max(
        0,
        roundMoney(totals.total_debt - contribution.debt),
      );
      const totalPaid = Math.max(
        0,
        roundMoney(totals.total_paid - contribution.paid),
      );
      const currentBalance = roundMoney(totalDebt - totalPaid);
      const currentLastDate = toNullableText(
        clientData.last_operation_date,
      );
      const deletedOperationDate = toText(currentEntry.operation_date);
      const shouldRefreshLastDate = Boolean(
        currentLastDate && deletedOperationDate === currentLastDate,
      );

      transaction.delete(entryRef);
      transaction.update(clientRef, {
        total_debt: totalDebt,
        total_paid: totalPaid,
        current_balance: currentBalance,
        entries_count: Math.max(
          0,
          Math.floor(toNumber(clientData.entries_count)) - 1,
        ),
        last_operation_date: currentLastDate,
        updated_at: new Date().toISOString(),
      });

      return {
        clientId,
        total_debt: totalDebt,
        total_paid: totalPaid,
        current_balance: currentBalance,
        shouldRefreshLastDate,
      };
    });

    if (outcome.shouldRefreshLastDate) {
      try {
        await this.refreshLastOperationDate(outcome.clientId);
      } catch {
        // The balance is already committed; a later mutation repairs the date.
      }
    }

    return {
      success: true,
      client_id: outcome.clientId,
      total_debt: outcome.total_debt,
      total_paid: outcome.total_paid,
      current_balance: outcome.current_balance,
    };
  }

  async getStats(): Promise<StatsOverview> {
    const clients = await this.listClients({ status: "all" });
    const debtors = clients.filter(
      (client) => client.current_balance > 0,
    );
    const totalReceivable = debtors.reduce(
      (sum, client) => sum + client.current_balance,
      0,
    );

    const today = new Date().toISOString().slice(0, 10);
    const snap = await getDocs(query(collection(db, "credit_entries")));
    const clientsById = new Map(
      clients.map((client) => [client.id, client.name]),
    );

    let collectedToday = 0;
    const activity: Array<Omit<ActivityItem, "client_name">> = [];

    snap.forEach((document) => {
      const data = document.data();
      const operationType = toOperationType(data.operation_type);
      const amount = roundMoney(toNumber(data.amount));
      const operationDate = toText(data.operation_date);

      if (operationType === "PAYMENT" && operationDate === today) {
        collectedToday += amount;
      }

      activity.push({
        id: toNumber(data.id, Number(document.id)),
        client_id: toNumber(data.client_id),
        operation_type: operationType,
        amount,
        description: toText(data.description),
        operation_date: operationDate,
        created_at: toText(data.created_at),
      });
    });

    const recentActivity = activity
      .sort(
        (left, right) =>
          right.created_at.localeCompare(left.created_at) ||
          right.id - left.id,
      )
      .slice(0, 10)
      .map((entry) => ({
        ...entry,
        client_name: clientsById.get(entry.client_id) || "زبون",
      }));

    return {
      total_debtors: debtors.length,
      total_receivable_amount: roundMoney(totalReceivable),
      total_collected_today: roundMoney(collectedToday),
      recent_activity: recentActivity,
    };
  }

  async exportJson(): Promise<{ blob: Blob; filename: string }> {
    const [clientsSnap, entriesSnap, settings] = await Promise.all([
      getDocs(query(collection(db, "clients"))),
      getDocs(query(collection(db, "credit_entries"))),
      this.getSettings(),
    ]);

    const clients = clientsSnap.docs
      .map((document) => ({
        ...document.data(),
        id: toNumber(document.data().id, Number(document.id)),
      }))
      .sort((left, right) => toNumber(left.id) - toNumber(right.id));

    const entries = entriesSnap.docs
      .map((document) => ({
        ...document.data(),
        id: toNumber(document.data().id, Number(document.id)),
      }))
      .sort((left, right) => toNumber(left.id) - toNumber(right.id));

    const blob = new Blob(
      [JSON.stringify({ clients, entries, settings }, null, 2)],
      { type: "application/json;charset=utf-8" },
    );

    return {
      blob,
      filename: "credet-firestore-backup.json",
    };
  }

  private async refreshLastOperationDate(clientId: number): Promise<void> {
    const snap = await getDocs(
      query(
        collection(db, "credit_entries"),
        where("client_id", "==", clientId),
      ),
    );

    let lastDate: string | null = null;
    snap.forEach((document) => {
      const operationDate = toNullableText(
        document.data().operation_date,
      );
      if (operationDate && (!lastDate || operationDate > lastDate)) {
        lastDate = operationDate;
      }
    });

    await updateDoc(doc(db, "clients", String(clientId)), {
      last_operation_date: lastDate,
      updated_at: new Date().toISOString(),
    });
  }
}

export const firestoreService = new FirestoreService();
