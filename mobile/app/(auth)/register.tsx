import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ApiError, GENERIC_ERROR_MESSAGE } from '@/src/api/client';
import { useAuth } from '@/src/features/auth/AuthContext';
import AuthForm from '@/src/features/auth/AuthForm';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await register(name, email, password);
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthForm
      title="Create account"
      fields={[
        {
          key: 'name',
          value: name,
          onChangeText: setName,
          placeholder: 'Name',
          autoCapitalize: 'words',
          autoComplete: 'name',
        },
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
          placeholder: 'Password (min 8 characters)',
          secureTextEntry: true,
          autoCapitalize: 'none',
          autoComplete: 'password-new',
        },
      ]}
      error={error}
      isSubmitting={isSubmitting}
      cta="Create account"
      onSubmit={handleSubmit}
      footerLabel="Already have an account? Log in"
      onFooterPress={() => router.push('/login')}
    />
  );
}
