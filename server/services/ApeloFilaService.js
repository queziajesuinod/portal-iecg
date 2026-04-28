const axios = require('axios');
const { Op } = require('sequelize');
const { ApeloDirecionadoCelula, Celula } = require('../models');
const ApeloDirecionadoCelulaService = require('./ApeloDirecionadoCelulaService');
const WebhookService = require('./WebhookService');

// ==================== CONFIGURAÇÕES ====================
const CONFIG = {
  // Limites de capacidade
  diasRecencia: 90,
  maxPorCelulaRecente: 2, // Máximo 2 direcionamentos em 90 dias
  
  // Estratégia de busca por raios expandidos
  raios: {
    enabled: true,
    inicial: 5,              // Começar buscando em 5km
    incremento: 5,           // Aumentar 5km a cada iteração
    maximo: 50,              // Raio máximo de busca
    tentativasMaximas: 10    // (50-5)/5 = 9 iterações
  },
  
  // Pesos para scoring (total = 100)
  scoring: {
    pesoDistancia: 45,           // 45% do score
    pesoCapacidade: 25,          // 25% - quanto menos direcionamentos recentes, melhor
    pesoBairro: 20,              // 20% - mesmo bairro
    pesoDiaSemana: 10,           // 10% - mesmo dia da semana
  },
  
  // Configurações de geocoding
  timeoutGeocoding: 5000,
  statusTransitionDelayMs: 20 * 1000,
  
  // Validação da origem do apelo
  validacaoOrigem: {
    maxDivergenciaKm: 2 // Se coordenada salva divergir muito do CEP, usa CEP
  },

  // Seleção final entre candidatas
  selecao: {
    margemDistanciaKm: 1.5 // Dentro dessa margem, usa score/capacidade como desempate
  }
};

const GOOGLE_GEOCODE_KEY = process.env.GOOGLE_GEOCODE_KEY;

// ==================== CACHE ====================
class GeocodingCache {
  constructor(ttlMinutes = 60) {
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000;
    this.stats = { hits: 0, misses: 0, sets: 0 };
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return item.value;
  }

  set(key, value) {
    this.stats.sets++;
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : '0%'
    };
  }

  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, sets: 0 };
  }
}

const geocodingCache = new GeocodingCache(60);

// ==================== UTILITÁRIOS ====================
const haversine = (lat1, lon1, lat2, lon2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const normalizeAddress = (address) => {
  return address
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s,]/g, '');
};

const normalizeCep = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 8 ? digits : null;
};

const parseCoordinateValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return Number.NaN;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.');
    return Number(normalized);
  }

  return Number(value);
};

const parseCoordinates = (lat, lon) => {
  const parsedLat = parseCoordinateValue(lat);
  const parsedLon = parseCoordinateValue(lon);

  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLon)) {
    return null;
  }

  if (parsedLat < -90 || parsedLat > 90) {
    return null;
  }

  if (parsedLon < -180 || parsedLon > 180) {
    return null;
  }

  return { lat: parsedLat, lon: parsedLon };
};

