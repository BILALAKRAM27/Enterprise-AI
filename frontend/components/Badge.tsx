import { View, ViewProps } from 'react-native';
import { Typography } from './Typography';
import { cn } from '../utils/cn';

interface BadgeProps extends ViewProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export function Badge({ label, variant = 'default', className, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-slate-100 dark:bg-slate-800',
    success: 'bg-emerald-100 dark:bg-emerald-900/30',
    warning: 'bg-amber-100 dark:bg-amber-900/30',
    error: 'bg-red-100 dark:bg-red-900/30',
  };

  const textColors = {
    default: 'text-slate-700 dark:text-slate-300',
    success: 'text-emerald-700 dark:text-emerald-400',
    warning: 'text-amber-700 dark:text-amber-400',
    error: 'text-red-700 dark:text-red-400',
  };

  return (
    <View
      className={cn('self-start rounded-full px-2.5 py-0.5', variants[variant], className)}
      {...props}
    >
      <Typography variant="caption" className={textColors[variant]} style={{ fontSize: 10, fontWeight: '600' }}>
        {label}
      </Typography>
    </View>
  );
}
