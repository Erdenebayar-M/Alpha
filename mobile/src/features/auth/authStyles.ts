import { StyleSheet } from 'react-native';

/**
 * Style rules shared across the three screens that hand-type a form + one big blue
 * button: login, register (100% identical StyleSheets — both drive `AuthForm`), and
 * the learner-picker's inline "add child" form (`app/(app)/index.tsx`), which re-typed
 * the same rules a third time. `button`/`linkButton` hold only what all three share —
 * login/register additionally want extra top margin on both, applied locally in
 * `AuthForm` (index.tsx's own layout already spaces them via its `.form` gap).
 */
export const authStyles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  error: {
    color: '#c0392b',
  },
  button: {
    height: 48,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    color: '#2563eb',
  },
});
