import { useState, type Ref } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
} from "react-native";

import { AppText } from "@/components/ui/app-text";
import { colors, fonts, radius, spacing } from "@/constants/theme";

interface AmountInputProps {
  value: string;
  onChangeText: (value: string) => void;
  currency?: string;
  error?: string;
  label?: string;
  inputRef?: Ref<TextInputInstance>;
  autoFocus?: boolean;
  onSubmitEditing?: TextInputProps["onSubmitEditing"];
  editable?: boolean;
  onFocus?: TextInputProps["onFocus"];
  onBlur?: TextInputProps["onBlur"];
}

export function AmountInput({
  value,
  onChangeText,
  currency = "DH",
  error,
  label = "المبلغ",
  inputRef,
  autoFocus = false,
  onSubmitEditing,
  editable = true,
  onFocus,
  onBlur,
}: AmountInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <AppText variant="label">{label}</AppText>
        <AppText tone="dim" variant="caption">
          {currency === "DH" ? "بالدرهم" : currency}
        </AppText>
      </View>
      <View
        style={[
          styles.shell,
          focused && styles.shellFocused,
          error && styles.shellError,
          !editable && styles.shellDisabled,
        ]}
      >
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          autoFocus={autoFocus}
          editable={editable}
          inputMode="decimal"
          keyboardType="decimal-pad"
          maxLength={14}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onChangeText={onChangeText}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onSubmitEditing={onSubmitEditing}
          placeholder="0.00"
          placeholderTextColor={colors.dim}
          returnKeyType="done"
          selectionColor={colors.actionStrong}
          selectTextOnFocus
          style={styles.input}
          value={value}
        />
        <AppText style={styles.currency} tone="muted" variant="bodyStrong">
          {currency}
        </AppText>
      </View>
      {error ? (
        <AppText style={styles.error} tone="debt" variant="caption">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  shell: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface3,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  shellFocused: {
    borderColor: colors.action,
    backgroundColor: colors.surface2,
  },
  shellError: {
    borderColor: colors.debt,
  },
  shellDisabled: {
    opacity: 0.55,
  },
  input: {
    flex: 1,
    minHeight: 78,
    color: colors.text,
    fontFamily: fonts.extrabold,
    fontSize: 36,
    lineHeight: 46,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
    paddingVertical: spacing.sm,
  },
  currency: {
    minWidth: 34,
    textAlign: "left",
    writingDirection: "ltr",
  },
  error: {
    marginTop: 1,
  },
});
