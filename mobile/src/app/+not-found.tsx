import { useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { spacing } from "@/constants/theme";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <PageHeader
        subtitle="الرابط الذي فتحته غير موجود أو تم نقله."
        title="الصفحة غير موجودة"
      />
      <View style={styles.content}>
        <EmptyState
          actionLabel="العودة للرئيسية"
          description="يمكنك الرجوع إلى لوحة التحكم ومتابعة العمل من هناك."
          icon="compass-outline"
          onAction={() => router.replace("/")}
          title="لم نجد هذه الصفحة"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    marginTop: spacing.lg,
  },
});
