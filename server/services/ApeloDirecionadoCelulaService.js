// Service: services/ApeloDirecionadoCelulaService.js
const axios = require('axios');
const { ApeloDirecionadoCelula, ApeloDirecionadoHistorico, Celula, Sequelize } = require('../models');
const { Op } = require('sequelize');

const GOOGLE_GEOCODE_KEY = process.env.GOOGLE_GEOCODE_KEY;
const GEO_TIMEOUT_MS = 5000;
const geocodeCache = new Map();

function normalizeCep(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 8) return null;
  return digits;
}

function getComponentValue(components, requiredTypes) {
  const component = (components || []).find((item) => requiredTypes.every((type) => item.types?.includes(type)));
  return component?.long_name || '';
}

function getComponentShortValue(components, requiredTypes) {
  const component = (components || []).find((item) => requiredTypes.every((type) => item.types?.includes(type)));
  return component?.short_name || '';
}

async function geocodeAddress(query) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery || !GOOGLE_GEOCODE_KEY) {
    return null;
  }

  if (geocodeCache.has(normalizedQuery)) {
    return geocodeCache.get(normalizedQuery);
  }

  try {
    const params = new URLSearchParams({
      address: query,
      key: GOOGLE_GEOCODE_KEY,
      region: 'br',
      language: 'pt-BR'
    });

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
      {
        timeout: GEO_TIMEOUT_MS,
        headers: { 'User-Agent': 'portal-iecg/1.0' }
      }
    );

    const data = response.data;
    if (!data || data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
      geocodeCache.set(normalizedQuery, null);
      return null;
    }

    const result = data.results[0];
    const location = result.geometry?.location;
    if (!location || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) {
      geocodeCache.set(normalizedQuery, null);
      return null;
    }

    const components = result.address_components || [];
    const bairro = getComponentValue(components, ['sublocality', 'political'])
      || getComponentValue(components, ['neighborhood', 'political'])
      || '';
    const cidade = getComponentValue(components, ['locality'])
      || getComponentValue(components, ['administrative_area_level_2'])
      || '';
    const estado = getComponentValue(components, ['administrative_area_level_1']) || '';
    const uf = getComponentShortValue(components, ['administrative_area_level_1']) || '';
    const cepEncontrado = normalizeCep(getComponentValue(components, ['postal_code']) || '');

    const parsed = {
      lat: Number(location.lat),
      lon: Number(location.lng),
      bairro: bairro || null,
      cidade: cidade || null,
      estado: estado || null,
      uf: uf || null,
      cepEncontrado: cepEncontrado || null
    };

    geocodeCache.set(normalizedQuery, parsed);
    return parsed;
  } catch (error) {
    console.error('Erro ao consultar geocoding do apelo:', error.message);
    geocodeCache.set(normalizedQuery, null);
    return null;
  }
}

class ApeloDirecionadoCelulaService {
  _extrairPayloadEntrada(dados = {}) {
    if (typeof dados === 'string') {
      try {
        return this._extrairPayloadEntrada(JSON.parse(dados));
      } catch (error) {
        return {};
      }
    }

    if (!dados || typeof dados !== 'object') {
      return {};
    }

    if (!Array.isArray(dados) && dados.json && typeof dados.json === 'object') {
      return dados.json;
    }

    if (!Array.isArray(dados) && dados.payload && typeof dados.payload === 'object') {
      return dados.payload;
    }

    if (!Array.isArray(dados) && dados.data && typeof dados.data === 'object') {
      return dados.data;
    }

    if (!Array.isArray(dados) && dados.body && typeof dados.body === 'object') {
      return dados.body;
    }

    if (!Array.isArray(dados) && dados['0'] && typeof dados['0'] === 'object') {
      if (dados['0'].json && typeof dados['0'].json === 'object') {
        return dados['0'].json;
      }

      return dados['0'];
    }

    if (Array.isArray(dados) && dados.length > 0) {
      const primeiro = dados[0];
      if (primeiro && typeof primeiro === 'object') {
        if (primeiro.json && typeof primeiro.json === 'object') {
          return primeiro.json;
        }

        return primeiro;
      }
    }

    return dados;
  }

