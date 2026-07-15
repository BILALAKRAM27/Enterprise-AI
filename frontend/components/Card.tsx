import { View, ViewProps } from 'react-native';
import { cn } from '../utils/cn';

interface CardProps extends ViewProps {}

export function Card({ className, ...props }: CardProps) {
  return (
    <View
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: CardProps) {
  return <View className={cn('mb-4 flex-row items-center justify-between', className)} {...props} />;
}

export function CardFooter({ className, ...props }: CardProps) {
  return <View className={cn('mt-4 flex-row items-center pt-4 border-t border-slate-100 dark:border-slate-800', className)} {...props} />;
}
