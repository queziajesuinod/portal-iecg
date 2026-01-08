import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  Alert,
  Box,
  Button,
  Link,
  Typography
} from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import LaunchIcon from '@mui/icons-material/Launch';

const CHATWOOT_SCRIPT_ID = 'chatwoot-sdk-js';

const ChatwootPage = () => {
  const [notification, setNotification] = useState('');
  const [widgetReady, setWidgetReady] = useState(false);
  const baseUrl = (process.env.REACT_APP_CHATWOOT_BASE_URL || 'https://chat.chatwoot.com').replace(/\/$/, '');
  const websiteToken = process.env.REACT_APP_CHATWOOT_WEBSITE_TOKEN || '';
  const locale = process.env.REACT_APP_CHATWOOT_LOCALE || 'pt-BR';
  const whatsappNumber = process.env.REACT_APP_CHATWOOT_WHATSAPP_NUMBER || '';
  const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}` : '';
  const guideLink = 'https://www.chatwoot.com/hc/user-guide/articles/1677672686-how-to-install-live_chat-on-a-react-native-app#step-3-use-it-like-this';

  useEffect(() => {
    if (!websiteToken) {
      setWidgetReady(false);
      setNotification('Defina REACT_APP_CHATWOOT_WEBSITE_TOKEN para carregar o chat.');
      return;
    }
    setNotification('');
    const normalizedBaseUrl = baseUrl;

    if (typeof window === 'undefined') {
      return undefined;
    }

    window.chatwootSettings = {
      locale,
      position: 'right',
      hideMessageBubble: true,
      launcherTitle: 'Chat Start',
      useBrowserLanguage: false
    };

    const ensureWidget = () => {
      if (window.$chatwoot) {
        setWidgetReady(true);
        return;
      }
      if (!window.chatwootSDK) return;
      window.chatwootSDK.run({ baseUrl: normalizedBaseUrl, websiteToken });
      if (window.$chatwoot) {
        setWidgetReady(true);
      }
    };

    if (window.$chatwoot) {
      setWidgetReady(true);
      return () => {
        delete window.chatwootSettings;
      };
    }

    let script = document.getElementById(CHATWOOT_SCRIPT_ID);
    if (script && window.chatwootSDK) {
      ensureWidget();
      return () => {
        delete window.chatwootSettings;
      };
    }

    if (!script) {
      script = document.createElement('script');
      script.id = CHATWOOT_SCRIPT_ID;
      script.async = true;
      script.src = `${normalizedBaseUrl}/packs/js/sdk.js`;
      script.onload = ensureWidget;
      script.onerror = () => {
        setNotification('Não foi possível carregar o Chatwoot. Verifique a URL base.');
      };
      document.body.appendChild(script);
    } else {
      script.addEventListener('load', ensureWidget);
    }

    return () => {
      delete window.chatwootSettings;
    };
  }, [baseUrl, locale, websiteToken]);

  const openWidget = () => {
    if (window.$chatwoot?.toggle) {
      window.$chatwoot.toggle('open');
      return;
    }
    setNotification('Aguarde até o Chatwoot carregar para abrir o chat.');
  };

  return (
    <div>
      <Helmet>
        <title>Chatwoot</title>
        <meta name="description" content="Área de chat via Chatwoot com ligação direta para o WhatsApp" />
      </Helmet>
      <PapperBlock
        title="Chatwoot + WhatsApp"
        desc="Converse com o suporte Start pelo Chatwoot configurado para o canal do WhatsApp."
      >
        <Box display="flex" flexDirection="column" gap={2}>
          <Typography>
            O Chatwoot é carregado por esta página e abre o módulo configurado na sua instância (baseUrl +
            websiteToken). A comunicação com o WhatsApp acontece nos bastidores do Chatwoot, por isso basta apontar
            a procuração para o número definido em <strong>REACT_APP_CHATWOOT_WHATSAPP_NUMBER</strong>.
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Para guiar a implementação siga o passo 3 do guia oficial:{' '}
            <Link href={guideLink} target="_blank" rel="noopener noreferrer">
              How to install live-chat on a React Native app?
            </Link>
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={2}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<ChatBubbleOutlineIcon />}
              onClick={openWidget}
              disabled={!widgetReady}
            >
              Abrir chat Chatwoot
            </Button>
            {whatsappLink && (
              <Button
                variant="outlined"
                color="primary"
                startIcon={<LaunchIcon />}
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir WhatsApp ({whatsappNumber})
              </Button>
            )}
          </Box>
          <Box display="flex" flexWrap="wrap" gap={1}>
            <Typography variant="body2">
              Base URL: <strong>{baseUrl}</strong>
            </Typography>
            <Typography variant="body2">
              Token do website: <strong>{websiteToken ? 'Definido' : 'Faltando'}</strong>
            </Typography>
            <Typography variant="body2">
              WhatsApp: <strong>{whatsappNumber || 'Não configurado'}</strong>
            </Typography>
          </Box>
          {!websiteToken && (
            <Alert severity="warning">
              Configurações ausentes: defina <code>REACT_APP_CHATWOOT_WEBSITE_TOKEN</code> antes de usar o chat.
            </Alert>
          )}
          {!whatsappNumber && (
            <Alert severity="info">
              Se quiser abrir o link direto para o WhatsApp, configure <code>REACT_APP_CHATWOOT_WHATSAPP_NUMBER</code>.
            </Alert>
          )}
        </Box>
      </PapperBlock>
      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
};

export default ChatwootPage;
