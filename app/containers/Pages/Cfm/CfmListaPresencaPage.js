/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getListaPresencaImpressao } from '../../../api/cfmApi';

const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function parseDt(d) {
  if (!d) {
    return {
      ano: '', mes: '', dia: '', mesAbr: ''
    };
  }
  const [ano, mes, dia] = d.split('-');
  return {
    ano, mes: parseInt(mes, 10), dia: parseInt(dia, 10), mesAbr: MESES_PT[parseInt(mes, 10) - 1]
  };
}

function fmtPeriodo(ini, fim) {
  if (!ini && !fim) return '';
  const i = parseDt(ini);
  const f = parseDt(fim);
  const pI = ini ? `${i.dia}/${i.mes < 10 ? `0${i.mes}` : i.mes}/${i.ano}` : '';
  const pF = fim ? `${f.dia}/${f.mes < 10 ? `0${f.mes}` : f.mes}/${f.ano}` : '';
  return [pI, pF].filter(Boolean).join(' – ');
}

const S = {
  page: {
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '11px',
    background: '#fff',
    color: '#111',
    padding: '16px 20px',
    maxWidth: '100%',
  },
  toolbar: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    alignItems: 'center',
  },
  btnPrint: {
    background: '#1a1a1a',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 20px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  btnBack: {
    background: '#f0f0f0',
    color: '#333',
    border: '1px solid #ccc',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  block: {
    marginBottom: '36px',
  },
  header: {
    border: '2px solid #111',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '4px',
  },
  headerTop: {
    background: '#1a1a1a',
    color: '#fff',
    textAlign: 'center',
    padding: '6px 10px',
  },
  headerTopSub: {
    fontSize: '9px',
    letterSpacing: '3px',
    textTransform: 'uppercase',
    color: '#d4a017',
    fontWeight: '700',
    marginBottom: '2px',
  },
  headerTopTitle: {
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '1px',
  },
  headerInfo: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2px 24px',
    padding: '6px 12px',
    borderTop: '1px solid #ccc',
    fontSize: '11px',
  },
  infoRow: {
    display: 'flex',
    gap: '4px',
  },
  infoLabel: { fontWeight: '700', whiteSpace: 'nowrap' },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '10px',
    tableLayout: 'auto',
  },
  th: {
    border: '1px solid #bbb',
    padding: '2px 3px',
    textAlign: 'center',
    background: '#f2f2f2',
    fontWeight: '700',
    whiteSpace: 'nowrap',
    fontSize: '9px',
  },
  thLabel: {
    border: '1px solid #bbb',
    padding: '2px 4px',
    textAlign: 'left',
    background: '#f2f2f2',
    fontWeight: '700',
    fontSize: '9px',
  },
  thNum: {
    border: '1px solid #bbb',
    padding: '2px 3px',
    textAlign: 'center',
    background: '#f2f2f2',
    fontWeight: '700',
    fontSize: '9px',
    width: '24px',
    minWidth: '24px',
  },
  thFaltas: {
    border: '1px solid #bbb',
    padding: '2px 4px',
    textAlign: 'center',
    background: '#f2f2f2',
    fontWeight: '700',
    fontSize: '9px',
    whiteSpace: 'nowrap',
  },
  td: {
    border: '1px solid #ccc',
    padding: '2px 3px',
    textAlign: 'center',
    fontSize: '10px',
    height: '18px',
  },
  tdName: {
    border: '1px solid #ccc',
    padding: '2px 6px',
    textAlign: 'left',
    fontSize: '10px',
    height: '18px',
    whiteSpace: 'nowrap',
  },
  tdNum: {
    border: '1px solid #ccc',
    padding: '2px 3px',
    textAlign: 'center',
    fontSize: '10px',
    height: '18px',
    width: '24px',
  },
  tdFaltas: {
    border: '1px solid #ccc',
    padding: '2px 4px',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: '10px',
    height: '18px',
  },
};

