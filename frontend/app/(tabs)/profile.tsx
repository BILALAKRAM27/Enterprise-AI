import { View, Alert } from 'react-native';
import { storage } from '../../utils/storage';
import { useQueryClient } from '@tanstack/react-query';
import { useAppSelector, useAppDispatch } from '../../hooks/store';
import { logout } from '../../store/slices/authSlice';
import { Typography } from '../../components/Typography';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Feather } from '@expo/vector-icons';

export default function ProfileScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Sign Out', 
        style: 'destructive',
        onPress: async () => {
          await storage.deleteItemAsync('access_token');
          queryClient.clear();
          dispatch(logout()); // AuthGuard watches isAuthenticated and redirects to /(auth)/login
        }
      }
    ]);
  };

  return (
    <View className="flex-1 bg-slate-50 p-4 pt-12 dark:bg-slate-900">
      <Typography variant="h1" weight="bold" className="mb-6">Profile</Typography>

      <Card className="mb-6 items-center py-8">
        <View className="mb-4 rounded-full bg-indigo-100 p-4 dark:bg-indigo-900/50">
          <Feather name="user" size={48} color="#6366f1" />
        </View>
        <Typography variant="h3" weight="semibold" className="mb-1">{user?.email}</Typography>
        <Typography variant="body" color="muted">ID: {user?.id} • {user?.is_superuser ? 'Admin' : 'Member'}</Typography>
      </Card>

      <View className="space-y-3 gap-3">
        <Card className="flex-row items-center justify-between p-4">
          <View className="flex-row items-center gap-3">
            <Feather name="settings" size={20} color="#64748b" />
            <Typography variant="body" weight="medium">App Settings</Typography>
          </View>
        </Card>

        <Card className="flex-row items-center justify-between p-4">
          <View className="flex-row items-center gap-3">
            <Feather name="shield" size={20} color="#64748b" />
            <Typography variant="body" weight="medium">Privacy & Security</Typography>
          </View>
        </Card>

        <Button 
          variant="destructive" 
          label="Sign Out" 
          icon={<Feather name="log-out" size={20} color="#fff" />} 
          onPress={handleLogout}
          className="mt-4"
        />
      </View>
    </View>
  );
}
