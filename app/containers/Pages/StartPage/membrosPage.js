import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Paper, Tabs, Tab } from '@mui/material';
import {
  useQuery, useMutation, useQueryClient, keepPreviousData
} from '@tanstack/react-query';
import imageCompression from 'browser-image-compression';
import { PapperBlock, Notification } from 'dan-components';
import { useHistory } from 'react-router-dom';
import { fetchGeocode } from '../../../utils/googleGeocode';
import {
  listarMembros,
  listarMembrosDuplicados,
  criarMembro,
  atualizarMembro,
  deletarMembro,
  fundirMembrosDuplicados,
  desconsiderarMembrosDuplicados,
  buscarMembro,
  sincronizarDadosDoUser,
  notificarDadosIncompletos as notificarDadosIncompletosApi,
  adicionarCargoMembro,
  removerCargoMembro
} from '../../../api/membersApi';
import { listarCampus } from '../../../api/campusApi';
import { queryKeys } from '../../../utils/queryKeys';
import useDebouncedValue from '../../../utils/useDebouncedValue';

import {
  initialFormState,
  toFormFromMember,
  buildPayloadFromForm,
  isValidCpf,
  isValidEmail,
  INACTIVE_STATUSES
} from './members/membersHelpers';

import MembersFiltersBar from './members/MembersFiltersBar';
import MembersTable from './members/MembersTable';
import DuplicatesPanel from './members/DuplicatesPanel';
import MemberFormDialog from './members/MemberFormDialog';
import MergeConfirmDialog from './members/MergeConfirmDialog';

// Fetcher paginado server-side: a UI passa page/limit/filters; o backend devolve a fatia.
const fetchMembersPage = async ({
  page, limit, search, status, isLider
}) => {
  const params = { page, limit };
  if (search) params.search = search;
  if (status) params.status = status;
  if (isLider) params.isLider = 'true';
  const response = await listarMembros(params);
  return {
    members: Array.isArray(response?.members) ? response.members : [],
    total: Number(response?.total) || 0,
    totalPages: Number(response?.totalPages) || 1,
  };
};

// Carrega TODOS os membros em uma unica chamada — usado so como pool do select de conjuge.
// Limit alto, cache longo, ativado lazy quando o dialog em modo "Casado" precisa.
const fetchAllMembersForSelect = async () => {
  const response = await listarMembros({ page: 1, limit: 5000 });
  return Array.isArray(response?.members) ? response.members : [];
};

// Pool de membros com cargo especifico — usado nos selects de hierarquia do dialog.
const fetchMembersByCargo = async (cargo) => {
  const response = await listarMembros({ page: 1, limit: 5000, cargo });
  return Array.isArray(response?.members) ? response.members : [];
};

const fetchDuplicates = async () => {
  const payload = await listarMembrosDuplicados();
  return Array.isArray(payload) ? payload : payload?.data || [];
};

