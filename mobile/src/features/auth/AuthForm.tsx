import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, type TextInputProps } from 'react-native';

import PressableScale from '@/src/components/PressableScale';
import { authStyles } from '@/src/features/auth/authStyles';

interface AuthField {
  key: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  keyboardType?: TextInputProps['keyboardType'];
}

interface AuthFormProps {
  title: string;
  fields: AuthField[];
  error: string | null;
  isSubmitting: boolean;
  cta: string;
  onSubmit: () => void;
  footerLabel: string;
  onFooterPress: () => void;
}

/**
 * The login/register screen shell: title, a list of text fields, an error line, a big
 * submit button, and a footer link to the other screen. Both screens had 100%
 * identical StyleSheets and near-identical `handleSubmit` shapes — this owns the
 * shared layout; each screen still owns its own auth call and field state.
 */
export default function AuthForm({
  title,
  fields,
  error,
  isSubmitting,
  cta,
  onSubmit,
  footerLabel,
  onFooterPress,
}: AuthFormProps) {
  return (
    <KeyboardAvoidingView style={authStyles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={authStyles.container} keyboardShouldPersistTaps="handled">
        <Text style={authStyles.title}>{title}</Text>

        {fields.map((field) => (
          <TextInput
            key={field.key}
            style={authStyles.input}
            placeholder={field.placeholder}
            secureTextEntry={field.secureTextEntry}
            autoCapitalize={field.autoCapitalize}
            autoComplete={field.autoComplete}
            keyboardType={field.keyboardType}
            value={field.value}
            onChangeText={field.onChangeText}
          />
        ))}

        {error ? <Text style={authStyles.error}>{error}</Text> : null}

        <PressableScale
          style={[authStyles.button, styles.button, isSubmitting && authStyles.buttonDisabled]}
          onPress={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={authStyles.buttonText}>{cta}</Text>}
        </PressableScale>

        <PressableScale style={[authStyles.linkButton, styles.linkButton]} onPress={onFooterPress}>
          <Text style={authStyles.linkText}>{footerLabel}</Text>
        </PressableScale>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// The extra breathing room login/register want on top of authStyles' shared base —
// index.tsx's own "add child" form already spaces its button/link via its `.form` gap.
const styles = StyleSheet.create({
  button: {
    marginTop: 8,
  },
  linkButton: {
    marginTop: 16,
  },
});
