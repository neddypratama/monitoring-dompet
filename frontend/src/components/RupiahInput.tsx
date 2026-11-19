import React, { useRef, useLayoutEffect } from 'react';
import { formatNumberDots } from '../utils/currency';

export interface RupiahInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size' | 'prefix'> {
  value: number | string;
  onChange: (numericValue: number, rawDigits: string) => void;
  prefix?: React.ReactNode | null;
  wrapperClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  allowEmpty?: boolean;
}

export const RupiahInput: React.FC<RupiahInputProps> = ({
  value,
  onChange,
  prefix = 'Rp',
  wrapperClassName = '',
  className = '',
  size = 'md',
  placeholder = '0',
  disabled = false,
  allowEmpty = false,
  onKeyDown,
  ...rest
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorPositionRef = useRef<number | null>(null);

  // Derive formatted display value
  const displayValue = React.useMemo(() => {
    if (value === '' || value === null || value === undefined) return '';
    if (allowEmpty && (value === 0 || value === '0')) return '';
    return formatNumberDots(value);
  }, [value, allowEmpty]);

  // Restore cursor position after DOM update
  useLayoutEffect(() => {
    if (cursorPositionRef.current !== null && inputRef.current) {
      const pos = Math.min(cursorPositionRef.current, inputRef.current.value.length);
      inputRef.current.setSelectionRange(pos, pos);
      cursorPositionRef.current = null;
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const rawValue = input.value;
    const cursor = input.selectionStart || 0;

    // Count how many numeric digits were before the cursor
    const digitsBeforeCursor = (rawValue.slice(0, cursor).match(/\d/g) || []).length;

    const digits = rawValue.replace(/\D/g, '');
    if (!digits) {
      cursorPositionRef.current = 0;
      onChange(0, '');
      return;
    }

    const num = parseInt(digits, 10);
    const formatted = formatNumberDots(num);

    // Calculate new cursor position in the formatted string
    let newCursor = 0;
    let countedDigits = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        countedDigits++;
      }
      if (countedDigits >= digitsBeforeCursor) {
        newCursor = i + 1;
        break;
      }
    }
    if (digitsBeforeCursor === 0) newCursor = 0;
    if (countedDigits < digitsBeforeCursor) newCursor = formatted.length;

    cursorPositionRef.current = newCursor;
    onChange(num, String(num));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const input = e.currentTarget;
      const { selectionStart, selectionEnd } = input;
      if (selectionStart !== null && selectionStart === selectionEnd && selectionStart > 0) {
        // If cursor is right after a dot (e.g. "17.|000"), delete the digit before the dot
        if (input.value[selectionStart - 1] === '.') {
          e.preventDefault();
          const rawDigits = input.value.replace(/\D/g, '');
          const digitsBefore = (input.value.slice(0, selectionStart - 1).match(/\d/g) || []).length;
          if (digitsBefore > 0) {
            const newDigits = rawDigits.slice(0, digitsBefore - 1) + rawDigits.slice(digitsBefore);
            if (!newDigits) {
              cursorPositionRef.current = 0;
              onChange(0, '');
              return;
            }
            const num = parseInt(newDigits, 10);
            const formatted = formatNumberDots(num);
            const targetDigits = digitsBefore - 1;
            let newCursor = 0;
            let count = 0;
            for (let i = 0; i < formatted.length; i++) {
              if (/\d/.test(formatted[i])) count++;
              if (count >= targetDigits) {
                newCursor = i + 1;
                break;
              }
            }
            if (targetDigits === 0) newCursor = 0;
            cursorPositionRef.current = newCursor;
            onChange(num, String(num));
            return;
          }
        }
      }
    } else if (e.key === 'Delete') {
      const input = e.currentTarget;
      const { selectionStart, selectionEnd } = input;
      if (selectionStart !== null && selectionStart === selectionEnd && selectionStart < input.value.length) {
        // If cursor is right before a dot (e.g. "17|.000"), delete the digit after the dot
        if (input.value[selectionStart] === '.') {
          e.preventDefault();
          const rawDigits = input.value.replace(/\D/g, '');
          const digitsBefore = (input.value.slice(0, selectionStart).match(/\d/g) || []).length;
          if (digitsBefore < rawDigits.length) {
            const newDigits = rawDigits.slice(0, digitsBefore) + rawDigits.slice(digitsBefore + 1);
            if (!newDigits) {
              cursorPositionRef.current = 0;
              onChange(0, '');
              return;
            }
            const num = parseInt(newDigits, 10);
            const formatted = formatNumberDots(num);
            let newCursor = 0;
            let count = 0;
            for (let i = 0; i < formatted.length; i++) {
              if (/\d/.test(formatted[i])) count++;
              if (count >= digitsBefore) {
                newCursor = i + 1;
                break;
              }
            }
            if (digitsBefore === 0) newCursor = 0;
            cursorPositionRef.current = newCursor;
            onChange(num, String(num));
            return;
          }
        }
      }
    }

    if (onKeyDown) onKeyDown(e);
  };

  // Styles based on size
  let sizeWrapperStyles = 'rounded-xl';
  let sizePrefixStyles = 'px-3.5 py-2.5 text-xs font-bold';
  let sizeInputStyles = 'px-3.5 py-2.5 text-sm font-bold';

  if (size === 'lg') {
    sizeWrapperStyles = 'rounded-2xl';
    sizePrefixStyles = 'px-4 py-3 text-sm font-black';
    sizeInputStyles = 'px-4 py-3 text-lg font-extrabold';
  } else if (size === 'sm') {
    sizeWrapperStyles = 'rounded-lg';
    sizePrefixStyles = 'px-2.5 py-1.5 text-[11px] font-bold';
    sizeInputStyles = 'px-2.5 py-1.5 text-xs font-semibold';
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={`relative flex items-center border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all bg-white overflow-hidden shadow-xs cursor-text ${
        disabled ? 'bg-slate-50 opacity-60 cursor-not-allowed' : ''
      } ${sizeWrapperStyles} ${wrapperClassName}`}
    >
      {prefix !== null && prefix !== false && (
        <span
          className={`bg-slate-50 text-slate-500 border-r border-slate-200 select-none flex items-center justify-center shrink-0 tracking-wide ${sizePrefixStyles}`}
        >
          {prefix}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full text-slate-900 bg-transparent outline-none placeholder:text-slate-300 font-bold ${sizeInputStyles} ${className}`}
        {...rest}
      />
    </div>
  );
};
