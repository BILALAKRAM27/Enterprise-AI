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

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      await authService.register(data.email, data.password);
      const { access_token } = await authService.login(data.email, data.password);
      await storage.setItemAsync('access_token', access_token);
      const user = await authService.getCurrentUser();
      dispatch(setCredentials({ user, token: access_token }));
    } catch (error: any) {
      const message =
        error.response?.data?.detail ||
        error.message ||
        'Registration failed. Please try again.';
      Alert.alert('Registration Failed', message);
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
            Create Account
          </Typography>
          <Typography variant="body" color="muted">
            Join to build your enterprise knowledge base.
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

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Confirm Password"
                placeholder="••••••••"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.confirmPassword?.message}
              />
            )}
          />

          <Button 
            label="Sign Up" 
            size="lg" 
            className="mt-6" 
            onPress={handleSubmit(onSubmit)} 
            loading={loading} 
          />

          <Button 
            label="Already have an account? Sign in" 
            variant="ghost" 
            className="mt-2" 
            onPress={() => router.back()} 
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