const normalizeDiaSemana = (dia) => {
  if (!dia) return null;
  
  const mapa = {
    'segunda': 'segunda-feira',
    'segunda-feira': 'segunda-feira',
    'seg': 'segunda-feira',
    'terca': 'terça-feira',
    'terça': 'terça-feira',
    'terça-feira': 'terça-feira',
    'ter': 'terça-feira',
    'quarta': 'quarta-feira',
    'quarta-feira': 'quarta-feira',
    'qua': 'quarta-feira',
    'quinta': 'quinta-feira',
    'quinta-feira': 'quinta-feira',
    'qui': 'quinta-feira',
    'sexta': 'sexta-feira',
    'sexta-feira': 'sexta-feira',
    'sex': 'sexta-feira',
    'sabado': 'sábado',
    'sábado': 'sábado',
    'sab': 'sábado',
    'domingo': 'domingo',
    'dom': 'domingo',
  };
  
  return mapa[dia.toLowerCase().trim()] || null;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const scheduleStatusTransition = (apeloId) => {
  setTimeout(async () => {
    try {
      await ApeloDirecionadoCelulaService.atualizar(apeloId, { 
        status: 'DIRECIONADO_COM_SUCESSO' 
      });
      WebhookService.sendEvent('apelo.status_changed', {
        apeloId,
        status: 'DIRECIONADO_COM_SUCESSO'
      }).catch(() => {});
    } catch (err) {
      console.error('Erro ao atualizar status do apelo automaticamente:', err);
    }
  }, CONFIG.statusTransitionDelayMs);
};

// ==================== GEOCODING ====================
const geocode = async (query) => {
  if (!query || !GOOGLE_GEOCODE_KEY) {
    if (!GOOGLE_GEOCODE_KEY) {
      console.warn('GOOGLE_GEOCODE_KEY não configurada.');
    }
    return null;
  }

  const normalizedQuery = normalizeAddress(query);
  const cached = geocodingCache.get(normalizedQuery);
  if (cached !== null) return cached;

  try {
    const params = new URLSearchParams({
      address: query,
      key: GOOGLE_GEOCODE_KEY,
      region: 'br',
      language: 'pt-BR'
    });

    const res = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
      {
        headers: { 'User-Agent': 'portal-iecg/1.0' },
        timeout: CONFIG.timeoutGeocoding,
      }
    );

    const data = res.data;
    
    if (!data || data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
      geocodingCache.set(normalizedQuery, null);
      return null;
    }

    const location = data.results[0].geometry?.location;
    if (!location || location.lat == null || location.lng == null) {
      geocodingCache.set(normalizedQuery, null);
      return null;
    }

    const result = { 
      lat: parseFloat(location.lat), 
      lon: parseFloat(location.lng) 
    };
    
    geocodingCache.set(normalizedQuery, result);
    return result;
    
  } catch (err) {
    console.error('Erro no geocoding:', err.message);
    geocodingCache.set(normalizedQuery, null);
    return null;
  }
};

// ==================== SCORING SIMPLIFICADO ====================
class ScoringEngine {
  static calcularScore(celulaInfo, distKm, apelo) {
    const { celula, totalRecentes } = celulaInfo;
    let score = 0;
    const detalhes = {};

    // 1. SCORE POR DISTÂNCIA (45 pontos)
    const scoreDistancia = this.calcularScoreDistancia(distKm);
    score += scoreDistancia * (CONFIG.scoring.pesoDistancia / 100);
    detalhes.distancia = { 
      valor: distKm.toFixed(2) + 'km', 
      score: scoreDistancia.toFixed(2),
      peso: CONFIG.scoring.pesoDistancia 
    };

    // 2. SCORE POR CAPACIDADE (25 pontos)
    const scoreCapacidade = this.calcularScoreCapacidade(totalRecentes);
    score += scoreCapacidade * (CONFIG.scoring.pesoCapacidade / 100);
    detalhes.capacidade = { 
      recentes: totalRecentes,
      max: CONFIG.maxPorCelulaRecente,
      score: scoreCapacidade.toFixed(2),
      peso: CONFIG.scoring.pesoCapacidade
    };

    // 3. SCORE POR BAIRRO (20 pontos)
    const scoreBairro = this.calcularScoreBairro(apelo, celula);
    score += scoreBairro * (CONFIG.scoring.pesoBairro / 100);
    detalhes.bairro = { 
      matchExato: scoreBairro === 100,
      matchProximo: scoreBairro === 75,
      matchParcial: scoreBairro === 40,
      score: scoreBairro.toFixed(2),
      peso: CONFIG.scoring.pesoBairro
    };

    // 4. SCORE POR DIA DA SEMANA (10 pontos)
    const scoreDiaSemana = this.calcularScoreDiaSemana(apelo, celula);
    score += scoreDiaSemana * (CONFIG.scoring.pesoDiaSemana / 100);
    detalhes.diaSemana = {
      match: scoreDiaSemana > 0,
      apeloDias: apelo.dias_semana,
      celulaDia: celula.dia,
      score: scoreDiaSemana.toFixed(2),
      peso: CONFIG.scoring.pesoDiaSemana
    };

    return {
      scoreTotal: Math.max(0, score),
      detalhes
    };
  }

