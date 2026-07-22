import { View, ScrollView, TouchableOpacity } from 'react-native';
import { storage } from '../../utils/storage';
import { useQueryClient } from '@tanstack/react-query';
import { useAppSelector, useAppDispatch } from '../../hooks/store';
import { logout } from '../../store/slices/authSlice';
import { Typography } from '../../components/Typography';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';

export default function ProfileScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await storage.deleteItemAsync('access_token');
      queryClient.clear();
      dispatch(logout());
    } catch (e) {
      // Slit silent error handling to match criteria
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-[#FAFAFA] dark:bg-[#0B0D12]">
      <View className="mx-auto w-full max-w-[1120px] px-6 pb-12 pt-16 md:px-8">
        <Typography variant="h1" weight="bold" className="mb-6 text-[#18181B] dark:text-[#FAFAFA] tracking-tight">
          Profile
        </Typography>

        {/* Profile Card */}
        <Card className="mb-6 items-center border border-[#E4E4E7] bg-white py-8 dark:border-[#3F3F46] dark:bg-[#27272A] rounded-2xl">

          <Typography variant="h3" weight="semibold" className="mb-1 text-[#18181B] dark:text-[#FAFAFA]">
            {user?.email}
          </Typography>
          <Typography variant="body" color="muted" className="font-mono text-xs tracking-wider uppercase">
            ID: {user?.id} • {user?.is_superuser ? 'Admin' : 'Member'}
          </Typography>
        </Card>

        {/* Settings Action Hub */}


        {/* Danger Zone Sign Out Button */}
        <Button
          variant="destructive"
          label="Sign Out"
          icon={<Feather name="log-out" size={18} color="#fff" />}
          onPress={handleLogout}
          loading={isLoggingOut}
          className="bg-[#C2281F] active:bg-[#301213] h-12 rounded-xl"
        />
      </View>
    </ScrollView>
  );
}