import type { ReactNode, Ref } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { AppText } from "@/components/ui/app-text";
import { colors, fonts, radius, spacing } from "@/constants/theme";

interface FieldProps {
  label: string;
  children: ReactNode;
  error?: string;
  optional?: boolean;
  hint?: string;
  style?: StyleProp<ViewStyle>;
}

export function Field({
  label,
  children,
  error,
  optional = false,
  hint,
  style,
}: FieldProps) {
  return (
    <View style={[styles.field, style]}>
      <View style={styles.labelRow}>
        <AppText variant="label">{label}</AppText>
        {optional ? (
          <AppText tone="dim" variant="caption">
            اختياري
          </AppText>
        ) : null}
      </View>
      {children}
      {error ? (
        <AppText style={styles.error} tone="debt" variant="caption">
          {error}
        </AppText>
      ) : hint ? (
        <AppText style={styles.hint} tone="dim" variant="caption">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  optional?: boolean;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextInputProps["style"]>;
  inputRef?: Ref<TextInputInstance>;
}

export function TextField({
  label,
  error,
  optional,
  hint,
  containerStyle,
  inputStyle,
  inputRef,
  multiline,
  editable = true,
  ...inputProps
}: TextFieldProps) {
  return (
    <Field
      error={error}
      hint={hint}
      label={label}
      optional={optional}
      style={containerStyle}
    >
      <TextInput
        {...inputProps}
        ref={inputRef}
        editable={editable}
        multiline={multiline}
        placeholderTextColor={colors.dim}
        selectionColor={colors.actionStrong}
        style={[
          styles.input,
          multiline && styles.multiline,
          error && styles.inputError,
          !editable && styles.inputDisabled,
          inputStyle,
        ]}
      />
    </Field>
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
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface3,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 24,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    textAlign: "right",
    writingDirection: "rtl",
  },
  multiline: {
    minHeight: 92,
    textAlignVertical: "top",
    paddingTop: spacing.md,
  },
  inputError: {
    borderColor: colors.debt,
  },
  inputDisabled: {
    opacity: 0.55,
  },
  error: {
    marginTop: 1,
  },
  hint: {
    marginTop: 1,
  },
});
