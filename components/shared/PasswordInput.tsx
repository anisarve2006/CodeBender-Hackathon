'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface PasswordInputProps extends React.ComponentProps<typeof Input> {
  showStrength?: boolean;
}

export function PasswordInput({ showStrength = false, value, onChange, ...props }: PasswordInputProps) {
  const [show, setShow] = React.useState(false);
  const pwd = String(value || '');

  // Calculate password strength (0-100)
  const strength = React.useMemo(() => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 10) score += 30;
    if (pwd.length >= 14) score += 20;
    if (/[A-Z]/.test(pwd)) score += 15;
    if (/[0-9]/.test(pwd)) score += 15;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 20;
    return Math.min(score, 100);
  }, [pwd]);

  const strengthLabel = React.useMemo(() => {
    if (strength <= 30) return 'Weak';
    if (strength <= 70) return 'Medium';
    return 'Strong';
  }, [strength]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          className="pr-10"
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShow(!show)}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
        </Button>
      </div>

      {showStrength && pwd.length > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Strength: {strengthLabel}</span>
            <span>{strength}%</span>
          </div>
          <Progress value={strength} className="h-1.5" />
        </div>
      )}
    </div>
  );
}
