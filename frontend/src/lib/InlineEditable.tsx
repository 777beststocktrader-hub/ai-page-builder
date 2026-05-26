import React, { useRef, useLayoutEffect } from 'react';

interface Props {
  value: string;
  fieldKey: string;
  onUpdate?: (key: string, val: string) => void;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

export default function IE({ value, fieldKey, onUpdate, as: Tag = 'span', className, style, ...rest }: Props) {
  const ref = useRef<HTMLElement>(null);
  const isEditing = useRef(false);

  // Sync store value → DOM. Re-runs when onUpdate changes (block selected/deselected)
  // so the textContent is restored after React strips children on contentEditable mount.
  useLayoutEffect(() => {
    if (ref.current && !isEditing.current && ref.current.textContent !== (value || '')) {
      ref.current.textContent = value || '';
    }
  }, [value, onUpdate]);

  const C = Tag as any;

  if (!onUpdate) {
    return <C className={className} style={style} {...rest}>{value}</C>;
  }

  return (
    <C
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={className}
      style={{
        background: 'transparent',
        ...style,
        outline: 'none',
        cursor: 'text',
        borderBottom: '1.5px dashed rgba(99,102,241,0.45)',
        borderRadius: '2px',
        minWidth: '2ch',
        display: style?.display ?? (Tag === 'span' ? 'inline' : undefined),
      }}
      onFocus={() => { isEditing.current = true; }}
      onBlur={(e: any) => {
        isEditing.current = false;
        onUpdate(fieldKey, e.currentTarget.textContent || '');
      }}
      onKeyDown={(e: any) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
        // Prevent delete/escape from bubbling to canvas shortcuts
        if (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'Escape') {
          e.stopPropagation();
        }
      }}
      {...rest}
    />
  );
}
