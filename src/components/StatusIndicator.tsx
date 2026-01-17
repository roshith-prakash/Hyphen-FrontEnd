interface StatusIndicatorProps {
  status: 'safe' | 'at-risk' | 'shortage';
  size?: 'sm' | 'md' | 'lg';
}

export default function StatusIndicator({ status, size = 'md' }: StatusIndicatorProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  const statusConfig = {
    safe: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      icon: '✓',
      label: 'Safe',
    },
    'at-risk': {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-300',
      icon: '⚠',
      label: 'At Risk',
    },
    shortage: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      icon: '✗',
      label: 'Shortage',
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`${config.bg} ${config.text} ${sizeClasses[size]} rounded-full font-semibold inline-flex items-center gap-1`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
