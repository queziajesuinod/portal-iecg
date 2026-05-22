import { useEffect, useState } from 'react';

/**
 * Retorna o valor com atraso. Util para inputs de busca:
 * a query so dispara depois que o usuario para de digitar.
 *
 * @example
 *   const [search, setSearch] = useState('');
 *   const debouncedSearch = useDebouncedValue(search, 300);
 *   useQuery({ queryKey: ['x', debouncedSearch], ... });
 */
export default function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