  static calcularScoreDistancia(distKm) {
    // Quanto mais perto, melhor
    // 0-5km = 100 pontos
    // 5-20km = decrescimento linear
    // >20km = pontuação mínima mas ainda válida
    
    if (distKm <= 5) return 100;
    if (distKm <= 20) {
      return 100 * (1 - (distKm - 5) / 15);
    }
    if (distKm <= 50) {
      // Decrescimento mais suave para distâncias maiores
      return 20 * (1 - (distKm - 20) / 30);
    }
    return 0;
  }

  static calcularScoreCapacidade(totalRecentes) {
    // Quanto menos direcionamentos recentes, melhor
    // 0 recentes = 100 pontos
    // 1 recente = 50 pontos
    // 2+ recentes = 0 pontos (não deveria chegar aqui devido ao filtro)
    
    const percentualDisponivel = (CONFIG.maxPorCelulaRecente - totalRecentes) / CONFIG.maxPorCelulaRecente;
    return percentualDisponivel * 100;
  }

  static calcularScoreBairro(apelo, celula) {
    if (!apelo.bairro_apelo || !celula.bairro) return 0;
    
    const bairroApeloNorm = normalizeAddress(apelo.bairro_apelo);
    const bairroCelulaNorm = normalizeAddress(celula.bairro);
    
    // Match exato
    if (bairroApeloNorm === bairroCelulaNorm) {
      return 100;
    }
    
    // Verificar bairros próximos (se existir no apelo)
    if (Array.isArray(apelo.bairro_proximo)) {
      for (const bairroProx of apelo.bairro_proximo) {
        if (bairroProx) {
          const bairroProxNorm = normalizeAddress(bairroProx);
          if (bairroProxNorm === bairroCelulaNorm) {
            return 75; // Match com bairro próximo
          }
        }
      }
    }
    
    // Match parcial (contém)
    if (bairroApeloNorm.includes(bairroCelulaNorm) || 
        bairroCelulaNorm.includes(bairroApeloNorm)) {
      return 40;
    }
    
    return 0;
  }

  static calcularScoreDiaSemana(apelo, celula) {
    // apelo.dias_semana é JSONB array: ["segunda-feira", "quarta-feira"]
    // celula.dia é VARCHAR: "segunda-feira"
    
    if (!celula.dia) return 50; // Neutro se célula não tem dia definido
    
    const celulaDiaNorm = normalizeDiaSemana(celula.dia);
    if (!celulaDiaNorm) return 50;
    
    // Se apelo não tem preferência de dias, neutro
    if (!apelo.dias_semana || !Array.isArray(apelo.dias_semana) || apelo.dias_semana.length === 0) {
      return 50;
    }
    
    // Verificar se há match
    for (const diaApelo of apelo.dias_semana) {
      const diaApeloNorm = normalizeDiaSemana(diaApelo);
      if (diaApeloNorm && diaApeloNorm === celulaDiaNorm) {
        return 100; // Match perfeito
      }
    }
    
    return 0; // Não tem match
  }
}

