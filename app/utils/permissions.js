export const getStoredPermissions = () => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('permissions');
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error('Erro ao ler permissoes do localStorage', err);
    return [];
  }
};

export const filterMenuByPermissions = (menu = [], permissions = []) => {
  if (!Array.isArray(menu)) return [];
  const allowed = new Set(permissions || []);
  // Sem permissões ou acesso total: não filtra o menu
  if (!allowed.size) {
    return menu;
  }
  if (allowed.has('ADMIN_FULL_ACCESS')) {
    return menu;
  }

  const filterItems = (items) => items.reduce((acc, item) => {
    const children = item.child ? filterItems(item.child) : undefined;
    const requiresPermission = Boolean(item.permission);
    const isAllowed = !requiresPermission || allowed.has(item.permission);

    if (!isAllowed) return acc;

    const nextItem = { ...item };
    if (children) {
      nextItem.child = children;
      if (children.length === 0 && !item.link) {
        return acc;
      }
    }
    acc.push(nextItem);
    return acc;
  }, []);

  return filterItems(menu);
};
