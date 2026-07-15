import { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity } from 'react-native';
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
import { Feather } from '@expo/vector-icons';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
    mode: 'onTouched', // Validates as soon as the user touches and leaves a field
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
      className="flex-1 bg-[#FAFAFA] dark:bg-[#0B0D12]"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mx-auto w-full max-w-[440px] bg-white border border-[#E4E4E7] p-8 dark:bg-[#1C1E23] dark:border-[#3F3F46] rounded-2xl shadow-sm">
          <View className="mb-8">
            <Typography variant="h1" weight="bold" className="text-[#3652E3] dark:text-[#6E85FF] tracking-tight">
              Create Account
            </Typography>
            <Typography variant="body" color="muted" className="mt-2 text-sm leading-relaxed">
              Join to build your enterprise knowledge base.
            </Typography>
          </View>

          <View className="gap-y-4">
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
                  className="bg-[#FAFAFA] dark:bg-[#0B0D12] h-12 px-4 rounded-xl text-base text-[#18181B] dark:text-[#FAFAFA]"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View className="relative w-full">
                  <Input
                    label="Password"
                    placeholder="••••••••"
                    secureTextEntry={!showPassword}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={errors.password?.message}
                    className="bg-[#FAFAFA] dark:bg-[#0B0D12] h-12 pl-4 pr-12 rounded-xl text-base text-[#18181B] dark:text-[#FAFAFA]"
                  />
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 4, top: errors.password?.message ? 24 : 32 }}
                    className="w-11 h-11 items-center justify-center rounded-full"
                  >
                    <Feather
                      name={showPassword ? "eye-off" : "eye"}
                      size={18}
                      color="#71717A"
                    />
                  </TouchableOpacity>
                </View>
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View className="relative w-full">
                  <Input
                    label="Confirm Password"
                    placeholder="••••••••"
                    secureTextEntry={!showConfirmPassword}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={errors.confirmPassword?.message}
                    onSubmitEditing={handleSubmit(onSubmit)}
                    className="bg-[#FAFAFA] dark:bg-[#0B0D12] h-12 pl-4 pr-12 rounded-xl text-base text-[#18181B] dark:text-[#FAFAFA]"
                  />
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ position: 'absolute', right: 4, top: errors.confirmPassword?.message ? 24 : 32 }}
                    className="w-11 h-11 items-center justify-center rounded-full"
                  >
                    <Feather
                      name={showConfirmPassword ? "eye-off" : "eye"}
                      size={18}
                      color="#71717A"
                    />
                  </TouchableOpacity>
                </View>
              )}
            />

            <Button
              label="Sign Up"
              size="lg"
              className="mt-4 bg-[#3652E3] active:bg-[#2A3FB8] h-12 rounded-xl"
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              disabled={loading}
            />

            <Button
              label="Already have an account? Sign in"
              variant="ghost"
              className="mt-1 h-12 rounded-xl"
              onPress={() => router.back()}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}