function MateriaBlock({ mat, turma, isLast }) {
  const periodo = fmtPeriodo(mat.periodoInicio || turma.periodoInicio, mat.periodoFim || turma.periodoFim);
  const pageBreak = isLast ? 'auto' : 'always';

  return (
    <div style={{ ...S.block, pageBreakAfter: pageBreak }}>
      {/* Cabeçalho */}
      <div style={S.header}>
        <div style={S.headerTop}>
          <div style={S.headerTopSub}>Centro de Formação Ministerial</div>
          <div style={S.headerTopTitle}>Lista de Presença</div>
        </div>
        <div style={S.headerInfo}>
          <div style={S.infoRow}><span style={S.infoLabel}>Saber:</span><span>{mat.materiaNome}</span></div>
          <div style={S.infoRow}><span style={S.infoLabel}>Turma:</span><span>{turma.numeracao}</span></div>
          <div style={S.infoRow}><span style={S.infoLabel}>Escola:</span><span>{turma.escola}</span></div>
          <div style={S.infoRow}><span style={S.infoLabel}>Mestre:</span><span>{mat.mestre || '—'}</span></div>
          {turma.modulo && <div style={S.infoRow}><span style={S.infoLabel}>Módulo:</span><span>{turma.modulo}</span></div>}
          {periodo && <div style={S.infoRow}><span style={S.infoLabel}>Período:</span><span>{periodo}</span></div>}
          {turma.campus && <div style={S.infoRow}><span style={S.infoLabel}>Campus:</span><span>{turma.campus}</span></div>}
          <div style={S.infoRow}><span style={S.infoLabel}>Total de Aulas:</span><span>{mat.aulas.length}</span></div>
        </div>
      </div>

      {mat.aulas.length === 0 ? (
        <div style={{
          padding: '12px', border: '1px solid #ccc', color: '#888', textAlign: 'center', fontSize: '11px'
        }}>
          Nenhuma aula cadastrada para esta matéria.
        </div>
      ) : (
        <table style={S.table}>
          <thead>
            {/* Linha Mês */}
            <tr>
              <th style={S.thLabel} rowSpan={3}>Alunos</th>
              <th style={{ ...S.thNum, fontSize: '8px' }} rowSpan={3}>Nº</th>
              {mat.aulas.map(a => {
                const { mes } = parseDt(a.dataAula);
                return <th key={a.id} style={S.th}>{mes}</th>;
              })}
            </tr>
            {/* Linha Dia */}
            <tr>
              {mat.aulas.map(a => {
                const { dia } = parseDt(a.dataAula);
                return <th key={a.id} style={S.th}>{dia}</th>;
              })}
            </tr>
            {/* Linha Aula */}
            <tr>
              {mat.aulas.map(a => (
                <th key={a.id} style={S.th}>{a.numero}</th>
              ))}
            </tr>
            {/* Sub-header: labels */}
            <tr>
              <th style={{ ...S.thLabel, fontSize: '8px', color: '#666' }}>Nome completo</th>
              <th style={{ ...S.thNum, fontSize: '7px', color: '#666' }}>Nº</th>
              {mat.aulas.map(a => {
                const { mesAbr } = parseDt(a.dataAula);
                return <th key={a.id} style={{ ...S.th, fontSize: '7px', color: '#666' }}>{mesAbr}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {mat.alunos.map((aluno, i) => (
              <tr key={aluno.numero} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={S.tdName}>{aluno.nome}</td>
                <td style={S.tdNum}>{aluno.numero}</td>
                {aluno.marcas.map((marca, j) => (
                  <td
                    key={j}
                    style={{
                      ...S.td,
                      color: marca === 'F' ? '#cc0000' : '#333',
                      fontWeight: marca === 'F' ? '700' : 'normal',
                    }}
                  >
                    {marca === 'P' ? '·' : marca === 'F' ? 'F' : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {/* Rodapé: linha de mês repetida como no PDF */}
          <tfoot>
            <tr>
              <th style={{ ...S.thLabel, fontSize: '8px', color: '#666' }}>Mês:</th>
              <th style={S.thNum} />
              {mat.aulas.map(a => {
                const { mes } = parseDt(a.dataAula);
                return <th key={a.id} style={{ ...S.th, fontSize: '8px', color: '#666' }}>{mes}</th>;
              })}
            </tr>
          </tfoot>
        </table>
      )}

      {/* Assinaturas */}
      <div style={{
        display: 'flex', gap: '40px', marginTop: '20px', paddingTop: '12px'
      }}>
        <div style={{
          flex: 1, borderTop: '1px solid #333', paddingTop: '4px', fontSize: '10px', color: '#555'
        }}>
          Assinatura do Mestre
        </div>
        <div style={{
          flex: 1, borderTop: '1px solid #333', paddingTop: '4px', fontSize: '10px', color: '#555'
        }}>
          Assinatura da Coordenação
        </div>
        <div style={{
          flex: 1, borderTop: '1px solid #333', paddingTop: '4px', fontSize: '10px', color: '#555'
        }}>
          Data
        </div>
      </div>
    </div>
  );
}

export default function CfmListaPresencaPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getListaPresencaImpressao(id)
      .then(setData)
      .catch(e => setError(e.response?.data?.erro || e.message || 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{
        padding: '60px', textAlign: 'center', fontFamily: 'Arial, sans-serif', color: '#555'
      }}>
        Carregando lista de presença…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', color: '#c00' }}>
        Erro: {error}
      </div>
    );
  }

  if (!data) return null;

  const { turma, materias } = data;

  return (
    <div style={S.page}>
      {/* Barra de ações — oculta na impressão */}
      <div className="cfm-lista-toolbar" style={S.toolbar}>
        <button style={S.btnPrint} onClick={() => window.print()}>
          Imprimir
        </button>
        <button style={S.btnBack} onClick={() => window.history.back()}>
          Voltar
        </button>
        <span style={{ color: '#888', fontSize: '12px' }}>
          {turma.escola} · Turma {turma.numeracao} · {materias.length} matéria(s)
        </span>
      </div>

      {materias.length === 0 && (
        <div style={{ padding: '20px', color: '#888', fontFamily: 'Arial, sans-serif' }}>
          Nenhuma matéria cadastrada nesta turma.
        </div>
      )}

      {materias.map((mat, idx) => (
        <MateriaBlock
          key={mat.turmaMateriaId}
          mat={mat}
          turma={turma}
          isLast={idx === materias.length - 1}
        />
      ))}

      <style>{`
        @media print {
          .cfm-lista-toolbar { display: none !important; }
          body { background: white !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        @page { margin: 12mm 10mm; size: A4 landscape; }
      `}</style>
    </div>
  );
}
