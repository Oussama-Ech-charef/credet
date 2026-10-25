"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { useSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import {
  validateOptionalText,
  validateRequiredText,
} from "@/lib/validation";
import type { ShopSettings } from "@/lib/types";

interface ShopProfileFormProps {
  settings: ShopSettings;
}

interface FormErrors {
  shop_name?: string;
  shop_phone?: string;
  currency?: string;
}

export function ShopProfileForm({ settings }: ShopProfileFormProps) {
  const formId = useId();
  const { saveSettings } = useSettings();
  const { toast } = useToast();
  const [shopName, setShopName] = useState(settings.shop_name);
  const [shopPhone, setShopPhone] = useState(settings.shop_phone);
  const [currency, setCurrency] = useState(settings.currency);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setShopName(settings.shop_name);
    setShopPhone(settings.shop_phone);
    setCurrency(settings.currency);
  }, [settings]);

  function validate(): boolean {
    const nextErrors: FormErrors = {};
    const nameError = validateRequiredText(shopName, "اسم المتجر", 120);
    const phoneError = validateOptionalText(shopPhone, "هاتف المتجر", 40);
    const currencyError = validateRequiredText(currency, "العملة", 10);

    if (nameError) nextErrors.shop_name = nameError;
    if (phoneError) nextErrors.shop_phone = phoneError;
    if (currencyError) nextErrors.currency = currencyError;

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      await saveSettings({
        shop_name: shopName.trim(),
        shop_phone: shopPhone.trim(),
        currency: currency.trim(),
      });
      toast("تم حفظ بيانات المتجر.");
    } catch (error) {
      setFormError(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="shop-profile-title" className="settings-card">
      <header className="settings-card__header">
        <h2 className="settings-card__title" id="shop-profile-title">
          هوية المتجر
        </h2>
        <p className="settings-card__description">
          تظهر هذه البيانات في رأس كشوف الحساب والفواتير التي تنزّلها من السجل.
        </p>
      </header>

      <form className="form-stack" id={formId} onSubmit={handleSubmit}>
        <Field
          error={errors.shop_name}
          htmlFor="settings-shop-name"
          label="اسم المتجر"
        >
          <Input
            autoComplete="organization"
            id="settings-shop-name"
            onChange={(event) => setShopName(event.target.value)}
            placeholder="مثال: بقالة النور"
            value={shopName}
          />
        </Field>

        <div className="form-grid">
          <Field
            error={errors.shop_phone}
            htmlFor="settings-shop-phone"
            label="هاتف المتجر"
            optional
          >
            <Input
              dir="ltr"
              id="settings-shop-phone"
              inputMode="tel"
              onChange={(event) => setShopPhone(event.target.value)}
              placeholder="06 00 00 00 00"
              value={shopPhone}
            />
          </Field>
          <Field
            error={errors.currency}
            hint="مثال: DH أو MAD"
            htmlFor="settings-currency"
            label="العملة"
          >
            <Input
              id="settings-currency"
              maxLength={10}
              onChange={(event) => setCurrency(event.target.value)}
              placeholder="DH"
              value={currency}
            />
          </Field>
        </div>

        {settings.updated_at ? (
          <p className="field__hint">
            آخر حفظ: {formatDate(settings.updated_at)}
          </p>
        ) : null}

        {formError ? (
          <p className="error-state" role="alert">
            <Icon name="alert" size={17} />
            <span>{formError}</span>
          </p>
        ) : null}

        <div className="form-actions">
          <Button
            form={formId}
            icon="save"
            loading={saving}
            type="submit"
            variant="primary"
          >
            حفظ التغييرات
          </Button>
        </div>
      </form>
    </section>
  );
}
