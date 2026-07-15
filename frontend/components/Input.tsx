import { TextInput, TextInputProps, View, Text } from 'react-native';
import { cn } from '../utils/cn';
import { Typography } from './Typography';
import { forwardRef } from 'react';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <View className="mb-4">
        {label && (
          <Typography variant="label" weight="medium" color="secondary" className="mb-1.5">
            {label}
          </Typography>
        )}
        <TextInput
          ref={ref}
          className={cn(
            'flex h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900',
            'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
            'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          placeholderTextColor="#94a3b8"
          {...props}
        />
        {error && (
          <Typography variant="caption" color="destructive" className="mt-1.5">
            {error}
          </Typography>
        )}
      </View>
    );
  }
);
Input.displayName = 'Input';
