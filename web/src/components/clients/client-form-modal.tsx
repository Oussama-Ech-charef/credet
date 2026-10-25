"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { api, apiErrorMessage } from "@/lib/api";
import { validateOptionalText, validateRequiredText } from "@/lib/validation";
import type { Client } from "@/lib/types";

interface ClientFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (client: Client) => void;
}

interface FormErrors {
  name?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export function ClientFormModal({
  open,
  onClose,
  onCreated,
}: ClientFormModalProps) {
  const formId = useId();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName("");
    setPhone("");
    setAddress("");
    setNotes("");
    setErrors({});
    setFormError("");
    setSubmitting(false);
  }, [open]);

  function validate(): boolean {
    const nextErrors: FormErrors = {};
    const nameError = validateRequiredText(name, "الاسم", 150);
    const phoneError = validateOptionalText(phone, "الهاتف", 40);
    const addressError = validateOptionalText(address, "العنوان", 300);
    const notesError = validateOptionalText(notes, "الملاحظات", 2000);

    if (nameError) nextErrors.name = nameError;
    if (phoneError) nextErrors.phone = phoneError;
    if (addressError) nextErrors.address = addressError;
    if (notesError) nextErrors.notes = notesError;

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const client = await api.createClient({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });

      toast("تمت إضافة العميل إلى السجل.");
      onCreated(client);
      onClose();
    } catch (error) {
      setFormError(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      closeOnBackdrop={false}
      footer={
        <>
          <Button disabled={submitting} onClick={onClose} variant="secondary">
            إلغاء
          </Button>
          <Button
            form={formId}
            icon="plus"
            loading={submitting}
            type="submit"
            variant="primary"
          >
            إضافة العميل
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      title="عميل جديد"
      description="أضف الاسم على الأقل. يمكنك إكمال بقية البيانات لاحقًا."
    >
      <form className="form-stack" id={formId} onSubmit={handleSubmit}>
        <Field error={errors.name} htmlFor="client-name" label="الاسم الكامل">
          <Input
            autoComplete="name"
            autoFocus
            id="client-name"
            onChange={(event) => setName(event.target.value)}
            placeholder="مثال: محمد العلوي"
            value={name}
          />
        </Field>

        <div className="form-grid">
          <Field error={errors.phone} htmlFor="client-phone" label="رقم الهاتف" optional>
            <Input
              dir="ltr"
              id="client-phone"
              inputMode="tel"
              onChange={(event) => setPhone(event.target.value)}
              placeholder="06 00 00 00 00"
              value={phone}
            />
          </Field>
          <Field error={errors.address} htmlFor="client-address" label="العنوان / الحي" optional>
            <Input
              id="client-address"
              onChange={(event) => setAddress(event.target.value)}
              placeholder="مثال: حي السلام"
              value={address}
            />
          </Field>
        </div>

        <Field error={errors.notes} htmlFor="client-notes" label="ملاحظات" optional>
          <Textarea
            id="client-notes"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="أي تفاصيل تساعدك على تذكر العميل..."
            value={notes}
          />
        </Field>

        {formError ? (
          <p className="error-state" role="alert">
            {formError}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
