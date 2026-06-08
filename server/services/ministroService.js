const { QueryTypes } = require('sequelize');
const {
  Ministro, MinistroCampusMinisterio, Campus, Ministerio, sequelize
} = require('../models');

const schema = process.env.DB_SCHEMA || 'dev_iecg';

// ─── Helpers de normalização (mesma lógica do script dedupMinistros.js) ────────

const TITULOS = [
  'apostolo', 'apóstolo', 'ap', 'pastor', 'pastora', 'pr', 'pra',
  'bispo', 'bispa', 'missionario', 'missionária', 'diacono', 'diacona',
  'presbitero', 'presbitera', 'evangelista', 'profeta', 'profetisa',
];

function removerAcentos(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizarNome(nome) {
  let s = removerAcentos(String(nome || ''))
    .toLowerCase()
    .replace(/[.,\-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  let alterou = true;
  while (alterou) {
    alterou = false;
    for (const titulo of TITULOS) {
      const re = new RegExp(`^${titulo}\\b\\s*`, 'i');
      if (re.test(s)) { s = s.replace(re, '').trim(); alterou = true; }
    }
  }
  return s.trim();
}

function levenshtein(a, b) {
  const m = a.length; const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (__, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similaridade(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

function agrupar(ministros, threshold = 0.80) {
  const grupos = [];
  const alocados = new Set();
  for (let i = 0; i < ministros.length; i += 1) {
    if (alocados.has(i)) continue;
    const grupo = [i];
    const baseI = normalizarNome(ministros[i].nome);
    for (let j = i + 1; j < ministros.length; j += 1) {
      if (alocados.has(j)) continue;
      const baseJ = normalizarNome(ministros[j].nome);
      if (similaridade(baseI, baseJ) >= threshold) { grupo.push(j); alocados.add(j); }
    }
    alocados.add(i);
    if (grupo.length > 1) grupos.push(grupo.map((idx) => ministros[idx]));
  }
  return grupos;
}

const MinistroService = {
  async listar(apenasAtivos = false, campusId = null, ministerioId = null) {
    const includeVinculos = {
      model: MinistroCampusMinisterio,
      as: 'vinculos',
      required: false,
      include: [
        { model: Campus, as: 'campus', attributes: ['id', 'nome'] },
        { model: Ministerio, as: 'ministerio', attributes: ['id', 'nome'] },
      ],
    };

    if (campusId && ministerioId) {
      const vinculados = await MinistroCampusMinisterio.findAll({
        where: { campusId, ministerioId },
        attributes: ['ministroId'],
        raw: true,
      });
      const ids = vinculados.map((v) => v.ministroId);
      if (ids.length === 0) return [];
      const { Op } = require('sequelize');
      const where = { id: { [Op.in]: ids } };
      if (apenasAtivos) where.ativo = true;
      return Ministro.findAll({ where, include: [includeVinculos], order: [['nome', 'ASC']] });
    }
    const where = apenasAtivos ? { ativo: true } : {};
    return Ministro.findAll({ where, include: [includeVinculos], order: [['nome', 'ASC']] });
  },

  async buscarPorId(id) {
    const ministro = await Ministro.findByPk(id);
    if (!ministro) throw new Error('Ministro não encontrado');
    return ministro;
  },

  async criar(dados) {
    return Ministro.create(dados);
  },

  async atualizar(id, dados) {
    const ministro = await Ministro.findByPk(id);
    if (!ministro) throw new Error('Ministro não encontrado');
    Object.assign(ministro, dados);
    await ministro.save();
    return ministro;
  },

  async alternarAtivo(id) {
    const ministro = await Ministro.findByPk(id);
    if (!ministro) throw new Error('Ministro não encontrado');
    ministro.ativo = !ministro.ativo;
    await ministro.save();
    return ministro;
  },

  async listarVinculos(ministroId) {
    return MinistroCampusMinisterio.findAll({
      where: { ministroId },
      include: [
        { model: Campus, as: 'campus', attributes: ['id', 'nome'] },
        { model: Ministerio, as: 'ministerio', attributes: ['id', 'nome'] },
      ],
    });
  },

  async salvarVinculos(ministroId, vinculos) {
    // vinculos: [{ campusId, ministerioId }]
    const ministro = await Ministro.findByPk(ministroId);
    if (!ministro) throw new Error('Ministro não encontrado');
    await MinistroCampusMinisterio.destroy({ where: { ministroId } });
    if (vinculos?.length) {
      await MinistroCampusMinisterio.bulkCreate(
        vinculos.map((v) => ({ ministroId, campusId: v.campusId, ministerioId: v.ministerioId })),
        { ignoreDuplicates: true }
      );
    }
    return this.listarVinculos(ministroId);
  },

  async listarDuplicatas() {
    const usoRows = await sequelize.query(
      `SELECT "ministroId", COUNT(*) as usos FROM "${schema}"."registro_culto_ministro" GROUP BY "ministroId"`,
      { type: QueryTypes.SELECT }
    );
    const usoMap = new Map(usoRows.map((r) => [r.ministroId, Number(r.usos)]));
    const todos = await Ministro.findAll({ order: [['nome', 'ASC']], raw: true });
    const ministros = todos.map((m) => ({ ...m, usos: usoMap.get(m.id) || 0 }));
    const grupos = agrupar(ministros, 0.80);
    return grupos.map((g) => g.map((m) => ({
      id: m.id, nome: m.nome, usos: m.usos, ativo: m.ativo
    })));
  },

  async fundir({ manterId, fundirIds }) {
    if (!manterId || !fundirIds?.length) throw new Error('manterId e fundirIds são obrigatórios');
    const manter = await Ministro.findByPk(manterId);
    if (!manter) throw new Error('Ministro principal não encontrado');

    // Registros afetados (precisam ter quemMinistrou reconstruído no final)
    const registrosAfetados = new Set();

    for (const dupId of fundirIds) {
      const t = await sequelize.transaction();
      try {
        // Vínculos já existentes do ministro canonical
        const vinculosExistentes = await sequelize.query(
          `SELECT "registroCultoId" FROM "${schema}"."registro_culto_ministro" WHERE "ministroId" = :id`,
          { replacements: { id: manterId }, type: QueryTypes.SELECT, transaction: t }
        );
        const jaVinculados = new Set(vinculosExistentes.map((v) => v.registroCultoId));

        // Vínculos do duplicado — todos precisam migrar
        const vinculosDup = await sequelize.query(
          `SELECT "registroCultoId" FROM "${schema}"."registro_culto_ministro" WHERE "ministroId" = :id`,
          { replacements: { id: dupId }, type: QueryTypes.SELECT, transaction: t }
        );

        for (const v of vinculosDup) {
          registrosAfetados.add(v.registroCultoId);
          if (!jaVinculados.has(v.registroCultoId)) {
            await sequelize.query(
              `INSERT INTO "${schema}"."registro_culto_ministro" ("ministroId","registroCultoId") VALUES (:manter,:culto)`,
              { replacements: { manter: manterId, culto: v.registroCultoId }, type: QueryTypes.INSERT, transaction: t }
            );
          }
        }

        // Remove todos os vínculos do duplicado
        await sequelize.query(
          `DELETE FROM "${schema}"."registro_culto_ministro" WHERE "ministroId" = :id`,
          { replacements: { id: dupId }, type: QueryTypes.DELETE, transaction: t }
        );

        // Deleta o ministro duplicado
        await Ministro.destroy({ where: { id: dupId }, transaction: t });

        await t.commit();
      } catch (err) {
        await t.rollback();
        throw err;
      }
    }

    // Reconstrói quemMinistrou para todos os registros afetados
    // a partir da junction table (fonte da verdade), não por REPLACE textual
    for (const registroId of registrosAfetados) {
      try {
        const ministrosDoRegistro = await sequelize.query(
          `SELECT m.nome FROM "${schema}"."ministro" m
           INNER JOIN "${schema}"."registro_culto_ministro" rcm ON rcm."ministroId" = m.id
           WHERE rcm."registroCultoId" = :registroId
           ORDER BY m.nome`,
          { replacements: { registroId }, type: QueryTypes.SELECT }
        );
        const nomes = ministrosDoRegistro.map((m) => m.nome).join(', ');
        await sequelize.query(
          `UPDATE "${schema}"."registro_culto" SET "quemMinistrou" = :nomes WHERE id = :id`,
          { replacements: { nomes, id: registroId }, type: QueryTypes.UPDATE }
        );
      } catch {
        // não crítico — dado legado
      }
    }

    return manter;
  },
};

module.exports = MinistroService;