  _normalizarTextoComparacao(value = '') {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  _normalizarWhatsapp(value = '') {
    return String(value || '').replace(/\D/g, '');
  }

  _normalizarWhatsappComparacao(value = '') {
    const digits = this._normalizarWhatsapp(value);
    if (!digits) return '';
    if (digits.length > 11) return digits.slice(-11);
    return digits;
  }

  _whatsappIgual(valueA = '', valueB = '') {
    const a = this._normalizarWhatsappComparacao(valueA);
    const b = this._normalizarWhatsappComparacao(valueB);

    if (!a || !b) return false;
    if (a === b) return true;

    const a10 = a.length === 11 ? a.slice(1) : a;
    const b10 = b.length === 11 ? b.slice(1) : b;
    return a10 === b10;
  }

  _redeIgual(valueA = '', valueB = '') {
    const a = this._normalizarTextoComparacao(valueA);
    const b = this._normalizarTextoComparacao(valueB);
    if (!a || !b) return false;
    return a === b;
  }

  _sufixosWhatsapp(value = '') {
    const digits = this._normalizarWhatsappComparacao(value);
    if (!digits) return [];

    const values = new Set([digits]);
    if (digits.length >= 11) values.add(digits.slice(-11));
    if (digits.length >= 10) values.add(digits.slice(-10));
    if (digits.length >= 9) values.add(digits.slice(-9));

    return Array.from(values).filter((item) => item.length >= 8);
  }

  _normalizarTextoExato(value = '') {
    return String(value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  _nomeParecido(nomeA, nomeB) {
    const a = this._normalizarTextoComparacao(nomeA);
    const b = this._normalizarTextoComparacao(nomeB);

    if (!a || !b) return false;
    if (a === b) return true;
    if (a.includes(b) || b.includes(a)) return true;

    const tokensA = a.split(' ').filter((token) => token.length >= 2);
    const tokensB = b.split(' ').filter((token) => token.length >= 2);

    if (!tokensA.length || !tokensB.length) return false;

    const setB = new Set(tokensB);
    const intersecao = tokensA.filter((token) => setB.has(token));
    const ratioA = intersecao.length / tokensA.length;
    const ratioB = intersecao.length / tokensB.length;

    if (ratioA >= 0.6 && ratioB >= 0.6) return true;

    if (intersecao.length >= 2 && (ratioA >= 0.45 || ratioB >= 0.45)) {
      return true;
    }

    const primeiroA = tokensA[0];
    const primeiroB = tokensB[0];
    if (primeiroA && primeiroA === primeiroB && (ratioA >= 0.35 || ratioB >= 0.35)) {
      return true;
    }

    return false;
  }

  async _buscarRegistroExistenteParaRecadastro(dadosNormalizados, transaction) {
    const whatsappNormalizado = this._normalizarWhatsappComparacao(dadosNormalizados.whatsapp);
    const redeNormalizada = this._normalizarTextoComparacao(dadosNormalizados.rede);
    const nomeNormalizado = this._normalizarTextoComparacao(dadosNormalizados.nome);

    if (!whatsappNormalizado || !redeNormalizada || !nomeNormalizado) {
      return null;
    }

    const sufixosWhatsapp = this._sufixosWhatsapp(whatsappNormalizado);
    if (!sufixosWhatsapp.length) {
      return null;
    }

    const filtroWhatsapp = sufixosWhatsapp.map((sufixo) => Sequelize.where(
      Sequelize.fn(
        'regexp_replace',
        Sequelize.fn('coalesce', Sequelize.col('whatsapp'), ''),
        '\\D',
        '',
        'g'
      ),
      { [Op.like]: `%${sufixo}` }
    ));

    const candidatos = await ApeloDirecionadoCelula.findAll({
      where: {
        [Op.or]: filtroWhatsapp
      },
      order: [['updatedAt', 'DESC']],
      transaction
    });

    return candidatos.find((item) => (
      this._whatsappIgual(whatsappNormalizado, item.whatsapp)
      && this._redeIgual(redeNormalizada, item.rede)
      && this._nomeParecido(nomeNormalizado, item.nome)
    )) || null;
  }

  _normalizarCampos(dados = {}) {
    const payload = { ...dados };

    if (!Object.prototype.hasOwnProperty.call(payload, 'whatsapp')) {
      const aliases = ['telefone', 'phone', 'celular', 'cel'];
      for (const alias of aliases) {
        if (Object.prototype.hasOwnProperty.call(payload, alias) && payload[alias]) {
          payload.whatsapp = payload[alias];
          break;
        }
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'whatsapp')) {
      const whatsappNormalizado = this._normalizarWhatsapp(payload.whatsapp);
      payload.whatsapp = whatsappNormalizado || null;
    }

    if (!Object.prototype.hasOwnProperty.call(payload, 'bairro_apelo') && Object.prototype.hasOwnProperty.call(payload, 'bairro')) {
      payload.bairro_apelo = payload.bairro;
    }

    if (!Object.prototype.hasOwnProperty.call(payload, 'cidade_apelo') && Object.prototype.hasOwnProperty.call(payload, 'cidade')) {
      payload.cidade_apelo = payload.cidade;
    }

    if (!Object.prototype.hasOwnProperty.call(payload, 'estado_apelo')) {
      if (Object.prototype.hasOwnProperty.call(payload, 'estado')) {
        payload.estado_apelo = payload.estado;
      } else if (Object.prototype.hasOwnProperty.call(payload, 'uf')) {
        payload.estado_apelo = payload.uf;
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'dias_semana')) {
      const dias = payload.dias_semana;
      if (Array.isArray(dias)) {
        payload.dias_semana = dias.filter(Boolean);
      } else if (typeof dias === 'string') {
        payload.dias_semana = dias
          .split(',')
          .map((dia) => dia.trim())
          .filter(Boolean);
      } else {
        payload.dias_semana = dias || null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'observacao')) {
      payload.observacao = payload.observacao || null;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'direcionar_celula')) {
      payload.direcionado_celula = payload.direcionar_celula;
      delete payload.direcionar_celula;
    }

    if (!Object.prototype.hasOwnProperty.call(payload, 'cep_apelo')) {
      if (Object.prototype.hasOwnProperty.call(payload, 'cep')) {
        payload.cep_apelo = payload.cep;
      } else if (Object.prototype.hasOwnProperty.call(payload, 'postal_code')) {
        payload.cep_apelo = payload.postal_code;
      } else if (Object.prototype.hasOwnProperty.call(payload, 'postalCode')) {
        payload.cep_apelo = payload.postalCode;
      } else if (Object.prototype.hasOwnProperty.call(payload, 'cepApelo')) {
        payload.cep_apelo = payload.cepApelo;
      } else if (Object.prototype.hasOwnProperty.call(payload, 'zip')) {
        payload.cep_apelo = payload.zip;
      } else if (Object.prototype.hasOwnProperty.call(payload, 'zipcode')) {
        payload.cep_apelo = payload.zipcode;
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'cep')) {
      delete payload.cep;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'cep_apelo')) {
      payload.cep_apelo = normalizeCep(payload.cep_apelo);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'lat_apelo')) {
      const parsedLat = Number(payload.lat_apelo);
      payload.lat_apelo = Number.isFinite(parsedLat) ? parsedLat : null;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'lon_apelo')) {
      const parsedLon = Number(payload.lon_apelo);
      payload.lon_apelo = Number.isFinite(parsedLon) ? parsedLon : null;
    }

