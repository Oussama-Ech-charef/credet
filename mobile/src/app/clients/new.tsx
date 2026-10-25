import { useCanGoBack, useRouter } from "expo-router";

import { ClientForm } from "@/components/clients/client-form";
import { IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { useCreateClientMutation } from "@/hooks/use-entry-mutations";
import { hapticSuccess } from "@/lib/haptics";
import type { ClientInput } from "@/lib/types";
import { useToast } from "@/providers/toast-provider";

export default function NewClientScreen() {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const { showToast } = useToast();
  const createMutation = useCreateClientMutation();

  const goBack = () => {
    if (canGoBack) {
      router.back();
    } else {
      router.replace("/clients");
    }
  };

  const handleSubmit = async (values: ClientInput) => {
    const client = await createMutation.mutateAsync(values);

    await hapticSuccess();
    showToast(`تمت إضافة العميل "${client.name}" بنجاح.`, "success");
    goBack();
  };

  return (
    <Screen>
      <PageHeader
        action={
          <IconButton
            accessibilityLabel="رجوع إلى قائمة العملاء"
            icon="arrow-forward"
            onPress={goBack}
          />
        }
        subtitle="أدخل بيانات العميل مرة واحدة، ثم ابدأ تسجيل الحركات."
        title="عميل جديد"
      />

      <Card>
        <ClientForm
          loading={createMutation.isPending}
          onSubmit={handleSubmit}
          submitLabel="إضافة عميل"
        />
      </Card>
    </Screen>
  );
}
