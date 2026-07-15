import { TouchableOpacity, ActivityIndicator, TouchableOpacityProps, View } from 'react-native';
import { Typography } from './Typography';
import { cn } from '../utils/cn';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  label?: string;
  icon?: React.ReactNode;
}

export function Button({
  variant = 'default',
  size = 'md',
  loading = false,
  label,
  icon,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'flex-row items-center justify-center rounded-lg active:opacity-80';
  
  const variants = {
    default: 'bg-indigo-600 dark:bg-indigo-500',
    outline: 'border border-slate-300 dark:border-slate-700 bg-transparent',
    ghost: 'bg-transparent',
    destructive: 'bg-red-600 dark:bg-red-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5',
    md: 'px-4 py-2.5',
    lg: 'px-6 py-3.5',
    icon: 'p-2',
  };

  const textColors = {
    default: 'white',
    outline: 'primary',
    ghost: 'primary',
    destructive: 'white',
  } as const;

  return (
    <TouchableOpacity
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        disabled && 'opacity-50',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? '#6366f1' : '#ffffff'} />
      ) : (
        <View className="flex-row items-center space-x-2 gap-2">
          {icon}
          {label && (
            <Typography
              variant={size === 'sm' ? 'caption' : 'body'}
              weight="semibold"
              color={textColors[variant]}
            >
              {label}
            </Typography>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
