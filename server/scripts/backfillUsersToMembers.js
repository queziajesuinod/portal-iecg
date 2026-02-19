/* eslint-disable no-console */
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

const schema = process.env.DB_SCHEMA || 'dev_iecg';
const isDryRun = process.argv.includes('--dry-run');

function determineStatus(user) {
  if (user.batizado && user.frequenta_celula) return 'MEMBRO';
  if (user.batizado) return 'CONGREGADO';
  return 'VISITANTE';
}

function mapMaritalStatus(estadoCivil) {
  if (!estadoCivil) return null;
  const normalized = String(estadoCivil).trim().toUpperCase();
  const mapping = {
    SOLTEIRO: 'SOLTEIRO',
    CASADO: 'CASADO',
    DIVORCIADO: 'DIVORCIADO',
    VIUVO: 'VIUVO',
    'VIÚVO': 'VIUVO',
    UNIAO_ESTAVEL: 'UNIAO_ESTAVEL',
    'UNIÃO_ESTAVEL': 'UNIAO_ESTAVEL',
    'UNIÃO ESTÁVEL': 'UNIAO_ESTAVEL',
    'UNIAO ESTAVEL': 'UNIAO_ESTAVEL'
  };
  return mapping[normalized] || null;
}

function mapStatusToJourneyStage(status) {
  const stageMapping = {
    VISITANTE: 'VISITANTE',
    CONGREGADO: 'CONGREGADO',
    MEMBRO: 'MEMBRO',
    INATIVO: 'VISITANTE',
    MIA: 'MIA',
    TRANSFERIDO: 'MEMBRO',
    FALECIDO: 'MEMBRO'
  };
  return stageMapping[status] || 'VISITANTE';
}

async function resolveCpfForInsert(cpf, userId, transaction) {
  const cpfTreated = cpf ? String(cpf).substring(0, 14) : null;
  if (!cpfTreated) return null;
  const existing = await sequelize.query(
    `
    SELECT id, "userId"
    FROM "${schema}"."Members"
    WHERE cpf = :cpf
    LIMIT 1
    `,
    {
      replacements: { cpf: cpfTreated },
      type: QueryTypes.SELECT,
      transaction
    }
  );
  if (!existing.length) return cpfTreated;
  if (existing[0].userId === userId) return cpfTreated;
  return null;
}

