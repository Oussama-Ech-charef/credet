import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { spacing } from "@/constants/theme";
import { apiErrorMessage } from "@/lib/api";
import type { ClientInput } from "@/lib/types";
import {
  validateOptionalText,
  validateRequiredText,
} from "@/lib/validation";

interface ClientFormProps {
  initialValues?: Partial<ClientInput>;
  onSubmit: (values: ClientInput) => Promise<void>;
  submitLabel: string;
  loading: boolean;
}

interface FormErrors {
  name?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

function saveErrorMessage(error: unknown): string {
  const message = apiErrorMessage(error);

  return /[\u0600-\u06FF]/.test(message)
    ? message
    : "تعذر حفظ بيانات الكليان. تحقق من الاتصال وأعد المحاولة.";
}

export function ClientForm({
  initialValues,
  onSubmit,
  submitLabel,
  loading,
}: ClientFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [phone, setPhone] = useState(initialValues?.phone ?? "");
  const [address, setAddress] = useState(initialValues?.address ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState("");

  const resetError = (field: keyof FormErrors) => {
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError("");
  };

  const handleSubmit = async () => {
    if (loading) {
      return;
    }

    const nextErrors: FormErrors = {
      name: validateRequiredText(name, "اسم الكليان", 120),
      phone: validateOptionalText(phone, "رقم الهاتف", 20),
      address: validateOptionalText(address, "العنوان", 200),
      notes: validateOptionalText(notes, "الملاحظات", 500),
    };

    setErrors(nextErrors);
    setFormError("");

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });
    } catch (error) {
      setFormError(saveErrorMessage(error));
    }
  };

  return (
    <View style={styles.form}>
      <TextField
        error={errors.name}
        label="اسم الكليان"
        maxLength={120}
        onChangeText={(value) => {
          setName(value);
          resetError("name");
        }}
        placeholder="مثال: محمد العلمي"
        returnKeyType="next"
        value={name}
      />

      <TextField
        error={errors.phone}
        keyboardType="phone-pad"
        label="رقم الهاتف"
        maxLength={20}
        onChangeText={(value) => {
          setPhone(value);
          resetError("phone");
        }}
        optional
        placeholder="0612345678"
        returnKeyType="next"
        value={phone}
      />

      <TextField
        error={errors.address}
        label="العنوان"
        maxLength={200}
        onChangeText={(value) => {
          setAddress(value);
          resetError("address");
        }}
        optional
        placeholder="حي المسيرة، الدار البيضاء"
        returnKeyType="next"
        value={address}
      />

      <TextField
        error={errors.notes}
        label="ملاحظات"
        maxLength={500}
        multiline
        onChangeText={(value) => {
          setNotes(value);
          resetError("notes");
        }}
        optional
        placeholder="مثال: يفضل الدفع نهاية الشهر"
        value={notes}
      />

      {formError ? (
        <AppText accessibilityLiveRegion="polite" tone="debt" variant="body">
          {formError}
        </AppText>
      ) : null}

      <Button
        disabled={loading}
        fullWidth
        label={submitLabel}
        loading={loading}
        onPress={() => void handleSubmit()}
        variant="primary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
});
