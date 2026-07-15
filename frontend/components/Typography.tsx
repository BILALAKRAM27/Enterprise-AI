import { Text, TextProps } from 'react-native';
import { cn } from '../utils/cn';

interface TypographyProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: 'primary' | 'secondary' | 'muted' | 'destructive' | 'white' | 'success' | 'warning';
}

export function Typography({
  variant = 'body',
  weight = 'normal',
  color = 'primary',
  className,
  ...props
}: TypographyProps) {
  const baseStyles = 'font-SpaceMono';
  
  const variants = {
    h1: 'text-3xl',
    h2: 'text-2xl',
    h3: 'text-xl',
    body: 'text-base',
    caption: 'text-sm',
    label: 'text-xs uppercase tracking-wider',
  };

  const weights = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  const colors = {
    primary: 'text-slate-900 dark:text-slate-100',
    secondary: 'text-slate-700 dark:text-slate-300',
    muted: 'text-slate-500 dark:text-slate-400',
    destructive: 'text-red-500 dark:text-red-400',
    white: 'text-white',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
  };

  return (
    <Text
      className={cn(
        baseStyles,
        variants[variant],
        weights[weight],
        colors[color],
        className
      )}
      {...props}
    />
  );
}