async function run() {
  const usersMissing = await sequelize.query(
    `
    SELECT u.*
    FROM "${schema}"."Users" u
    LEFT JOIN "${schema}"."Members" m ON m."userId" = u.id
    WHERE m.id IS NULL
    ORDER BY u."createdAt" ASC
    `,
    { type: QueryTypes.SELECT }
  );

  console.log(`Users sem Member: ${usersMissing.length}`);
  if (usersMissing.length === 0) {
    return;
  }

  if (isDryRun) {
    console.log('Dry-run ativo, nada será gravado.');
    return;
  }

  let createdMembers = 0;
  let createdJourneys = 0;
  let createdMilestones = 0;
  let failed = 0;

  for (const user of usersMissing) {
    const t = await sequelize.transaction();
      try {
        const status = determineStatus(user);
        const now = new Date();
        const emailUnique = user.email || `membro_${user.id.substring(0, 8)}@temp.iecg.com.br`;
        const cpfTreated = await resolveCpfForInsert(user.cpf, user.id, t);

      const [insertedMember] = await sequelize.query(
        `
        INSERT INTO "${schema}"."Members" (
          id,
          "userId",
          "fullName",
          email,
          cpf,
          "birthDate",
          "maritalStatus",
          phone,
          whatsapp,
          "zipCode",
          street,
          number,
          neighborhood,
          status,
          "statusChangeDate",
          "baptismDate",
          "membershipDate",
          "createdAt",
          "updatedAt"
        ) VALUES (
          gen_random_uuid(),
          :userId,
          :fullName,
          :email,
          :cpf,
          :birthDate,
          :maritalStatus,
          :phone,
          :whatsapp,
          :zipCode,
          :street,
          :number,
          :neighborhood,
          :status,
          :statusChangeDate,
          :baptismDate,
          :membershipDate,
          :createdAt,
          :updatedAt
        )
        ON CONFLICT ("userId") DO NOTHING
        RETURNING id, status, "createdAt", "baptismDate"
        `,
        {
          replacements: {
            userId: user.id,
            fullName: user.name || 'Nome não informado',
            email: emailUnique,
            cpf: cpfTreated,
            birthDate: user.data_nascimento,
            maritalStatus: mapMaritalStatus(user.estado_civil),
            phone: user.telefone,
            whatsapp: user.telefone,
            zipCode: user.cep,
            street: user.endereco,
            number: user.numero,
            neighborhood: user.bairro,
            status,
            statusChangeDate: user.createdAt || now,
            baptismDate: user.batizado ? (user.createdAt || now) : null,
            membershipDate: status === 'MEMBRO' ? (user.createdAt || now) : null,
            createdAt: user.createdAt || now,
            updatedAt: user.updatedAt || now
          },
          type: QueryTypes.INSERT,
          transaction: t
        }
      );

      const memberRow = insertedMember && insertedMember[0] ? insertedMember[0] : insertedMember;
      if (!memberRow || !memberRow.id) {
        await t.commit();
        continue;
      }

      createdMembers += 1;

      await sequelize.query(
        `
        INSERT INTO "${schema}"."MemberJourney" (
          id,
          "memberId",
          "currentStage",
          "stageChangedAt",
          "engagementScore",
          "lastActivityDate",
          "daysInactive",
          "healthStatus",
          "suggestedNextSteps",
          "alerts",
          "interests",
          "spiritualGifts",
          "createdAt",
          "updatedAt"
        ) VALUES (
          gen_random_uuid(),
          :memberId,
          :currentStage,
          :stageChangedAt,
          :engagementScore,
          :lastActivityDate,
          0,
          :healthStatus,
          '[]'::jsonb,
          '[]'::jsonb,
          '[]'::jsonb,
          '[]'::jsonb,
          :createdAt,
          :updatedAt
        )
        ON CONFLICT ("memberId") DO NOTHING
        `,
        {
          replacements: {
            memberId: memberRow.id,
            currentStage: mapStatusToJourneyStage(memberRow.status || status),
            stageChangedAt: memberRow.createdAt || now,
            engagementScore: 20,
            lastActivityDate: memberRow.createdAt || now,
            healthStatus: (memberRow.status || status) === 'MIA' ? 'MIA' : ((memberRow.status || status) === 'INATIVO' ? 'CRITICO' : 'SAUDAVEL'),
            createdAt: memberRow.createdAt || now,
            updatedAt: now
          },
          type: QueryTypes.INSERT,
          transaction: t
        }
      );
      createdJourneys += 1;

      await sequelize.query(
        `
        INSERT INTO "${schema}"."MemberMilestones" (
          id,
          "memberId",
          "milestoneType",
          "achievedDate",
          description,
          "createdAt"
        )
        SELECT
          gen_random_uuid(),
          :memberId,
          'PRIMEIRA_VISITA',
          :achievedDate,
          'Primeira visita à igreja',
          :createdAt
        WHERE NOT EXISTS (
          SELECT 1
          FROM "${schema}"."MemberMilestones" mm
          WHERE mm."memberId" = :memberId
            AND mm."milestoneType" = 'PRIMEIRA_VISITA'
        )
        `,
        {
          replacements: {
            memberId: memberRow.id,
            achievedDate: memberRow.createdAt || now,
            createdAt: memberRow.createdAt || now
          },
          type: QueryTypes.INSERT,
          transaction: t
        }
      );
      createdMilestones += 1;

      if (user.batizado) {
        await sequelize.query(
          `
          INSERT INTO "${schema}"."MemberMilestones" (
            id,
            "memberId",
            "milestoneType",
            "achievedDate",
            description,
            "createdAt"
          )
          SELECT
            gen_random_uuid(),
            :memberId,
            'BATISMO',
            :achievedDate,
            'Batismo nas águas',
            :createdAt
          WHERE NOT EXISTS (
            SELECT 1
            FROM "${schema}"."MemberMilestones" mm
            WHERE mm."memberId" = :memberId
              AND mm."milestoneType" = 'BATISMO'
          )
          `,
          {
            replacements: {
              memberId: memberRow.id,
              achievedDate: memberRow.baptismDate || memberRow.createdAt || now,
              createdAt: memberRow.baptismDate || memberRow.createdAt || now
            },
            type: QueryTypes.INSERT,
            transaction: t
          }
        );
      }

      await t.commit();
    } catch (error) {
      failed += 1;
      await t.rollback();
      console.error(`Erro ao migrar user ${user.id}: ${error.message}`);
      if (error.original?.detail) {
        console.error(`  detalhe: ${error.original.detail}`);
      }
    }
  }

  console.log(`Members criados: ${createdMembers}`);
  console.log(`Journeys processadas: ${createdJourneys}`);
  console.log(`Milestones processadas: ${createdMilestones}`);
  console.log(`Falhas: ${failed}`);
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
