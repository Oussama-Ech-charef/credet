import { useCanGoBack, useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { ClientForm } from "@/components/clients/client-form";
import { IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { spacing } from "@/constants/theme";
import { useClientDetail } from "@/hooks/use-credet-queries";
import { useUpdateClientMutation } from "@/hooks/use-entry-mutations";
import { apiErrorMessage } from "@/lib/api";
import { hapticSuccess } from "@/lib/haptics";
import type { ClientInput } from "@/lib/types";
import { useToast } from "@/providers/toast-provider";

export default function EditClientScreen() {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ id: string }>();
  const clientId = Number(params.id);
  const validId = Number.isSafeInteger(clientId) && clientId > 0;
  const detailQuery = useClientDetail(validId ? clientId : null);
  const updateMutation = useUpdateClientMutation();
  const detail = detailQuery.data;

  const goBack = () => {
    if (canGoBack) {
      router.back();
    } else {
      router.replace("/clients");
    }
  };

  const handleSubmit = async (values: ClientInput) => {
    await updateMutation.mutateAsync({ id: clientId, input: values });

    await hapticSuccess();
    showToast("تم تحديث بيانات الكليان بنجاح.", "success");
    goBack();
  };

  return (
    <Screen>
      <PageHeader
        action={
          <IconButton
            accessibilityLabel="رجوع إلى كشف الحساب"
            icon="arrow-forward"
            onPress={goBack}
          />
        }
        subtitle="عدّل بيانات الكليان وستظهر التغييرات مباشرة في كشف الحساب."
        title="تعديل الكليان"
      />

      {!validId ? (
        <ErrorState
          message="معرّف الكليان في الرابط غير صالح. ارجع إلى قائمة الكليان واختر حسابًا."
          onRetry={goBack}
          title="رابط غير صالح"
        />
      ) : detailQuery.isPending ? (
        <Card>
          <View style={styles.loading}>
            <Skeleton height={50} />
            <Skeleton height={50} />
            <Skeleton height={50} />
            <Skeleton height={92} />
            <Skeleton height={48} />
          </View>
        </Card>
      ) : detailQuery.isError ? (
        <ErrorState
          message={apiErrorMessage(detailQuery.error)}
          onRetry={() => void detailQuery.refetch()}
          title="تعذر تحميل بيانات الكليان"
        />
      ) : detail ? (
        <Card>
          <ClientForm
            initialValues={detail.client}
            key={detail.client.id}
            loading={updateMutation.isPending}
            onSubmit={handleSubmit}
            submitLabel="حفظ التعديلات"
          />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    gap: spacing.md,
  },
});
