# Phase 5: Client Management Screens (Mobile — Create / Edit / Delete)

## 🎯 Phase Goal

Add full client lifecycle management directly inside the mobile app.
Currently clients can only be viewed and have entries added to them.
This phase adds:
- **Create client** — a full-screen form reachable from the Clients tab
- **Edit client** — accessible from the client ledger header
- **Delete (archive) client** — with a confirmation dialog in the ledger screen

All screens must match the existing dark Arabic RTL design system exactly.

---

## 📐 Current State (before this phase)

| Capability | Available |
|---|---|
| List clients | ✅ (`mobile/src/app/(tabs)/clients.tsx`) |
| View client ledger | ✅ (`mobile/src/app/clients/[id].tsx`) |
| Add / edit / delete entries | ✅ |
| **Create a new client** | ❌ missing |
| **Edit client info** | ❌ missing |
| **Delete (archive) a client** | ❌ missing |

---

## 🗂️ Files to Create / Modify

### New files

| File | Purpose |
|---|---|
| `mobile/src/app/clients/new.tsx` | Full-screen "New Client" form |
| `mobile/src/app/clients/[id]/edit.tsx` | Full-screen "Edit Client" form (pre-filled) |
| `mobile/src/components/clients/client-form.tsx` | Shared form component used by both `new.tsx` and `edit.tsx` |

### Modified files

| File | Change |
|---|---|
| `mobile/src/app/(tabs)/clients.tsx` | Add **"+ كليان جديد"** `IconButton` in the `PageHeader` action |
| `mobile/src/app/clients/[id].tsx` | Add **edit** (pencil) and **delete** (trash) `IconButton` in the top-bar; wire the delete `ConfirmDialog` to `useDeleteClientMutation` |
| `mobile/src/app/clients/_layout.tsx` | Register the new `new` and `[id]/edit` routes (if needed by Expo Router) |

---

## 🧩 Component Spec: `client-form.tsx`

```tsx
interface ClientFormProps {
  initialValues?: Partial<ClientInput>;
  onSubmit: (values: ClientInput) => Promise<void>;
  submitLabel: string;        // "إضافة كليان" | "حفظ التعديلات"
  loading: boolean;
}
```

**Fields** (all optional except `name`):

| Field | Type | Validation |
|---|---|---|
| `name` | `TextInput` (required) | min 1 char, max 120 |
| `phone` | `TextInput` keyboardType `phone-pad` | optional, max 20 |
| `address` | `TextInput` | optional, max 200 |
| `notes` | `TextInput` multiline | optional, max 500 |

- Uses existing `TextField` component from `mobile/src/components/ui/field.tsx`
- Submit button is a full-width `Button` with `variant="primary"`, shows `loading` spinner
- On submit error: display inline error under the form using `AppText` with `tone="debt"`

---

## 🔗 Mutations to Use

These already exist in `mobile/src/hooks/use-entry-mutations.ts`:

```ts
useCreateClientMutation()   // POST to firestoreService.createClient()
useUpdateClientMutation()   // PUT to firestoreService.updateClient()
useDeleteClientMutation()   // PATCH is_archived=true via firestoreService.deleteClient()
```

`ClientInput` type is in `mobile/src/lib/types.ts`:
```ts
interface ClientInput {
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}
```

---

## 🗺️ Navigation Flows

```
Clients Tab ──[➕ button in PageHeader]──► /clients/new
                                              └─ on success → router.back()

Client Ledger (/clients/[id]) ──[✏️ pencil]──► /clients/[id]/edit
                                                  └─ on success → router.back()

Client Ledger (/clients/[id]) ──[🗑️ delete]──► ConfirmDialog (inline)
                                                  └─ on confirm → router.replace("/clients")
```

---

## 🎨 Design Guidelines

- Match the existing `quick-entry.tsx` screen style: `Screen` + `PageHeader` + `Card` wrapping the form
- Use `colors`, `spacing`, `fonts`, `radius` from `mobile/src/constants/theme.ts`
- Show `hapticSuccess()` on successful create/edit; `hapticDelete()` on successful delete
- Arabic labels for all fields:
  - name → `اسم الكليان`
  - phone → `رقم الهاتف`
  - address → `العنوان`
  - notes → `ملاحظات`
- Placeholder examples:
  - name → `مثال: محمد العلمي`
  - phone → `0612345678`
  - address → `حي المسيرة، الدار البيضاء`

---

## ✅ Acceptance Criteria

1. Tapping **"+ كليان جديد"** on the Clients tab opens the new-client form.
2. Submitting the form creates the client in Firestore and navigates back; the client list refreshes.
3. Tapping the pencil icon in a client ledger opens the edit form pre-filled with existing data.
4. Saving edits updates the client in Firestore and navigates back; the ledger and list refresh.
5. Tapping the trash icon shows a `ConfirmDialog`; confirming archives the client and navigates to `/clients`.
6. All forms are fully Arabic RTL; numeric keyboard opens for phone field.
7. Submission errors are displayed inline; loading state disables the submit button.
8. `tsc --noEmit` exits 0 after the phase is complete.
