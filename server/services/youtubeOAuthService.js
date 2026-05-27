const crypto = require('crypto');
const { google } = require('googleapis');

const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
];

function getEnvOrThrow(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} não definida no .env`);
  return value;
}

function createOAuth2Client() {
  return new google.auth.OAuth2(
    getEnvOrThrow('GOOGLE_CLIENT_ID'),
    getEnvOrThrow('GOOGLE_CLIENT_SECRET'),
    getEnvOrThrow('GOOGLE_OAUTH_REDIRECT_URI')
  );
}

function buildAuthUrl({ ownerName, adminUserId }) {
  const oauth2Client = createOAuth2Client();
  const state = signState({ ownerName, adminUserId, nonce: crypto.randomBytes(8).toString('hex') });

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: REQUIRED_SCOPES,
    state,
  });

  return { url, state };
}

function signState(payload) {
  const secret = getEnvOrThrow('JWT_SECRET');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyState(state) {
  if (!state || !state.includes('.')) throw new Error('State inválido');
  const [body, sig] = state.split('.');
  const secret = getEnvOrThrow('JWT_SECRET');
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if (sig !== expected) throw new Error('Assinatura do state não confere');
  return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
}

async function exchangeCodeForTokens(code) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      'Google não retornou refresh_token. Revogue o acesso anterior em myaccount.google.com/permissions e refaça a autorização.'
    );
  }
  return tokens;
}

async function fetchOwnedChannel(tokens) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  const { data } = await youtube.channels.list({
    part: ['snippet', 'contentDetails'],
    mine: true,
  });

  if (!data.items || data.items.length === 0) {
    throw new Error('Esta conta Google não tem canal do YouTube associado');
  }

  const channel = data.items[0];
  return {
    channelId: channel.id,
    channelName: channel.snippet.title,
    channelThumbnailUrl: channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.default?.url || null,
    uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads || null,
  };
}

function getAuthorizedClient(channel) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: channel.getRefreshToken(),
    access_token: channel.getAccessToken(),
    expiry_date: channel.oauthExpiresAt ? new Date(channel.oauthExpiresAt).getTime() : undefined,
  });
  return oauth2Client;
}

module.exports = {
  REQUIRED_SCOPES,
  buildAuthUrl,
  verifyState,
  exchangeCodeForTokens,
  fetchOwnedChannel,
  getAuthorizedClient,
  createOAuth2Client,
};
