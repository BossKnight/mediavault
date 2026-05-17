// A simple star rating display / interactive component.

interface Props {
  value: number | null;
  onChange?: (newRating: number | null) => void;
  size?: number;
}

export default function StarRating({ value, onChange, size = 16 }: Props) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          onClick={() => onChange?.(value === n ? null : n)}
          style={{
            fontSize: size,
            color: value && n <= value ? '#f5a623' : '#444',
            cursor: onChange ? 'pointer' : 'default',
            userSelect: 'none',
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}
