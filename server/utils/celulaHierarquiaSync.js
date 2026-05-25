/* eslint-disable no-await-in-loop, no-restricted-syntax */
/**
 * Sincroniza a trinca (Lideranca Apostolica, Pastor de Geracao, Pastor de Campus)
 * das celulas a partir da hierarquia do membro lider.
 *
 * Regra de quem e a Lideranca Apostolica da celula:
 *   - Se o lider tem cargo 'lideranca_apostolica' → ele mesmo
 *   - Senao → o membro apontado em leader.liderancaApostolicaMemberId
 *
 * Os pastores (PdG e PdC) vem do cadastro da LA. Se nao ha LA, caem no
 * cadastro do proprio lider como fallback.
 */

const HIERARCHY_FIELDS = ['liderancaMemberId', 'pastorGeracaoMemberId', 'pastorCampusMemberId'];

/**
 * Calcula a trinca a partir do lider, cargos do lider e (opcionalmente) o membro da LA.
 * Funcao pura — nao acessa banco.
 */
function computeCelulaHierarquiaFromLeader(leader, leaderCargos = [], laMember = null) {
  if (!leader) return { liderancaMemberId: null, pastorGeracaoMemberId: null, pastorCampusMemberId: null };

  const isItselfLa = leaderCargos.includes('lideranca_apostolica');

  let liderancaMemberId = null;
  let sourceForPastors = leader;

  if (isItselfLa) {
    liderancaMemberId = leader.id;
    sourceForPastors = leader;
  } else if (leader.liderancaApostolicaMemberId) {
    liderancaMemberId = leader.liderancaApostolicaMemberId;
    sourceForPastors = laMember || leader; // fallback no proprio lider se a LA nao foi carregada
  }

  return {
    liderancaMemberId,
    pastorGeracaoMemberId: sourceForPastors?.pastorGeracaoMemberId || null,
    pastorCampusMemberId: sourceForPastors?.pastorCampusMemberId || null
  };
}

/**
 * Decide se atualiza um campo:
 *  - Nunca grava null (evita apagar dado existente)
 *  - Vazio → preenche
 *  - Tem valor: so sobrescreve se force=true E o valor mudou
 */
function shouldUpdate(currentValue, newValue, { force }) {
  if (!newValue) return false;
  if (!currentValue) return true;
  if (force && currentValue !== newValue) return true;
  return false;
}

/**
 * Cascateia a hierarquia do lider para todas as celulas onde ele e lider.
 * @returns {{ updated: number, scanned: number, changes: object[] }}
 */
async function syncCelulasHierarquiaForLeader(leader, options = {}) {
  const {
    transaction = null,
    models,
    force = false,
    dryRun = false
  } = options;

  if (!leader || !leader.id || !models) {
    return { updated: 0, scanned: 0, changes: [] };
  }

  const { Celula, MemberCargo, Member } = models;

  const cargos = await MemberCargo.findAll({
    where: { membroId: leader.id, ativo: true },
    attributes: ['cargo'],
    transaction
  });
  const cargoStrings = cargos.map((c) => c.cargo);

  let laMember = null;
  if (!cargoStrings.includes('lideranca_apostolica') && leader.liderancaApostolicaMemberId) {
    laMember = await Member.findByPk(leader.liderancaApostolicaMemberId, {
      attributes: ['id', 'pastorGeracaoMemberId', 'pastorCampusMemberId'],
      transaction
    });
  }

  const trio = computeCelulaHierarquiaFromLeader(leader, cargoStrings, laMember);

  const celulas = await Celula.findAll({
    where: { liderMemberId: leader.id },
    attributes: ['id', 'celula', ...HIERARCHY_FIELDS],
    transaction
  });

  const changes = [];
  let updatedCount = 0;

  for (const celula of celulas) {
    const updates = {};
    for (const field of HIERARCHY_FIELDS) {
      if (shouldUpdate(celula[field], trio[field], { force })) {
        updates[field] = trio[field];
      }
    }

    if (Object.keys(updates).length > 0) {
      changes.push({
        celulaId: celula.id,
        celulaNome: celula.celula,
        updates,
        previous: {
          liderancaMemberId: celula.liderancaMemberId,
          pastorGeracaoMemberId: celula.pastorGeracaoMemberId,
          pastorCampusMemberId: celula.pastorCampusMemberId
        }
      });
      if (!dryRun) {
        // skipMemberHierarquiaSync: cascata partindo do membro, evita celula
        // tentar refletir de volta no mesmo membro (loop e transitividade).
        await celula.update(updates, { transaction, skipMemberHierarquiaSync: true });
        updatedCount += 1;
      }
    }
  }

  return { updated: updatedCount, scanned: celulas.length, changes };
}

/**
 * Sentido reverso: ao atualizar uma celula, se o cadastro do lider tem
 * algum campo de hierarquia em branco, preenche com o valor da celula.
 *
 * Mapeamento celula → membro:
 *   celula.liderancaMemberId      → membro.liderancaApostolicaMemberId
 *   celula.pastorGeracaoMemberId  → membro.pastorGeracaoMemberId
 *   celula.pastorCampusMemberId   → membro.pastorCampusMemberId
 *
 * Nao sobrescreve campos do membro que ja tem valor — so preenche vazios.
 * Pula auto-referencia (se cell.liderancaMemberId === lider.id, nao seta
 * lider.liderancaApostolicaMemberId pra ele mesmo).
 */
async function backfillLeaderHierarchyFromCelula(celula, options = {}) {
  const { transaction = null, models } = options;
  if (!celula || !celula.liderMemberId || !models) {
    return { updated: false, fields: [] };
  }

  const { Member } = models;

  const leader = await Member.findByPk(celula.liderMemberId, {
    attributes: [
      'id',
      'liderancaApostolicaMemberId',
      'pastorGeracaoMemberId',
      'pastorCampusMemberId'
    ],
    transaction
  });
  if (!leader) return { updated: false, fields: [] };

  const updates = {};

  if (celula.liderancaMemberId
      && !leader.liderancaApostolicaMemberId
      && celula.liderancaMemberId !== leader.id) {
    updates.liderancaApostolicaMemberId = celula.liderancaMemberId;
  }

  if (celula.pastorGeracaoMemberId && !leader.pastorGeracaoMemberId) {
    updates.pastorGeracaoMemberId = celula.pastorGeracaoMemberId;
  }

  if (celula.pastorCampusMemberId && !leader.pastorCampusMemberId) {
    updates.pastorCampusMemberId = celula.pastorCampusMemberId;
  }

  if (Object.keys(updates).length === 0) {
    return { updated: false, fields: [] };
  }

  await leader.update(updates, {
    transaction,
    skipCelulaHierarquiaSync: true // evita loop com o hook do Member
  });

  return { updated: true, fields: Object.keys(updates), memberId: leader.id };
}

module.exports = {
  computeCelulaHierarquiaFromLeader,
  syncCelulasHierarquiaForLeader,
  backfillLeaderHierarchyFromCelula,
  HIERARCHY_FIELDS
};