// ==================== SERVIÇO PRINCIPAL ====================
class ApeloFilaService {
  async proximoApelo() {
    return ApeloDirecionadoCelula.findOne({
      where: {
        celula_id: null,
        [Op.and]: [
          {
            [Op.or]: [
              { cep_apelo: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: '' }] } },
              { bairro_apelo: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: '' }] } }
            ]
          },
          {
            [Op.or]: [
              { status: null },
              { status: {
                [Op.notIn]: ['DIRECIONADO_COM_SUCESSO', 'PRIMEIRO_CONTATO', 'NAO_HAVERAR_DIRECIONAMENTO', 'CONSOLIDADO_CELULA', 'SEM_CELULA_DISPONIVEL']
              }}
            ]
          }
        ]
      },
      order: [['createdAt', 'ASC']]
    });
  }

  /**
   * Busca células candidatas COM FILTROS IMPORTANTES
   * - Mesma rede que o apelo (OBRIGATÓRIO)
   * - Ativas
   * - Com coordenadas válidas
   */
  async celulasCandidatas(rede) {
    const where = { 
      ativo: true,
      lat: { [Op.not]: null },
      lon: { [Op.not]: null }
    };
    
    // REGRA: Mesma rede é OBRIGATÓRIA
    if (!rede) {
      console.warn('⚠️  Apelo sem rede definida - não é possível buscar células');
      return [];
    }
    
    where.rede = { [Op.iLike]: `%${rede}%` };
    
    const celulas = await Celula.findAll({ where });
    const celulasComCoordValida = celulas.filter((celula) => parseCoordinates(celula.lat, celula.lon));

    if (celulasComCoordValida.length < celulas.length) {
      console.warn(`⚠️  ${celulas.length - celulasComCoordValida.length} células ignoradas por coordenadas inválidas`);
    }

    console.log(`📍 Encontradas ${celulasComCoordValida.length} células da rede "${rede}" com coordenadas válidas`);
    
    return celulasComCoordValida;
  }

  /**
   * Filtra células que NÃO ultrapassaram o limite de direcionamentos recentes
   * REGRA: Máximo 2 direcionamentos nos últimos 90 dias
   */
  async celulasComCapacidade(celulas) {
    const limiteData = new Date();
    limiteData.setDate(limiteData.getDate() - CONFIG.diasRecencia);

    const result = [];
    
    for (const celula of celulas) {
      const recentes = await ApeloDirecionadoCelula.count({
        where: {
          celula_id: celula.id,
          data_direcionamento: { [Op.gte]: limiteData }
        }
      });

      // REGRA: Só incluir se tiver menos de 2 direcionamentos recentes
      if (recentes < CONFIG.maxPorCelulaRecente) {
        result.push({
          celula,
          totalRecentes: recentes
        });
      }
    }
    
    console.log(`✓ ${result.length} células com capacidade disponível (max ${CONFIG.maxPorCelulaRecente} direcionamentos em ${CONFIG.diasRecencia} dias)`);
    
    return result;
  }

  /**
   * Filtra células dentro de um raio específico
   */
  filtrarPorRaio(celulasDisponiveis, raioKm) {
    return celulasDisponiveis.filter(({ distKm }) => distKm <= raioKm);
  }

  normalizarQueryEndereco(...partes) {
    return partes
      .filter(Boolean)
      .map((parte) => String(parte).trim())
      .filter(Boolean)
      .join(', ')
      .replace(/\s+,/g, ',')
      .replace(/,\s*,/g, ', ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  async geocodificarPorCep(apelo) {
    const cep = normalizeCep(apelo?.cep_apelo);
    if (!cep) {
      return null;
    }

    const consultas = [
      this.normalizarQueryEndereco(cep, apelo?.cidade_apelo, apelo?.estado_apelo, 'Brasil'),
      this.normalizarQueryEndereco(cep, 'Brasil')
    ].filter(Boolean);

    for (const query of consultas) {
      const result = await geocode(query);
      if (result) {
        return { ...result, query, cep };
      }
    }

    return null;
  }

  async resolverOrigemApelo(apelo) {
    const origemPersistida = parseCoordinates(apelo.lat_apelo, apelo.lon_apelo);
    const origemPorCep = await this.geocodificarPorCep(apelo);

    if (origemPersistida && origemPorCep) {
      const divergencia = haversine(
        origemPersistida.lat,
        origemPersistida.lon,
        origemPorCep.lat,
        origemPorCep.lon
      );

      if (divergencia <= CONFIG.validacaoOrigem.maxDivergenciaKm) {
        return {
          coord: origemPersistida,
          fonte: 'coordenadas_persistidas_validas',
          divergenciaKm: divergencia,
          precisaPersistir: false
        };
      }

      console.warn(`⚠️  Coordenadas do apelo divergentes do CEP (${divergencia.toFixed(2)}km). Usando CEP.`);
      return {
        coord: origemPorCep,
        fonte: `cep_geocodificado:${origemPorCep.query}`,
        divergenciaKm: divergencia,
        precisaPersistir: true
      };
    }

    if (origemPorCep) {
      return {
        coord: origemPorCep,
        fonte: `cep_geocodificado:${origemPorCep.query}`,
        divergenciaKm: null,
        precisaPersistir: !origemPersistida
      };
    }

    if (origemPersistida) {
      return {
        coord: origemPersistida,
        fonte: 'coordenadas_persistidas',
        divergenciaKm: null,
        precisaPersistir: false
      };
    }

    const tries = this.construirTentativasGeocoding(apelo);
    if (!tries.length) {
      return null;
    }

    for (const t of tries) {
      const origem = await geocode(t);
      if (origem) {
        return {
          coord: origem,
          fonte: `fallback_geocoding:${t}`,
          divergenciaKm: null,
          precisaPersistir: true
        };
      }
    }

    return null;
  }

  mapearDistancias(celulasDisponiveis, origemCoord) {
    return celulasDisponiveis
      .map((celulaInfo) => {
        const celulaCoord = parseCoordinates(celulaInfo.celula.lat, celulaInfo.celula.lon);

        if (!celulaCoord) {
          return null;
        }

        const distKm = haversine(
          origemCoord.lat,
          origemCoord.lon,
          celulaCoord.lat,
          celulaCoord.lon
        );

        return {
          ...celulaInfo,
          distKm
        };
      })
      .filter(Boolean);
  }

  construirTentativasGeocoding(apelo) {
    const tries = [];

    // 1. CEP do apelo (prioridade máxima)
    const cep = normalizeCep(apelo.cep_apelo);
    if (cep) {
      tries.push(`${cep}, Brasil`);
      if (apelo.cidade_apelo || apelo.estado_apelo) {
        tries.push(`${cep}, ${apelo.cidade_apelo || ''}, ${apelo.estado_apelo || ''}, Brasil`.trim());
      }
    }
    
    // 2. Bairro do apelo
    if (apelo.bairro_apelo) {
      tries.push(`${apelo.bairro_apelo}, ${apelo.cidade_apelo || ''}, ${apelo.estado_apelo || ''}`.trim());
    }

    // 3. Bairros próximos
    if (Array.isArray(apelo.bairro_proximo)) {
      apelo.bairro_proximo.forEach((b) => {
        if (b) {
          tries.push(`${b}, ${apelo.cidade_apelo || ''}, ${apelo.estado_apelo || ''}`.trim());
        }
      });
    }

    // 4. Cidade como fallback
    if (!tries.length && apelo.cidade_apelo) {
      tries.push(`${apelo.cidade_apelo}, ${apelo.estado_apelo || ''}`.trim());
    }

    return tries;
  }

  /**
   * ESTRATÉGIA DE RAIOS EXPANDIDOS
   * Começa com raio pequeno e vai aumentando até encontrar células
   */
  async melhorCelula(apelo) {
    // 1. Validar rede
    if (!apelo.rede) {
      console.error('❌ Apelo sem rede definida');
      return null;
    }

    // 2. Buscar células da mesma rede
    const baseCelulas = await this.celulasCandidatas(apelo.rede);
    
    if (!baseCelulas.length) {
      console.warn(`❌ Nenhuma célula ativa encontrada para a rede "${apelo.rede}"`);
      return null;
    }

    // 3. Filtrar células com capacidade disponível
    const celulasDisponiveis = await this.celulasComCapacidade(baseCelulas);
    
    if (!celulasDisponiveis.length) {
      console.warn('❌ Nenhuma célula com capacidade disponível (todas ultrapassaram o limite de direcionamentos)');
      return null;
    }

    // 4. Resolver origem do apelo com validação de CEP/coordenadas
    const origemInfo = await this.resolverOrigemApelo(apelo);
    if (!origemInfo || !origemInfo.coord) {
      console.warn('❌ Não foi possível obter coordenadas válidas para o apelo');
      return null;
    }
    const origemCoord = origemInfo.coord;
    console.log(`✓ Origem do apelo definida por: ${origemInfo.fonte}`);
    if (Number.isFinite(origemInfo.divergenciaKm)) {
      console.log(`  Divergência coordenada x CEP: ${origemInfo.divergenciaKm.toFixed(2)}km`);
    }

    if (origemInfo.precisaPersistir && apelo?.id) {
      try {
        await ApeloDirecionadoCelulaService.atualizar(apelo.id, {
          lat_apelo: origemCoord.lat,
          lon_apelo: origemCoord.lon
        });
      } catch (err) {
        console.warn('⚠️  Não foi possível persistir coordenadas atualizadas do apelo:', err.message);
      }
    }

    const celulasComDistancia = this.mapearDistancias(celulasDisponiveis, origemCoord);

    if (!celulasComDistancia.length) {
      console.warn('❌ Nenhuma célula com coordenadas válidas para calcular distância');
      return null;
    }

    // 5. ESTRATÉGIA DE RAIOS EXPANDIDOS
    if (!CONFIG.raios.enabled) {
      // Sem raios, avaliar todas as células
      return this.avaliarCelulas(celulasComDistancia, apelo, Infinity);
    }

    let raioAtual = CONFIG.raios.inicial;
    let tentativa = 0;

    while (raioAtual <= CONFIG.raios.maximo && tentativa < CONFIG.raios.tentativasMaximas) {
      tentativa++;
      
      console.log(`\n🔍 Tentativa ${tentativa}: Buscando células em raio de ${raioAtual}km...`);
      
      // Filtrar células dentro do raio atual
      const celulasNoRaio = this.filtrarPorRaio(celulasComDistancia, raioAtual);
      
      console.log(`   📍 ${celulasNoRaio.length} células encontradas neste raio`);
      
      if (celulasNoRaio.length > 0) {
        // Encontrou células - avaliar e retornar a melhor
        const resultado = await this.avaliarCelulas(celulasNoRaio, apelo, raioAtual);
        
        if (resultado) {
          console.log(`✅ Célula encontrada no raio de ${raioAtual}km!`);
          return resultado;
        }
      }
      
      // Não encontrou - expandir raio
      raioAtual += CONFIG.raios.incremento;
    }

    console.warn(`❌ Nenhuma célula adequada encontrada mesmo expandindo até ${CONFIG.raios.maximo}km`);
    return null;
  }

  /**
   * Avalia células e retorna a melhor com base no score
   */
  async avaliarCelulas(celulasNoRaio, apelo, raioAtual) {
    const celulasComScore = [];
    
    for (const celulaInfo of celulasNoRaio) {
      const { celula } = celulaInfo;
      const dist = celulaInfo.distKm;

      // Calcular score
      const { scoreTotal, detalhes } = ScoringEngine.calcularScore(
        celulaInfo,
        dist,
        apelo
      );

      celulasComScore.push({
        celula,
        distKm: dist,
        score: scoreTotal,
        detalhes,
        totalRecentes: celulaInfo.totalRecentes
      });
    }

    if (!celulasComScore.length) {
      return null;
    }

    // Prioridade principal: menor distância real (coordenadas)
    // Quando as distâncias são próximas, manter outras condições no critério
    // (bairro, dia da semana, capacidade), via score.
    celulasComScore.sort((a, b) => {
      const distDiff = a.distKm - b.distKm;
      if (Math.abs(distDiff) > CONFIG.selecao.margemDistanciaKm) {
        return distDiff;
      }

      const scoreDiff = b.score - a.score;
      if (Math.abs(scoreDiff) > 0.001) {
        return scoreDiff;
      }

      return a.totalRecentes - b.totalRecentes;
    });

    const melhor = celulasComScore[0];
    
    // Log detalhado
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✓ CÉLULA SELECIONADA: ${melhor.celula.celula}`);
    console.log(`  Rede: ${melhor.celula.rede}`);
    console.log(`  Líder: ${melhor.celula.lider || 'N/A'}`);
    console.log(`  Bairro: ${melhor.celula.bairro || 'N/A'}`);
    console.log(`  Dia da semana: ${melhor.celula.dia || 'N/A'}`);
    console.log(`  Score Total: ${melhor.score.toFixed(2)}/100`);
    console.log(`  Distância: ${melhor.distKm.toFixed(2)}km (raio ${raioAtual}km)`);
    console.log(`  Direcionamentos recentes: ${melhor.totalRecentes}/${CONFIG.maxPorCelulaRecente}`);
    console.log(`\n  📊 Detalhes do Score:`);
    Object.entries(melhor.detalhes).forEach(([criterio, dados]) => {
      console.log(`    ${criterio}:`, JSON.stringify(dados, null, 2).replace(/\n/g, '\n      '));
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Log das alternativas (top 3)
    if (celulasComScore.length > 1) {
      console.log('📊 Top 3 alternativas neste raio:');
      celulasComScore.slice(0, 3).forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.celula.celula} - Score: ${c.score.toFixed(2)} - Dist: ${c.distKm.toFixed(2)}km - Dir.Recentes: ${c.totalRecentes}`);
      });
      console.log('');
    }

    return {
      celula: melhor.celula,
      distKm: melhor.distKm,
      score: melhor.score,
      detalhes: melhor.detalhes,
      raioEncontrado: raioAtual
    };
  }

  async processarFila() {
    const apelo = await this.proximoApelo();
    
    if (!apelo) {
      return { mensagem: 'Nenhum apelo aguardando direcionamento.' };
    }

    console.log('\n' + '='.repeat(80));
    console.log(`🔄 PROCESSANDO APELO #${apelo.id}`);
    console.log(`   Nome: ${apelo.nome || 'N/A'}`);
    console.log(`   Rede: ${apelo.rede || 'N/A'}`);
    console.log(`   CEP: ${apelo.cep_apelo || 'N/A'}`);
    console.log(`   Coord. apelo: ${apelo.lat_apelo || 'N/A'}, ${apelo.lon_apelo || 'N/A'}`);
    console.log(`   Bairro: ${apelo.bairro_apelo || 'N/A'}, ${apelo.cidade_apelo || 'N/A'}/${apelo.estado_apelo || 'N/A'}`);
    console.log(`   Dias preferência: ${Array.isArray(apelo.dias_semana) ? apelo.dias_semana.join(', ') : 'N/A'}`);
    console.log('='.repeat(80));

    const selecionada = await this.melhorCelula(apelo);
    
    if (!selecionada) {
      console.log('❌ Nenhuma célula disponível/compatível encontrada\n');
      return { 
        mensagem: 'Nenhuma célula disponível/compatível encontrada.', 
        apeloId: apelo.id,
        motivo: 'Nenhuma célula da mesma rede com capacidade disponível ou dentro do raio máximo'
      };
    }

    const { celula, distKm, score, detalhes, raioEncontrado } = selecionada;

    const payloadAtualizar = {
      celula_id: celula.id,
      lider_direcionado: celula.lider || null,
      cel_lider: celula.cel_lider || null,
      bairro_direcionado: celula.bairro || null,
      direcionado_celula: true,
      data_direcionamento: new Date(),
      status: 'MOVIMENTACAO_CELULA'
    };

    await ApeloDirecionadoCelulaService.atualizar(apelo.id, payloadAtualizar);

    WebhookService.sendEvent('apelo.moved', {
      apeloId: apelo.id,
      destinoCelulaId: celula.id,
      distanciaKm: distKm,
      score: score,
      raioEncontrado: raioEncontrado,
      detalhesScore: detalhes
    }).catch(() => {});

    WebhookService.sendEvent('apelo.status_changed', {
      apeloId: apelo.id,
      status: 'MOVIMENTACAO_CELULA'
    }).catch(() => {});

    scheduleStatusTransition(apelo.id);

    console.log('✅ DIRECIONAMENTO CONCLUÍDO COM SUCESSO\n');

    return {
      mensagem: 'Apelo direcionado com sucesso',
      apeloId: apelo.id,
      celula: {
        id: celula.id,
        nome: celula.celula,
        lider: celula.lider,
        bairro: celula.bairro,
        rede: celula.rede,
        dia: celula.dia
      },
      distanciaKm: distKm,
      raioEncontrado: raioEncontrado,
      score: score,
      detalhesScore: detalhes
    };
  }

  getHealthStatus() {
    return {
      cache: {
        geocoding: geocodingCache.getStats()
      },
      config: {
        maxPorCelulaRecente: CONFIG.maxPorCelulaRecente,
        diasRecencia: CONFIG.diasRecencia,
        raios: CONFIG.raios,
        scoring: CONFIG.scoring
      },
      timestamp: new Date().toISOString()
    };
  }

  resetMonitoring() {
    geocodingCache.clear();
    return { mensagem: 'Monitoramento resetado com sucesso' };
  }
}

module.exports = new ApeloFilaService();
