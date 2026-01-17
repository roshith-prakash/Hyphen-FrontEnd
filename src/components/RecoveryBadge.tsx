interface RecoveryBadgeProps {
  count: number;
  variant?: 'info' | 'warning' | 'success';
}

export default function RecoveryBadge({ count, variant = 'info' }: RecoveryBadgeProps) {
  const variantStyles = {
    info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    warning: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    success: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${variantStyles[variant]} text-xs font-semibold`}>
      <span className="text-lg">🎯</span>
      <span>
        {count === 1 ? '1 class needed' : `${count} classes needed`}
      </span>
    </div>
  );
}
