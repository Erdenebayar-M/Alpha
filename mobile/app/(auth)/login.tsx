import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ApiError, GENERIC_ERROR_MESSAGE } from '@/src/api/client';
import { useAuth } from '@/src/features/auth/AuthContext';
import AuthForm from '@/src/features/auth/AuthForm';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthForm
      title="Log in"
      fields={[
        {
          key: 'email',
          value: email,
          onChangeText: setEmail,
          placeholder: 'Email',
          autoCapitalize: 'none',
          autoComplete: 'email',
          keyboardType: 'email-address',
        },
        {
          key: 'password',
          value: password,
          onChangeText: setPassword,
          placeholder: 'Password',
          secureTextEntry: true,
          autoCapitalize: 'none',
          autoComplete: 'password',
        },
      ]}
      error={error}
      isSubmitting={isSubmitting}
      cta="Log in"
      onSubmit={handleSubmit}
      footerLabel="Need an account? Register"
      onFooterPress={() => router.push('/register')}
    />
  );
}
