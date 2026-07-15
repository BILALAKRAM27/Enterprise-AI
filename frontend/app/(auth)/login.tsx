import { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { storage } from '../../utils/storage';

import { useAppDispatch } from '../../hooks/store';
import { setCredentials } from '../../store/slices/authSlice';
import { authService } from '../../services/auth';
import { Typography } from '../../components/Typography';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const { access_token } = await authService.login(data.email, data.password);
      await storage.setItemAsync('access_token', access_token);
      const user = await authService.getCurrentUser();
      dispatch(setCredentials({ user, token: access_token }));
    } catch (error: any) {
      const message =
        error.response?.data?.detail ||
        error.message ||
        'An unexpected error occurred. Please try again.';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      className="flex-1 bg-slate-50 dark:bg-slate-900"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View className="mb-8">
          <Typography variant="h1" weight="bold" className="mb-2 text-indigo-600 dark:text-indigo-400">
            Enterprise AI
          </Typography>
          <Typography variant="body" color="muted">
            Sign in to access your knowledge base and intelligent chat.
          </Typography>
        </View>

        <View className="space-y-4">
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email Address"
                placeholder="you@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="••••••••"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
              />
            )}
          />

          <Button 
            label="Sign In" 
            size="lg" 
            className="mt-6" 
            onPress={handleSubmit(onSubmit)} 
            loading={loading} 
          />

          <Button 
            label="Create an account" 
            variant="ghost" 
            className="mt-2" 
            onPress={() => router.push('/(auth)/register')} 
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
