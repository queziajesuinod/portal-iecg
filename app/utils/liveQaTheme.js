// Tema padrão da tela ao vivo de Perguntas ao Vivo
export const DEFAULT_LIVE_THEME = {
  bgColor: '#0d133d',
  bgColor2: '#311b92',
  useGradient: true,
  bgImageUrl: '',
  bgFit: 'cover', // cover | contain | repeat
  overlayOpacity: 0.45, // escurecimento sobre a imagem (0 a 0.8)
  textColor: '#ffffff',
  accentColor: '#f50057',
  logoUrl: '',
  logoPosition: 'top-right', // top-right | top-left | bottom-right | bottom-left
};

// Presets prontos para escolha rápida no admin
export const LIVE_THEME_PRESETS = [
  {
    name: 'Roxo (padrão)',
    theme: {
      bgColor: '#0d133d', bgColor2: '#311b92', useGradient: true, bgImageUrl: '', textColor: '#ffffff', accentColor: '#f50057',
    },
  },
  {
    name: 'Escuro',
    theme: {
      bgColor: '#000000', bgColor2: '#1a1a1a', useGradient: true, bgImageUrl: '', textColor: '#ffffff', accentColor: '#00e5ff',
    },
  },
  {
    name: 'Claro',
    theme: {
      bgColor: '#f4f5fa', bgColor2: '#e0e0e0', useGradient: true, bgImageUrl: '', textColor: '#1a237e', accentColor: '#311b92',
    },
  },
  {
    name: 'Azul IECG',
    theme: {
      bgColor: '#0d47a1', bgColor2: '#1565c0', useGradient: true, bgImageUrl: '', textColor: '#ffffff', accentColor: '#ffd600',
    },
  },
];

// Normaliza um tema parcial juntando com os valores padrão
export const resolveLiveTheme = (theme) => ({ ...DEFAULT_LIVE_THEME, ...(theme || {}) });

// Constrói as propriedades CSS de fundo a partir do tema
export const buildLiveBackground = (theme) => {
  const t = resolveLiveTheme(theme);
  if (t.bgImageUrl) {
    const op = Math.min(Math.max(Number(t.overlayOpacity) || 0, 0), 0.85);
    const overlay = `linear-gradient(rgba(0,0,0,${op}), rgba(0,0,0,${op}))`;
    const repeat = t.bgFit === 'repeat';
    return {
      backgroundImage: `${overlay}, url(${t.bgImageUrl})`,
      backgroundSize: repeat ? 'auto' : t.bgFit, // cover | contain | auto
      backgroundRepeat: repeat ? 'repeat' : 'no-repeat',
      backgroundPosition: 'center',
      backgroundColor: t.bgColor,
    };
  }
  if (t.useGradient) {
    return { background: `linear-gradient(160deg, ${t.bgColor} 0%, ${t.bgColor2} 100%)` };
  }
  return { background: t.bgColor };
};

// Posição absoluta CSS para o logo no canto
export const logoCornerStyle = (position, pad = 28) => {
  switch (position) {
    case 'top-left': return { top: pad, left: pad };
    case 'bottom-right': return { bottom: pad, right: pad };
    case 'bottom-left': return { bottom: pad, left: pad };
    case 'top-right':
    default: return { top: pad, right: pad };
  }
};