const MembrosPage = () => {
  const history = useHistory();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLiderFilter, setIsLiderFilter] = useState(false);
  const [notificandoMembro, setNotificandoMembro] = useState({});
  const [sincronizandoMembro, setSincronizandoMembro] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialFormState);
  const [geoLoading, setGeoLoading] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState('');
  const [memberEdicao, setMemberEdicao] = useState(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [mergingPairKey, setMergingPairKey] = useState('');
  const [dismissingPairKey, setDismissingPairKey] = useState('');
  const [mergeConfirmOpen, setMergeConfirmOpen] = useState(false);
  const [pendingMergeSuggestion, setPendingMergeSuggestion] = useState(null);

  const notify = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
  };

  // Debounce na busca: a query so dispara 300ms apos parar de digitar.
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  // Filtros que entram na chave da query — refetch automatico quando mudam.
  const membersParams = useMemo(() => ({
    page: page + 1, // backend e' 1-based
    limit: rowsPerPage,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    isLider: isLiderFilter || undefined,
  }), [page, rowsPerPage, debouncedSearch, statusFilter, isLiderFilter]);

  // Pagina atual de membros — server-side. placeholderData mantem a anterior visivel durante refetch.
  const membersQuery = useQuery({
    queryKey: [...queryKeys.members.list, membersParams],
    queryFn: () => fetchMembersPage(membersParams),
    placeholderData: keepPreviousData,
  });

  // Lista completa apenas para o select de conjuge — fetcheada lazy.
  const needsSpouseList = dialogOpen && form.estado_civil === 'Casado';
  const allMembersQuery = useQuery({
    queryKey: queryKeys.members.allForSelect,
    queryFn: fetchAllMembersForSelect,
    enabled: needsSpouseList,
    staleTime: 5 * 60_000,
  });

  // Listas dos cargos para os selects de hierarquia — fetcheadas lazy quando o dialog abre.
  const liderancasApostolicasQuery = useQuery({
    queryKey: queryKeys.members.byCargo('lideranca_apostolica'),
    queryFn: () => fetchMembersByCargo('lideranca_apostolica'),
    enabled: dialogOpen,
    staleTime: 5 * 60_000,
  });
  const pastoresGeracaoQuery = useQuery({
    queryKey: queryKeys.members.byCargo('pastor_geracao'),
    queryFn: () => fetchMembersByCargo('pastor_geracao'),
    enabled: dialogOpen,
    staleTime: 5 * 60_000,
  });
  const pastoresCampusQuery = useQuery({
    queryKey: queryKeys.members.byCargo('pastor_campus'),
    queryFn: () => fetchMembersByCargo('pastor_campus'),
    enabled: dialogOpen,
    staleTime: 5 * 60_000,
  });

  const duplicatesQuery = useQuery({
    queryKey: queryKeys.members.duplicates,
    queryFn: fetchDuplicates,
  });
  const campiQuery = useQuery({
    queryKey: queryKeys.campus.list,
    queryFn: listarCampus,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const pagedMembers = membersQuery.data?.members || [];
  const totalMembers = membersQuery.data?.total || 0;
  const duplicateSuggestions = duplicatesQuery.data || [];
  const campi = campiQuery.data || [];
  const loading = membersQuery.isFetching;
  const duplicatesLoading = duplicatesQuery.isLoading;

  if (membersQuery.error && membersQuery.error._reported !== true) {
    membersQuery.error._reported = true;
    setTimeout(() => notify(membersQuery.error.message || 'Erro ao carregar membros', 'error'), 0);
  }

  const invalidateMembers = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
  };

  const reloadMembersAndDuplicates = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.members.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.members.duplicates }),
  ]);

  // Atualiza um membro em TODAS as paginas cacheadas + lista do select.
  const patchMemberInCache = (memberId, patcher) => {
    queryClient.setQueriesData({ queryKey: queryKeys.members.list }, (prev) => {
      if (!prev || !Array.isArray(prev.members)) return prev;
      return {
        ...prev,
        members: prev.members.map((m) => (m.id === memberId ? patcher(m) : m)),
      };
    });
    queryClient.setQueryData(queryKeys.members.allForSelect, (prev) => (
      Array.isArray(prev) ? prev.map((m) => (m.id === memberId ? patcher(m) : m)) : prev
    ));
  };

  // Remove um membro de todas as paginas cacheadas + lista do select.
  const removeMemberFromCache = (memberId) => {
    queryClient.setQueriesData({ queryKey: queryKeys.members.list }, (prev) => {
      if (!prev || !Array.isArray(prev.members)) return prev;
      return {
        ...prev,
        members: prev.members.filter((m) => m.id !== memberId),
        total: Math.max(0, (prev.total || 0) - 1),
      };
    });
    queryClient.setQueryData(queryKeys.members.allForSelect, (prev) => (
      Array.isArray(prev) ? prev.filter((m) => m.id !== memberId) : prev
    ));
  };

  const spouseOptions = useMemo(() => (
    (allMembersQuery.data || []).filter((m) => m.id !== memberEdicao?.id)
  ), [allMembersQuery.data, memberEdicao?.id]);

  const resetForm = () => {
    setForm(initialFormState);
    setMemberEdicao(null);
    setShowWebcam(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (member) => {
    setMemberEdicao(member);
    setForm(toFormFromMember(member));
    setShowWebcam(false);
    setDialogOpen(true);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => {
      if (field === 'estado_civil' && value !== 'Casado') {
        return {
          ...prev, estado_civil: value, spouseMemberId: '', nome_esposo: ''
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const toWebpDataUrl = async (file) => {
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.35,
      maxWidthOrHeight: 900,
      fileType: 'image/webp',
      useWebWorker: true
    });
    return imageCompression.getDataUrlFromFile(compressed);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await toWebpDataUrl(file);
      handleFormChange('photoUrl', dataUrl);
      notify('Foto convertida para WEBP');
    } catch (error) {
      notify('Erro ao processar a foto', 'error');
    }
  };

  const handleCapturePhoto = async (webcamInstance) => {
    const imageSrc = webcamInstance?.getScreenshot();
    if (!imageSrc) return;
    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const file = new File([blob], 'webcam.webp', { type: 'image/webp' });
      const dataUrl = await toWebpDataUrl(file);
      handleFormChange('photoUrl', dataUrl);
      setShowWebcam(false);
      notify('Foto capturada em WEBP');
    } catch (error) {
      notify('Erro ao capturar foto', 'error');
    }
  };

  // Sincroniza cargos do membro: diff entre lista atual e desejada, dispara add/remove.
  // Falhas individuais nao bloqueiam o salvamento — sao apenas notificadas.
  const syncCargos = async (memberId, originalCargos, nextCargos) => {
    const original = new Set(originalCargos || []);
    const desired = new Set(nextCargos || []);
    const toAdd = [...desired].filter((c) => !original.has(c));
    const toRemove = [...original].filter((c) => !desired.has(c));

    const errors = [];
    await Promise.all([
      ...toAdd.map((cargo) => adicionarCargoMembro(memberId, cargo).catch((err) => errors.push({ cargo, action: 'add', err }))),
      ...toRemove.map((cargo) => removerCargoMembro(memberId, cargo).catch((err) => errors.push({ cargo, action: 'remove', err })))
    ]);
    return errors;
  };

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const originalCargos = memberEdicao?.cargos
        ? memberEdicao.cargos.map((c) => (typeof c === 'string' ? c : c?.cargo)).filter(Boolean)
        : [];
      const desiredCargos = form.cargos || [];

      let memberId;
      let mode;
      if (memberEdicao?.id) {
        await atualizarMembro(memberEdicao.id, payload);
        memberId = memberEdicao.id;
        mode = 'update';
      } else {
        const created = await criarMembro(payload);
        memberId = created?.id;
        mode = 'create';
      }

      const cargoErrors = memberId ? await syncCargos(memberId, originalCargos, desiredCargos) : [];
      return { mode, cargoErrors };
    },
    onSuccess: (result) => {
      if (result.cargoErrors?.length) {
        notify(`Membro salvo, mas houve falha ao atualizar ${result.cargoErrors.length} cargo(s).`, 'warning');
      } else {
        notify(result.mode === 'update' ? 'Membro atualizado com sucesso' : 'Membro cadastrado com sucesso');
      }
      setDialogOpen(false);
      resetForm();
      reloadMembersAndDuplicates();
    },
    onError: (error) => notify(error.message || 'Erro ao salvar membro', 'error'),
  });
  const submitting = saveMutation.isPending;

  const handleSaveMember = () => {
    if (!form.name.trim()) return notify('Nome e obrigatorio', 'warning');
    if (!isValidCpf(form.cpf)) return notify('CPF invalido. Use 000.000.000-00', 'warning');
    if (!isValidEmail(form.email)) return notify('E-mail invalido', 'warning');
    if (form.estado && form.estado.length !== 2) return notify('UF deve ter 2 caracteres', 'warning');

    const payload = buildPayloadFromForm(form);
    delete payload.statusReason;
    setMessage('');
    saveMutation.mutate(payload);
    return undefined;
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => deletarMembro(id),
    onSuccess: () => {
      notify('Membro excluido com sucesso');
      reloadMembersAndDuplicates();
    },
    onError: (error) => notify(error.message || 'Erro ao excluir membro', 'error'),
  });

  const handleDeleteMember = (member) => {
    const ok = window.confirm(`Tem certeza que deseja excluir o membro "${member.fullName}"?`);
    if (!ok) return;
    deleteMutation.mutate(member.id);
  };

  const handleMergeDuplicates = (suggestion) => {
    setPendingMergeSuggestion(suggestion);
    setMergeConfirmOpen(true);
  };

  const mergeMutation = useMutation({
    mutationFn: ({ suggestion }) => fundirMembrosDuplicados(suggestion.keepMemberId, suggestion.removeMemberId),
    onSuccess: async (_data, { suggestion, pairKey }) => {
      notify('Membros fundidos com sucesso');

      // Atualizacao otimista no cache antes de invalidar:
      queryClient.setQueryData(queryKeys.members.duplicates, (prev = []) => (
        prev.filter((s) => `${s.keepMemberId}:${s.removeMemberId}` !== pairKey)
      ));
      const updatedKeep = await buscarMembro(suggestion.keepMemberId).catch(() => null);
      removeMemberFromCache(suggestion.removeMemberId);
      if (updatedKeep) {
        patchMemberInCache(suggestion.keepMemberId, () => updatedKeep);
      }
      invalidateMembers();
    },
    onError: (error) => notify(error.message || 'Erro ao fundir membros duplicados', 'error'),
    onSettled: () => setMergingPairKey(''),
  });

  const handleMergeConfirm = () => {
    const suggestion = pendingMergeSuggestion;
    if (!suggestion) return;
    setMergeConfirmOpen(false);
    setPendingMergeSuggestion(null);

    const pairKey = `${suggestion.keepMemberId}:${suggestion.removeMemberId}`;
    setMergingPairKey(pairKey);
    setMessage('');
    mergeMutation.mutate({ suggestion, pairKey });
  };

  const dismissMutation = useMutation({
    mutationFn: ({ suggestion }) => desconsiderarMembrosDuplicados(suggestion.keepMemberId, suggestion.removeMemberId),
    onSuccess: (_data, { pairKey }) => {
      notify('Sugestao desconsiderada com sucesso');
      queryClient.setQueryData(queryKeys.members.duplicates, (prev = []) => (
        prev.filter((item) => `${item.keepMemberId}:${item.removeMemberId}` !== pairKey)
      ));
    },
    onError: (error) => notify(error.message || 'Erro ao desconsiderar sugestao', 'error'),
    onSettled: () => setDismissingPairKey(''),
  });

  const handleDismissDuplicate = (suggestion) => {
    const pairKey = `${suggestion.keepMemberId}:${suggestion.removeMemberId}`;
    setDismissingPairKey(pairKey);
    setMessage('');
    dismissMutation.mutate({ suggestion, pairKey });
  };

  const handleSpouseChange = (spouseId) => {
    const spouse = spouseOptions.find((item) => item.id === spouseId);
    setForm((prev) => ({
      ...prev,
      spouseMemberId: spouseId,
      nome_esposo: spouse ? spouse.fullName || '' : prev.nome_esposo
    }));
  };

  const handleOpenDetails = (member) => {
    history.push(`/app/start/membros/detalhes?id=${member.id}`);
  };

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, nextActive }) => atualizarMembro(id, { status: nextActive ? 'MEMBRO' : 'INATIVO' }),
    onSuccess: (_data, { id, nextActive }) => {
      patchMemberInCache(id, (m) => ({ ...m, status: nextActive ? 'MEMBRO' : 'INATIVO' }));
      notify(nextActive ? 'Membro ativado com sucesso' : 'Membro inativado com sucesso');
    },
    onError: (error) => notify(error.message || 'Erro ao atualizar status do membro', 'error'),
    onSettled: () => setUpdatingMemberId(''),
  });

  const handleToggleMemberStatus = (member, forcedActive) => {
    const activeNow = !INACTIVE_STATUSES.includes(member.status);
    const nextActive = typeof forcedActive === 'boolean' ? forcedActive : !activeNow;
    setUpdatingMemberId(member.id);
    setMessage('');
    toggleStatusMutation.mutate({ id: member.id, nextActive });
  };

  const handleCompleteAddressFromCep = async () => {
    const rawCep = (form.cep || '').replace(/\D/g, '');
    if (rawCep.length < 8) {
      notify('Informe um CEP valido para completar o endereco', 'warning');
      return;
    }
    setGeoLoading(true);
    setMessage('');
    try {
      const geocodeResult = await fetchGeocode(rawCep);
      if (!geocodeResult) {
        notify('Nenhum resultado encontrado para o CEP informado', 'info');
        return;
      }
      setForm((prev) => ({
        ...prev,
        endereco: geocodeResult.logradouro || prev.endereco,
        numero: geocodeResult.numeroEncontrado || prev.numero,
        bairro: geocodeResult.bairro || prev.bairro,
        cep: geocodeResult.cepEncontrado || prev.cep,
        cidade: geocodeResult.cidade || prev.cidade,
        estado: (geocodeResult.uf || prev.estado || '').toUpperCase()
      }));
    } finally {
      setGeoLoading(false);
    }
  };

  const sincronizarMembro = async (member) => {
    if (!member.userId) {
      notify('Membro não possui usuário vinculado.', 'error');
      return;
    }
    setSincronizandoMembro((prev) => ({ ...prev, [member.id]: true }));
    try {
      await sincronizarDadosDoUser(member.id);
      notify('Dados sincronizados com sucesso.');
      const updated = await buscarMembro(member.id);
      patchMemberInCache(member.id, (m) => ({ ...m, ...updated }));
    } catch (err) {
      notify(err.message || 'Erro ao sincronizar dados.', 'error');
    } finally {
      setSincronizandoMembro((prev) => ({ ...prev, [member.id]: false }));
    }
  };

  const notificarDadosIncompletosHandler = async (member) => {
    setNotificandoMembro((prev) => ({ ...prev, [member.id]: true }));
    try {
      await notificarDadosIncompletosApi(member.id);
      notify('Notificação enviada com sucesso.');
    } catch (err) {
      notify(err.message || 'Erro ao enviar notificação.', 'error');
    } finally {
      setNotificandoMembro((prev) => ({ ...prev, [member.id]: false }));
    }
  };

  return (
    <PapperBlock title="Membros" desc="Lista de membros">
      <Helmet>
        <title>Membros</title>
      </Helmet>

      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_event, nextTab) => setActiveTab(nextTab)}
          variant="fullWidth"
        >
          <Tab label={`Lista de membros (${totalMembers})`} />
          <Tab label={`Possiveis duplicados (${duplicateSuggestions.length})`} />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <>
          <MembersFiltersBar
            search={search}
            onSearchChange={(value) => { setSearch(value); setPage(0); }}
            statusFilter={statusFilter}
            onStatusFilterChange={(value) => { setStatusFilter(value); setPage(0); }}
            isLiderFilter={isLiderFilter}
            onToggleLiderFilter={() => { setIsLiderFilter((v) => !v); setPage(0); }}
            onCreate={handleOpenCreate}
          />
          <MembersTable
            pagedMembers={pagedMembers}
            totalCount={totalMembers}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={(value) => { setRowsPerPage(value); setPage(0); }}
            loading={loading}
            updatingMemberId={updatingMemberId}
            notificandoMembro={notificandoMembro}
            sincronizandoMembro={sincronizandoMembro}
            onToggleStatus={handleToggleMemberStatus}
            onNotifyIncomplete={notificarDadosIncompletosHandler}
            onSyncMember={sincronizarMembro}
            onOpenDetails={handleOpenDetails}
            onOpenEdit={handleOpenEdit}
            onDeleteMember={handleDeleteMember}
          />
        </>
      )}

      {activeTab === 1 && (
        <DuplicatesPanel
          suggestions={duplicateSuggestions}
          loading={duplicatesLoading}
          onReload={() => duplicatesQuery.refetch()}
          onMerge={handleMergeDuplicates}
          onDismiss={handleDismissDuplicate}
          mergingPairKey={mergingPairKey}
          dismissingPairKey={dismissingPairKey}
        />
      )}

      <MemberFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        isEditing={!!memberEdicao}
        form={form}
        onFormChange={handleFormChange}
        campi={campi}
        spouseOptions={spouseOptions}
        onSpouseChange={handleSpouseChange}
        liderancasApostolicas={liderancasApostolicasQuery.data || []}
        pastoresGeracao={pastoresGeracaoQuery.data || []}
        pastoresCampus={pastoresCampusQuery.data || []}
        showWebcam={showWebcam}
        setShowWebcam={setShowWebcam}
        onFileUpload={handleFileUpload}
        onCapturePhoto={handleCapturePhoto}
        geoLoading={geoLoading}
        onCompleteAddressFromCep={handleCompleteAddressFromCep}
        submitting={submitting}
        onSave={handleSaveMember}
      />

      <Notification
        open={!!message}
        message={message || ''}
        type={messageType}
        close={() => setMessage('')}
      />

      <MergeConfirmDialog
        open={mergeConfirmOpen}
        suggestion={pendingMergeSuggestion}
        onClose={() => { setMergeConfirmOpen(false); setPendingMergeSuggestion(null); }}
        onConfirm={handleMergeConfirm}
      />
    </PapperBlock>
  );
};

export default MembrosPage;
