import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { buttonClass, type ButtonTone } from './button';
import { Icon, type IconData } from './icon';

type IconButtonProps = {
  icon: IconData;
  /** Required: an icon-only button needs an accessible name. */
  label: string;
  tone?: ButtonTone;
  size?: 'md' | 'lg';
} & Omit<ComponentProps<'button'>, 'aria-label' | 'children'>;

/** Square icon button, 48px (md) or 56px (lg): never below the 48×48 touch target. */
export function IconButton({
  icon,
  label,
  tone = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={buttonClass({
        tone,
        size: 'none',
        className: cn(size === 'lg' ? 'size-14' : 'size-12', 'shrink-0', className),
      })}
      {...props}
    >
      <Icon icon={icon} size={size === 'lg' ? 28 : 24} />
    </button>
  );
}