    return payload;
  }

  _deveEnriquecerEndereco(payload = {}, itemAtual = null) {
    const decisao = Object.prototype.hasOwnProperty.call(payload, 'decisao')
      ? payload.decisao
      : itemAtual?.decisao;
    const direcionadoCelula = Object.prototype.hasOwnProperty.call(payload, 'direcionado_celula')
      ? payload.direcionado_celula
      : itemAtual?.direcionado_celula;

    return decisao === 'encaminhamento_celula' || Boolean(direcionadoCelula);
  }

  async _enriquecerEnderecoPorCep(payload = {}, itemAtual = null, options = {}) {
    const { strictCep = false } = options;
    if (!this._deveEnriquecerEndereco(payload, itemAtual)) {
      return payload;
    }

    const camposLocalizacao = ['cep_apelo', 'cep', 'bairro_apelo', 'cidade_apelo', 'estado_apelo', 'lat_apelo', 'lon_apelo'];
    const alterandoLocalizacao = camposLocalizacao
      .some((field) => Object.prototype.hasOwnProperty.call(payload, field));
    const jaPossuiCoordenadas = itemAtual
      && Number.isFinite(Number(itemAtual.lat_apelo))
      && Number.isFinite(Number(itemAtual.lon_apelo));

    if (itemAtual && !alterandoLocalizacao && jaPossuiCoordenadas) {
      return payload;
    }

    const cep = normalizeCep(
      payload.cep_apelo
      || itemAtual?.cep_apelo
    );

    const bairro = payload.bairro_apelo || itemAtual?.bairro_apelo || '';
    const cidade = payload.cidade_apelo || itemAtual?.cidade_apelo || '';
    const estado = payload.estado_apelo || itemAtual?.estado_apelo || '';
    const queryFallback = [bairro, cidade, estado, 'Brasil'].filter(Boolean).join(', ');

    if (!cep && !queryFallback) {
      if (strictCep) {
        throw new Error('CEP do apelo e obrigatorio para encaminhamento de celula');
      }
      return payload;
    }

    if (cep) {
      payload.cep_apelo = cep;
    }

    const geocodeQuery = cep ? `${cep}, Brasil` : queryFallback;
    const geocodeData = await geocodeAddress(geocodeQuery);
    if (!geocodeData) {
      if (strictCep) {
        throw new Error('Nao foi possivel geolocalizar os dados de endereco informados');
      }
      return payload;
    }

    payload.lat_apelo = geocodeData.lat;
    payload.lon_apelo = geocodeData.lon;
    payload.bairro_apelo = geocodeData.bairro || payload.bairro_apelo || itemAtual?.bairro_apelo || null;
    payload.cidade_apelo = geocodeData.cidade || payload.cidade_apelo || itemAtual?.cidade_apelo || null;
    payload.estado_apelo = geocodeData.uf || geocodeData.estado || payload.estado_apelo || itemAtual?.estado_apelo || null;
    payload.cep_apelo = geocodeData.cepEncontrado || payload.cep_apelo || null;

    return payload;
  }

  async criar(dados) {
    const payloadEntrada = this._extrairPayloadEntrada(dados);
    const dadosNormalizados = this._normalizarCampos(payloadEntrada);
    const exigirCep = dadosNormalizados.decisao === 'encaminhamento_celula';
    await this._enriquecerEnderecoPorCep(dadosNormalizados, null, { strictCep: exigirCep });
    const direcionarCelulaEmBranco = dadosNormalizados.direcionado_celula === null || dadosNormalizados.direcionado_celula === undefined;
    const decisao = dadosNormalizados.decisao;
    if (direcionarCelulaEmBranco && decisao !== 'encaminhamento_celula' && !dadosNormalizados.status) {
      dadosNormalizados.status = 'NAO_HAVERAR_DIRECIONAMENTO';
    }

    return ApeloDirecionadoCelula.sequelize.transaction(async (transaction) => {
      const existente = await this._buscarRegistroExistenteParaRecadastro(dadosNormalizados, transaction);

      if (!existente) {
        return ApeloDirecionadoCelula.create(dadosNormalizados, { transaction });
      }

      const statusAnterior = existente.status || null;
      const statusNovo = 'APELO_CADASTRADO';
      const payloadRecadastro = {
        ...dadosNormalizados,
        status: statusNovo,
        celula_id: null,
        lider_direcionado: null,
        cel_lider: null,
        bairro_direcionado: null,
        data_direcionamento: null
      };

      await existente.update(payloadRecadastro, { transaction });

      await ApeloDirecionadoHistorico.create({
        apelo_id: existente.id,
        status_anterior: statusAnterior,
        status_novo: statusNovo,
        data_movimento: new Date(),
        tipo_evento: 'STATUS',
        motivo: ' Procurou novamente o start - Cadastro '
      }, { transaction });

      return existente;
    });
  }

  async listarTodos(filtro = {}) {
    const where = {};
    if (filtro.month) {
      const [year, month] = filtro.month.split('-').map((v) => parseInt(v, 10));
      if (year && month) {
        const start = new Date(Date.UTC(year, month - 1, 1));
        const end = new Date(Date.UTC(year, month, 1));
        where.data_direcionamento = { [Op.gte]: start, [Op.lt]: end };
      }
    }
    if (filtro.year) {
      const ano = parseInt(filtro.year, 10);
      if (!Number.isNaN(ano)) {
        const condition = Sequelize.where(
          Sequelize.fn('date_part', 'year', Sequelize.col('data_direcionamento')),
          ano
        );
        where[Op.and] = (where[Op.and] || []).concat(condition);
      }
    }
    if (filtro.status) {
      where.status = filtro.status;
    }
    if (filtro.nome) {
      where.nome = { [Op.iLike]: `%${filtro.nome}%` };
    }
    if (filtro.decisao) {
      where.decisao = filtro.decisao;
    }

    const page = parseInt(filtro.page, 10) || 1;
    const limit = parseInt(filtro.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const { rows, count } = await ApeloDirecionadoCelula.findAndCountAll({
      where,
      order: [['data_direcionamento', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: Celula,
          as: 'celulaAtual',
          attributes: [
            'id',
            'celula',
            'rede',
            'lider',
            'cel_lider',
            'dia',
            'horario',
            'bairro',
            'campus'
          ]
        }
      ]
    });

    const totalPaginas = Math.ceil(count / limit) || 1;

    return {
      registros: rows,
      totalRegistros: count,
      totalPaginas,
      paginaAtual: page
    };
  }

  async buscarPorId(id) {
    const item = await ApeloDirecionadoCelula.findByPk(id);
    if (!item) throw new Error('Registro não encontrado');
    return item;
  }

  async atualizar(id, dados = {}) {
    const item = await this.buscarPorId(id);
    const payloadEntrada = this._extrairPayloadEntrada(dados);
    const { motivo_status, ...dadosAtualizar } = this._normalizarCampos(payloadEntrada);
    await this._enriquecerEnderecoPorCep(dadosAtualizar, item, { strictCep: false });
    const statusEnviado = Object.prototype.hasOwnProperty.call(dadosAtualizar, 'status');
    const statusAnterior = item.status;
    const statusNovo = dadosAtualizar.status;

    const atualizado = await item.update(dadosAtualizar);

    if (statusEnviado && statusNovo !== statusAnterior) {
      await ApeloDirecionadoHistorico.create({
        apelo_id: item.id,
        status_anterior: statusAnterior || null,
        status_novo: statusNovo || null,
        data_movimento: new Date(),
        tipo_evento: 'STATUS',
        motivo: motivo_status || null
      });
    }

    return atualizado;
  }

  async deletar(id) {
    const item = await this.buscarPorId(id);
    await item.destroy();
    return { mensagem: 'Registro removido com sucesso' };
  }

  async listarPorCelula(celulaId) {
    if (!celulaId) {
      return [];
    }
    return await ApeloDirecionadoCelula.findAll({
      where: { celula_id: celulaId },
      order: [['createdAt', 'DESC']]
    });
  }

  async resumoPorCelula() {
    const registros = await ApeloDirecionadoCelula.findAll({
      attributes: [
        'celula_id',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'total']
      ],
      group: ['celula_id']
    });
    return registros.map((row) => ({
      celula_id: row.get('celula_id'),
      total: parseInt(row.get('total'), 10) || 0
    }));
  }

  async moverApelo(apeloId, celulaDestinoId, motivo = '') {
    const apelo = await this.buscarPorId(apeloId);
    const celulaDestino = await Celula.findByPk(celulaDestinoId);

    if (!celulaDestino) {
      throw new Error('Celula de destino nao encontrada.');
    }

    const origem = apelo.celula_id;
    if (origem && celulaDestinoId && String(origem) === String(celulaDestinoId)) {
      throw new Error('Não é possível direcionar para a mesma célula.');
    }
    const novoStatus = 'MOVIMENTACAO_CELULA';
    const statusAnterior = apelo.status;
    apelo.status = novoStatus;
    apelo.celula_id = celulaDestinoId || null;
    apelo.lider_direcionado = celulaDestino.lider || null;
    apelo.cel_lider = celulaDestino.cel_lider || null;
    apelo.bairro_direcionado = celulaDestino.bairro || null;
    apelo.campus_iecg = celulaDestino.campus || null;
    apelo.direcionado_celula = true;
    apelo.data_direcionamento = new Date();
    await apelo.save();

    if (statusAnterior !== novoStatus) {
      await ApeloDirecionadoHistorico.create({
        apelo_id: apelo.id,
        status_anterior: statusAnterior || null,
        status_novo: novoStatus,
        data_movimento: new Date(),
        tipo_evento: 'STATUS',
        motivo: motivo || null
      });
    }

    await ApeloDirecionadoHistorico.create({
      apelo_id: apelo.id,
      celula_id_origem: origem,
      celula_id_destino: celulaDestinoId || null,
      motivo: motivo || null,
      data_movimento: new Date(),
      tipo_evento: 'CELULA'
    });

    return apelo;
  }

  async historico(apeloId) {
    return await ApeloDirecionadoHistorico.findAll({
      where: { apelo_id: apeloId },
      order: [['data_movimento', 'DESC']],
      include: [
        { model: Celula, as: 'celulaOrigem', attributes: ['id', 'celula'] },
        { model: Celula, as: 'celulaDestino', attributes: ['id', 'celula'] }
      ]
    });
  }
}

module.exports = new ApeloDirecionadoCelulaService();
