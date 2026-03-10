import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  ContentState,
  EditorState,
  convertFromHTML,
  convertToRaw
} from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import { PapperBlock, Notification } from 'dan-components';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { Editor } from 'react-draft-wysiwyg';
import brand from 'dan-api/dummy/brand';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import {
  approveBoardJournalMember,
  approveBoardSubmission,
  createBoardJournal,
  createBoardBadge,
  createBoardCategory,
  createBoardChallenge,
  deleteBoardBadge,
  deleteBoardCategory,
  deleteBoardChallenge,
  deleteBoardJournalMember,
  listBoardBadges,
  listBoardCategories,
  listBoardChallenges,
  listBoardJournals,
  listBoardJournalMembers,
  listSystemUsers,
  listPendingBoardSubmissions,
  rejectBoardJournalMember,
  rejectBoardSubmission,
  updateBoardJournal,
  updateBoardBadge,
  updateBoardCategory,
  updateBoardChallenge
} from '../../../api/boardJournalApi';
import { getStoredPermissions } from '../../../utils/permissions';

const FORM_FIELD_TYPES = [
  { value: 'text', label: 'Texto curto' },
  { value: 'textarea', label: 'Texto longo' },
  { value: 'number', label: 'Numero' },
  { value: 'date', label: 'Data' },
  { value: 'select', label: 'Selecao' },
  { value: 'checkbox', label: 'Checklist' }
];

const CHALLENGE_TYPE_OPTIONS = [
  { value: 'text', label: 'Texto' },
  { value: 'question', label: 'Pergunta' },
  { value: 'file', label: 'Arquivo/Link' },
  { value: 'form', label: 'Formulario' },
  { value: 'lesson', label: 'Licao guiada' }
];

const BADGE_TYPE_OPTIONS = [
  { value: 'achievement', label: 'Conquista' },
  { value: 'level', label: 'Nivel' },
  { value: 'special', label: 'Especial' }
];

const CATEGORY_ICON_SUGGESTIONS = [
  { value: 'ion-ios-book-outline', label: 'Livro' },
  { value: 'ion-ios-people-outline', label: 'Grupo' },
  { value: 'ion-ios-heart-outline', label: 'Cuidado' },
  { value: 'ion-ios-bulb-outline', label: 'Ideia' },
  { value: 'ion-ios-flame-outline', label: 'Intenso' },
  { value: 'ion-ios-star-outline', label: 'Destaque' },
  { value: 'ion-ios-compose-outline', label: 'Escrita' },
  { value: 'ion-ios-briefcase-outline', label: 'Servico' }
];

const BADGE_ICON_SUGGESTIONS = [
  { value: 'ion-trophy', label: 'Trofeu' },
  { value: 'ion-ribbon-a', label: 'Faixa' },
  { value: 'ion-star', label: 'Estrela' },
  { value: 'ion-medal', label: 'Medalha' },
  { value: 'ion-ios-flame', label: 'Sequencia' },
  { value: 'ion-ios-thunderbolt', label: 'Impacto' },
  { value: 'ion-happy-outline', label: 'Conquista' },
  { value: 'ion-checkmark-circled', label: 'Completo' }
];
const emptyCategory = {
  id: null,
  journalId: '',
  name: '',
  description: '',
  icon: '',
  color: '#D4AF37'
};

const emptyBadge = {
  id: null,
  journalId: '',
  name: '',
  description: '',
  icon: '',
  pointsRequired: '',
  badgeType: 'achievement',
  isActive: true
};

const emptyJournal = {
  id: null,
  name: '',
  description: '',
  coverImageUrl: '',
  instructions: '',
  managerUserId: '',
  isActive: true
};

const ADMIN_TABS = [
  { value: 'journals', label: 'Diarios' },
  { value: 'categories', label: 'Categorias' },
  { value: 'challenges', label: 'Desafios' },
  { value: 'approvals', label: 'Aprovacoes' },
  { value: 'badges', label: 'Badges' }
];

const MANAGER_TABS = [
  { value: 'categories', label: 'Categorias' },
  { value: 'challenges', label: 'Desafios' },
  { value: 'badges', label: 'Badges' }
];

const VALID_MANAGER_PROFILE_NAMES = ['START', 'ADMIN', 'ADMINISTRADOR'];
const VALID_MANAGER_PERMISSION_NAMES = ['DIARIO_BORDO_MANAGER', 'DIARIO_BORDO_ADMIN', 'ADMIN_FULL_ACCESS'];

function slugifyFieldName(value, index = 0) {
  const base = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return base || `campo_${index + 1}`;
}

function buildFormField(type = 'text', index = 0) {
  return {
    uiId: `field_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: `campo_${index + 1}`,
    label: 'Novo campo',
    type,
    required: false,
    options: type === 'select' ? ['Opcao 1'] : []
  };
}

function normalizeExistingFormFields(fields = []) {
  return (Array.isArray(fields) ? fields : []).map((field, index) => ({
    uiId: `field_existing_${index}_${Math.random().toString(36).slice(2, 8)}`,
    name: field.name || `campo_${index + 1}`,
    label: field.label || `Campo ${index + 1}`,
    type: FORM_FIELD_TYPES.some((option) => option.value === field.type) ? field.type : 'text',
    required: Boolean(field.required),
    options: Array.isArray(field.options) ? field.options.filter(Boolean) : []
  }));
}

function serializeFormFields(fields = []) {
  return fields.map((field, index) => ({
    name: slugifyFieldName(field.name || field.label, index),
    label: String(field.label || '').trim() || `Campo ${index + 1}`,
    type: FORM_FIELD_TYPES.some((option) => option.value === field.type) ? field.type : 'text',
    required: Boolean(field.required),
    options: field.type === 'select'
      ? (Array.isArray(field.options) ? field.options : []).map((option) => String(option || '').trim()).filter(Boolean)
      : []
  }));
}

function sanitizeRichHtml(value) {
  const html = String(value || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');

  return { __html: html };
}

function createEditorStateFromHtml(value) {
  const html = String(value || '').trim();
  if (!html) {
    return EditorState.createEmpty();
  }

  const blocks = convertFromHTML(html);
  const contentState = ContentState.createFromBlockArray(
    blocks.contentBlocks,
    blocks.entityMap
  );
  return EditorState.createWithContent(contentState);
}

function getChallengeTypeLabel(challengeType) {
  if (challengeType === 'question') return 'Pergunta';
  if (challengeType === 'file') return 'Arquivo';
  if (challengeType === 'form') return 'Formulario';
  if (challengeType === 'lesson') return 'Licao guiada';
  return 'Texto';
}

function normalizeProfileName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function extractUserProfileNames(user = {}) {
  const directProfile = user?.Perfil ? [user.Perfil] : [];
  const joinedProfiles = Array.isArray(user?.perfis) ? user.perfis : [];
  return [...directProfile, ...joinedProfiles]
    .map((perfil) => normalizeProfileName(perfil?.descricao))
    .filter(Boolean);
}

function extractUserPermissionNames(user = {}) {
  return (Array.isArray(user?.permissoesDiretas) ? user.permissoesDiretas : [])
    .map((permissao) => String(permissao?.nome || '').trim().toUpperCase())
    .filter(Boolean);
}

const emptyChallenge = {
  id: null,
  journalId: '',
  title: '',
  description: '',
  contentHtml: '',
  points: 10,
  allowSecondChance: false,
  secondChancePoints: '',
  categoryId: '',
  challengeType: 'text',
  questionText: '',
  questionOptionsText: '',
  fileTypes: '',
  formFields: [buildFormField('text', 0)],
  dueDate: '',
  isActive: true
};

function BoardJournalAdminPage() {
  const [tab, setTab] = useState(() => {
    const permissions = getStoredPermissions();
    return permissions.includes('ADMIN_FULL_ACCESS') || permissions.includes('DIARIO_BORDO_ADMIN')
      ? 'journals'
      : 'categories';
  });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  const [journals, setJournals] = useState([]);
  const [managerUsers, setManagerUsers] = useState([]);
  const [journalMembers, setJournalMembers] = useState([]);
  const [selectedJournalId, setSelectedJournalId] = useState('');
  const [categories, setCategories] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [badges, setBadges] = useState([]);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [journalForm, setJournalForm] = useState(emptyJournal);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [badgeForm, setBadgeForm] = useState(emptyBadge);
  const [challengeForm, setChallengeForm] = useState(emptyChallenge);
  const [challengeCategoryOptions, setChallengeCategoryOptions] = useState([]);
  const [reviewItem, setReviewItem] = useState(null);
  const [reviewAction, setReviewAction] = useState('approve');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [approvalCategoryFilter, setApprovalCategoryFilter] = useState('all');
  const [approvalChallengeFilter, setApprovalChallengeFilter] = useState('all');
  const [approvalUserFilter, setApprovalUserFilter] = useState('');
  const [journalOpen, setJournalOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [badgeOpen, setBadgeOpen] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [journalInstructionsEditorState, setJournalInstructionsEditorState] = useState(() => EditorState.createEmpty());
  const [lessonEditorState, setLessonEditorState] = useState(() => EditorState.createEmpty());
  const [detailItem, setDetailItem] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const title = `${brand.name} - Diario de Bordo Administrativo`;
  const storedPermissions = useMemo(() => getStoredPermissions(), []);
  const hasBoardAdminPermission = useMemo(
    () => storedPermissions.includes('ADMIN_FULL_ACCESS') || storedPermissions.includes('DIARIO_BORDO_ADMIN'),
    [storedPermissions]
  );
  const availableTabs = useMemo(
    () => (hasBoardAdminPermission ? ADMIN_TABS : MANAGER_TABS),
    [hasBoardAdminPermission]
  );
  const managerLockedJournalId = useMemo(
    () => (!hasBoardAdminPermission ? journals[0]?.id || '' : ''),
    [hasBoardAdminPermission, journals]
  );
  const eligibleManagerUsers = useMemo(
    () => managerUsers.filter((user) => {
      if (user?.active === false) return false;
      const profileNames = extractUserProfileNames(user);
      const permissionNames = extractUserPermissionNames(user);
      const hasValidProfile = profileNames.some((profileName) => VALID_MANAGER_PROFILE_NAMES.includes(profileName));
      const hasValidPermission = permissionNames.some((permissionName) => VALID_MANAGER_PERMISSION_NAMES.includes(permissionName));
      return hasValidProfile || hasValidPermission;
    }),
    [managerUsers]
  );
  const formPreviewFields = useMemo(() => serializeFormFields(challengeForm.formFields || []), [challengeForm.formFields]);
  const pendingJournalMembers = useMemo(() => journalMembers.filter((item) => item.status === 'pending'), [journalMembers]);
  const approvedJournalMembers = useMemo(() => journalMembers.filter((item) => item.status === 'approved'), [journalMembers]);
  const selectedJournal = journals.find((item) => item.id === selectedJournalId) || null;
  const filteredPendingSubmissions = useMemo(() => {
    const userFilter = approvalUserFilter.trim().toLowerCase();

    return pendingSubmissions.filter((item) => {
      const matchesCategory = approvalCategoryFilter === 'all'
        || String(item.challenge?.category?.id || '') === String(approvalCategoryFilter);
      const matchesChallenge = approvalChallengeFilter === 'all'
        || String(item.challenge?.id || '') === String(approvalChallengeFilter);
      const userName = String(item.user?.name || '').toLowerCase();
      const userEmail = String(item.user?.email || '').toLowerCase();
      const matchesUser = !userFilter
        || userName.includes(userFilter)
        || userEmail.includes(userFilter);
      return matchesCategory && matchesChallenge && matchesUser;
    });
  }, [approvalCategoryFilter, approvalChallengeFilter, approvalUserFilter, pendingSubmissions]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [journalRows, userRows] = await Promise.all([
        listBoardJournals({ scope: 'management' }),
        hasBoardAdminPermission ? listSystemUsers() : Promise.resolve([])
      ]);
      const nextJournals = Array.isArray(journalRows) ? journalRows : [];
      const nextUsers = Array.isArray(userRows) ? userRows : [];
      const preferredManagerJournalId = !hasBoardAdminPermission
        ? (nextJournals.find((item) => item.isActive !== false)?.id || nextJournals?.[0]?.id || '')
        : '';
      const nextSelectedJournalId = hasBoardAdminPermission
        ? (nextJournals.some((item) => item.id === selectedJournalId)
          ? selectedJournalId
          : nextJournals?.[0]?.id || '')
        : preferredManagerJournalId;

      setJournals(nextJournals);
      setManagerUsers(nextUsers);

      if (selectedJournalId !== nextSelectedJournalId) {
        setSelectedJournalId(nextSelectedJournalId);
      }

      if (!nextSelectedJournalId) {
        setJournalMembers([]);
        setCategories([]);
        setChallenges([]);
        setBadges([]);
        setPendingSubmissions([]);
        return;
      }

      const [categoryRows, challengeRows, badgeRows, memberRows, pendingRows] = await Promise.all([
        listBoardCategories(nextSelectedJournalId),
        listBoardChallenges({ journalId: nextSelectedJournalId, includeInactive: true }),
        listBoardBadges(nextSelectedJournalId),
        hasBoardAdminPermission ? listBoardJournalMembers(nextSelectedJournalId) : Promise.resolve([]),
        hasBoardAdminPermission ? listPendingBoardSubmissions({ journalId: nextSelectedJournalId }) : Promise.resolve([])
      ]);
      setJournalMembers(memberRows || []);
      setCategories(categoryRows || []);
      setChallenges(challengeRows || []);
      setBadges(badgeRows || []);
      setPendingSubmissions(pendingRows || []);
    } catch (error) {
      setNotification(error.message || 'Erro ao carregar Diario de Bordo administrativo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedJournalId, hasBoardAdminPermission]);

  useEffect(() => {
    if (!availableTabs.some((item) => item.value === tab)) {
      setTab(availableTabs[0]?.value || 'categories');
    }
  }, [availableTabs, tab]);

  useEffect(() => {
    let active = true;

    const loadChallengeCategories = async () => {
      const journalId = challengeForm.journalId || selectedJournalId;
      if (!journalId) {
        if (active) setChallengeCategoryOptions([]);
        return;
      }

      try {
        const rows = await listBoardCategories(journalId);
        if (active) {
          setChallengeCategoryOptions(rows || []);
        }
      } catch (_error) {
        if (active) {
          setChallengeCategoryOptions([]);
        }
      }
    };

    loadChallengeCategories();
    return () => {
      active = false;
    };
  }, [challengeForm.journalId, selectedJournalId]);

  const resetJournal = () => {
    setJournalForm(emptyJournal);
    setJournalInstructionsEditorState(EditorState.createEmpty());
    setJournalOpen(false);
  };

  const resetCategory = () => {
    setCategoryForm({ ...emptyCategory, journalId: selectedJournalId || '' });
    setCategoryOpen(false);
  };

  const resetBadge = () => {
    setBadgeForm({ ...emptyBadge, journalId: selectedJournalId || '' });
    setBadgeOpen(false);
  };

  const resetChallenge = () => {
    setChallengeForm({
      ...emptyChallenge,
      journalId: selectedJournalId || '',
      formFields: [buildFormField('text', 0)]
    });
    setLessonEditorState(EditorState.createEmpty());
    setChallengeOpen(false);
  };

  const saveCategory = async () => {
    try {
      const journalId = hasBoardAdminPermission
        ? (categoryForm.journalId || selectedJournalId)
        : managerLockedJournalId;
      if (!journalId) {
        setNotification('Selecione um diario');
        return;
      }
      if (categoryForm.id) {
        await updateBoardCategory(categoryForm.id, { ...categoryForm, journalId });
      } else {
        await createBoardCategory({ ...categoryForm, journalId });
      }
      setNotification('Categoria salva');
      resetCategory();
      loadData();
    } catch (error) {
      setNotification(error.message);
    }
  };

  const saveBadge = async () => {
    try {
      const journalId = hasBoardAdminPermission
        ? (badgeForm.journalId || selectedJournalId)
        : managerLockedJournalId;
      if (!journalId) {
        setNotification('Selecione um diario');
        return;
      }
      const payload = {
        ...badgeForm,
        journalId,
        pointsRequired: badgeForm.pointsRequired === '' ? null : Number(badgeForm.pointsRequired)
      };
      if (badgeForm.id) {
        await updateBoardBadge(badgeForm.id, payload);
      } else {
        await createBoardBadge(payload);
      }
      setNotification('Badge salvo');
      resetBadge();
      loadData();
    } catch (error) {
      setNotification(error.message);
    }
  };

  const saveChallenge = async () => {
    try {
      const journalId = hasBoardAdminPermission
        ? (challengeForm.journalId || selectedJournalId)
        : managerLockedJournalId;
      if (!journalId) {
        setNotification('Selecione um diario');
        return;
      }
      const payload = {
        journalId,
        title: challengeForm.title,
        description: challengeForm.description,
        contentHtml: challengeForm.contentHtml,
        points: Number(challengeForm.points),
        allowSecondChance: challengeForm.allowSecondChance,
        secondChancePoints: challengeForm.allowSecondChance ? challengeForm.secondChancePoints : null,
        categoryId: challengeForm.categoryId,
        challengeType: challengeForm.challengeType,
        questionText: challengeForm.questionText,
        questionOptions: challengeForm.questionOptionsText.split('\n').map((item) => item.trim()).filter(Boolean),
        fileTypes: challengeForm.fileTypes,
        formSchema: ['form', 'lesson'].includes(challengeForm.challengeType) ? serializeFormFields(challengeForm.formFields || []) : [],
        dueDate: challengeForm.dueDate || null,
        isActive: challengeForm.isActive
      };

      if (['form', 'lesson'].includes(challengeForm.challengeType) && payload.formSchema.length === 0) {
        setNotification(challengeForm.challengeType === 'lesson' ? 'Adicione pelo menos uma atividade final na licao' : 'Adicione pelo menos um campo ao formulario');
        return;
      }

      if (challengeForm.challengeType === 'lesson' && !String(challengeForm.contentHtml || '').trim()) {
        setNotification('Preencha o conteudo HTML da licao');
        return;
      }

      if (challengeForm.id) {
        await updateBoardChallenge(challengeForm.id, payload);
      } else {
        await createBoardChallenge(payload);
      }
      setNotification('Desafio salvo');
      resetChallenge();
      loadData();
    } catch (error) {
      setNotification(error.message || 'Erro ao salvar desafio');
    }
  };

  const submitReview = async () => {
    try {
      if (reviewAction === 'approve') {
        await approveBoardSubmission(reviewItem.id, reviewFeedback);
      } else {
        await rejectBoardSubmission(reviewItem.id, reviewFeedback);
      }
      setNotification('Revisao salva');
      setReviewOpen(false);
      loadData();
    } catch (error) {
      setNotification(error.message);
    }
  };

  const saveJournal = async () => {
    try {
      if (journalForm.id) {
        await updateBoardJournal(journalForm.id, journalForm);
      } else {
        await createBoardJournal(journalForm);
      }
      setNotification('Diario salvo');
      resetJournal();
      loadData();
    } catch (error) {
      setNotification(error.message || 'Erro ao salvar diario');
    }
  };

  const openReviewDialog = (item, action) => {
    setReviewItem(item);
    setReviewAction(action);
    setReviewFeedback(item?.feedback || '');
    setReviewOpen(true);
  };

  const openDetailDialog = (item) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  const renderSubmissionSummary = (item) => {
    if (!item) return '-';

    if (item.responseFileUrl) {
      return 'Arquivo/link enviado';
    }

    if (item.challenge?.challengeType === 'form' || item.challenge?.challengeType === 'lesson') {
      const fields = Array.isArray(item.challenge?.formSchema) ? item.challenge.formSchema : [];
      const answeredCount = fields.filter((field) => {
        const value = item.responsePayload?.[field.name];
        if (field.type === 'checkbox') return Boolean(value);
        return value !== undefined && value !== null && String(value).trim() !== '';
      }).length;
      return item.challenge?.challengeType === 'lesson'
        ? `${answeredCount || 0} etapa(s) concluidas`
        : `${answeredCount || 0} resposta(s) em formulario`;
    }

    const text = String(item.responseText || '').trim();
    if (!text) return '-';
    return text.length > 80 ? `${text.slice(0, 80)}...` : text;
  };

  const renderSubmissionResponse = (item) => {
    if (!item) return '-';

    if (item.responseFileUrl) {
      return (
        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
          {item.responseFileUrl}
        </Typography>
      );
    }

    if (item.challenge?.challengeType === 'form' || item.challenge?.challengeType === 'lesson') {
      const fields = Array.isArray(item.challenge?.formSchema) ? item.challenge.formSchema : [];
      const payload = item.responsePayload && typeof item.responsePayload === 'object'
        ? item.responsePayload
        : {};

      return (
        <Stack spacing={1}>
          {fields.map((field, index) => {
            const fieldName = field?.name || `field_${index}`;
            const label = field?.label || fieldName;
            const value = payload[fieldName];
            return (
              <Box key={`${fieldName}_${index}`} sx={{ p: 1, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 1 }}>
                <Typography variant="caption" color="textSecondary">{label}</Typography>
                <Typography variant="body2">{field?.type === 'checkbox' ? (value ? 'Concluido' : 'Nao concluido') : (value || '-')}</Typography>
              </Box>
            );
          })}
          {!fields.length && (
            <Typography variant="body2">{item.responseText || '-'}</Typography>
          )}
        </Stack>
      );
    }

    return (
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {item.responseText || '-'}
      </Typography>
    );
  };

  const renderIconSuggestions = (titleText, selectedIcon, suggestions, onSelect) => (
    <Box>
      <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>
        {titleText}
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {suggestions.map((option) => (
          <Button
            key={option.value}
            size="small"
            variant={selectedIcon === option.value ? 'contained' : 'outlined'}
            onClick={() => onSelect(option.value)}
            startIcon={<i className={option.value} />}
            sx={{ textTransform: 'none' }}
          >
            {option.label}
          </Button>
        ))}
      </Stack>
    </Box>
  );

  const addFormField = (type = 'text') => {
    setChallengeForm((prev) => ({
      ...prev,
      formFields: [...(prev.formFields || []), buildFormField(type, prev.formFields.length)]
    }));
  };

  const updateFormField = (uiId, patch) => {
    setChallengeForm((prev) => ({
      ...prev,
      formFields: (prev.formFields || []).map((field, index) => {
        if (field.uiId !== uiId) return field;
        const nextField = { ...field, ...patch };
        if (Object.prototype.hasOwnProperty.call(patch, 'label') && (!field.name || field.name === slugifyFieldName(field.label, index))) {
          nextField.name = slugifyFieldName(patch.label, index);
        }
        return nextField;
      })
    }));
  };

  const duplicateFormField = (uiId) => {
    setChallengeForm((prev) => {
      const fields = [...(prev.formFields || [])];
      const index = fields.findIndex((field) => field.uiId === uiId);
      if (index === -1) return prev;
      const source = fields[index];
      const duplicate = {
        ...source,
        uiId: `field_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: `${source.name || 'campo'}_copy`
      };
      fields.splice(index + 1, 0, duplicate);
      return { ...prev, formFields: fields };
    });
  };

  const removeFormField = (uiId) => {
    setChallengeForm((prev) => ({
      ...prev,
      formFields: (prev.formFields || []).filter((field) => field.uiId !== uiId)
    }));
  };

  const handleFormFieldOptionsChange = (uiId, rawValue) => {
    updateFormField(uiId, {
      options: rawValue.split('\n').map((item) => item.trim()).filter(Boolean)
    });
  };

  const handleDragEnd = (result) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.index === source.index) return;

    setChallengeForm((prev) => {
      const fields = [...(prev.formFields || [])];
      const [moved] = fields.splice(source.index, 1);
      fields.splice(destination.index, 0, moved);
      return { ...prev, formFields: fields };
    });
  };

  const renderFormFieldPreview = (field) => {
    if (field.type === 'textarea') {
      return <TextField fullWidth label={field.label} multiline minRows={3} disabled />;
    }
    if (field.type === 'checkbox') {
      return <FormControlLabel control={<Checkbox disabled />} label={field.label} />;
    }
    if (field.type === 'select') {
      return (
        <FormControl fullWidth disabled>
          <InputLabel>{field.label}</InputLabel>
          <Select label={field.label} value="">
            {(field.options || []).map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
          </Select>
        </FormControl>
      );
    }
    return <TextField fullWidth label={field.label} type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} InputLabelProps={field.type === 'date' ? { shrink: true } : undefined} disabled />;
  };

  return (
    <div>
      <Helmet><title>{title}</title></Helmet>
      <PapperBlock title="Diario de Bordo Administrativo" icon="ion-ios-settings-outline" desc="Gerencie categorias, desafios, aprovacoes e badges" overflowX>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tab} onChange={(_e, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
            {availableTabs.map((item) => (
              <Tab key={item.value} value={item.value} label={item.label} />
            ))}
          </Tabs>
        </Box>

        {!loading && tab !== 'journals' && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={5}>
                  {hasBoardAdminPermission ? (
                    <FormControl fullWidth size="small">
                      <InputLabel>Diario em gestao</InputLabel>
                      <Select value={selectedJournalId} label="Diario em gestao" onChange={(e) => setSelectedJournalId(e.target.value)}>
                        {journals.map((item) => (
                          <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <TextField
                      label="Diario em gestao"
                      value={selectedJournal?.name || 'Nenhum diario atribuido'}
                      fullWidth
                      size="small"
                      InputProps={{ readOnly: true }}
                    />
                  )}
                </Grid>
                <Grid item xs={12} md={7}>
                  {selectedJournal ? (
                    <Box sx={{ p: 1.5, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 1 }}>
                      <Typography variant="subtitle2">{selectedJournal.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {selectedJournal.description || 'Sem descricao para este diario.'}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      {hasBoardAdminPermission
                        ? 'Selecione um diario para gerir categorias, desafios, Aprovacoes e badges.'
                        : 'A gestao desta conta esta vinculada ao diario atribuido.'}
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {!loading && tab === 'journals' && hasBoardAdminPermission && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="h6">Diarios</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Crie Diarios, selecione o diario ativo da gestao e aprove entradas de usuarios.
                  </Typography>
                </Box>
                <Button variant="contained" onClick={() => { setJournalForm(emptyJournal); setJournalInstructionsEditorState(EditorState.createEmpty()); setJournalOpen(true); }}>
                  Novo diario
                </Button>
              </Stack>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Diario atual</InputLabel>
                    <Select value={selectedJournalId} label="Diario atual" onChange={(e) => setSelectedJournalId(e.target.value)}>
                      {journals.map((item) => (
                        <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  {selectedJournal && (
                    <Box sx={{ p: 1.5, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 1 }}>
                      <Typography variant="subtitle2">{selectedJournal.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {selectedJournal.description || 'Sem descricao para este diario.'}
                      </Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Gestor</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Membros</TableCell>
                    <TableCell>Pendentes</TableCell>
                    <TableCell align="right">Acoes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {journals.map((item) => (
                    <TableRow key={item.id} selected={item.id === selectedJournalId}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.manager?.name || '-'}</TableCell>
                      <TableCell>{item.isActive ? 'Ativo' : 'Inativo'}</TableCell>
                      <TableCell>{item.metrics?.approvedMembers || 0}</TableCell>
                      <TableCell>{item.metrics?.pendingRequests || 0}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Selecionar diario">
                          <IconButton size="small" onClick={() => setSelectedJournalId(item.id)}>
                            <VisibilityOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar diario">
                          <IconButton size="small" onClick={() => {
                            const nextJournalForm = {
                              id: item.id,
                              name: item.name || '',
                              description: item.description || '',
                              coverImageUrl: item.coverImageUrl || '',
                              instructions: item.instructions || '',
                              managerUserId: item.managerUserId || '',
                              isActive: item.isActive !== false
                            };
                            setJournalForm(nextJournalForm);
                            setJournalInstructionsEditorState(createEditorStateFromHtml(nextJournalForm.instructions));
                            setJournalOpen(true);
                          }}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={item.isActive ? 'Desativar diario' : 'Ativar diario'}>
                          <IconButton
                            size="small"
                            color={item.isActive ? 'warning' : 'success'}
                            onClick={async () => {
                              try {
                                await updateBoardJournal(item.id, {
                                  name: item.name,
                                  description: item.description || '',
                                  coverImageUrl: item.coverImageUrl || '',
                                  instructions: item.instructions || '',
                                  isActive: !item.isActive
                                });
                                setNotification(item.isActive ? 'Diario desativado' : 'Diario ativado');
                                loadData();
                              } catch (error) {
                                setNotification(error.message || 'Erro ao atualizar status do diario');
                              }
                            }}
                          >
                            {item.isActive ? <CancelOutlinedIcon fontSize="small" /> : <CheckCircleOutlineIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {journals.length === 0 && <TableRow><TableCell colSpan={6}>Nenhum diario cadastrado.</TableCell></TableRow>}
                </TableBody>
              </Table>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" sx={{ mb: 1 }}>Solicitacoes de entrada do diario atual</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Data</TableCell>
                    <TableCell align="right">Acoes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingJournalMembers.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.user?.name || '-'}</TableCell>
                      <TableCell>{item.status}</TableCell>
                      <TableCell>{item.requestedAt ? new Date(item.requestedAt).toLocaleString('pt-BR') : '-'}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Aprovar acesso">
                          <IconButton size="small" color="success" onClick={async () => { try { await approveBoardJournalMember(selectedJournalId, item.id); setNotification('Acesso aprovado'); loadData(); } catch (error) { setNotification(error.message); } }}>
                            <CheckCircleOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Rejeitar acesso">
                          <IconButton size="small" color="error" onClick={async () => { try { await rejectBoardJournalMember(selectedJournalId, item.id); setNotification('Acesso rejeitado'); loadData(); } catch (error) { setNotification(error.message); } }}>
                            <CancelOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendingJournalMembers.length === 0 && <TableRow><TableCell colSpan={4}>Nenhuma solicitacao pendente.</TableCell></TableRow>}
                </TableBody>
              </Table>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" sx={{ mb: 1 }}>Usuarios com acesso ao diario atual</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Entrada aprovada em</TableCell>
                    <TableCell align="right">Acoes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {approvedJournalMembers.map((item) => {
                    const isCreator = String(item.userId || '') === String(selectedJournal?.createdBy || '');
                    return (
                      <TableRow key={item.id}>
                        <TableCell>{item.user?.name || '-'}</TableCell>
                        <TableCell>{item.user?.email || '-'}</TableCell>
                        <TableCell>{item.approvedAt ? new Date(item.approvedAt).toLocaleString('pt-BR') : '-'}</TableCell>
                        <TableCell align="right">
                          <Tooltip title={isCreator ? 'Criador do diario nao pode ser removido' : 'Remover usuario do diario'}>
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={isCreator}
                                onClick={async () => {
                                  if (!window.confirm(`Remover ${item.user?.name || 'usuario'} deste diario?`)) return;
                                  try {
                                    await deleteBoardJournalMember(selectedJournalId, item.id);
                                    setNotification('Usuario removido do diario');
                                    loadData();
                                  } catch (error) {
                                    setNotification(error.message);
                                  }
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {approvedJournalMembers.length === 0 && <TableRow><TableCell colSpan={4}>Nenhum usuario aprovado neste diario.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {loading && <Typography>Carregando modulo...</Typography>}

        {!loading && tab === 'categories' && (
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6">Categorias</Typography>
                <Button variant="contained" onClick={() => { setCategoryForm({ ...emptyCategory, journalId: selectedJournalId || '' }); setCategoryOpen(true); }}>Nova</Button>
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Descricao</TableCell>
                    <TableCell align="right">Acoes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categories.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.description || '-'}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => {
                            setCategoryForm({
                              id: item.id, journalId: item.journalId || selectedJournalId || '', name: item.name || '', description: item.description || '', icon: item.icon || '', color: item.color || '#D4AF37'
                            }); setCategoryOpen(true);
                          }}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton size="small" color="error" onClick={async () => { if (!window.confirm(`Remover categoria "${item.name}"?`)) return; try { await deleteBoardCategory(item.id); setNotification('Categoria removida'); loadData(); } catch (error) { setNotification(error.message); } }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {!loading && tab === 'challenges' && (
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6">Desafios</Typography>
                <Button variant="contained" onClick={() => {
                  setChallengeForm({ ...emptyChallenge, journalId: selectedJournalId || '', formFields: [buildFormField('text', 0)] });
                  setLessonEditorState(EditorState.createEmpty());
                  setChallengeOpen(true);
                }}>Novo</Button>
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Titulo</TableCell>
                    <TableCell>Categoria</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Pontos</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Acoes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {challenges.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.title}</TableCell>
                      <TableCell>{item.category?.name || '-'}</TableCell>
                      <TableCell>{getChallengeTypeLabel(item.challengeType)}</TableCell>
                      <TableCell>{item.points}</TableCell>
                      <TableCell>{item.isActive ? 'Ativo' : 'Inativo'}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => {
                            const nextChallengeForm = {
                              id: item.id,
                              journalId: item.journalId || selectedJournalId || '',
                              title: item.title || '',
                              description: item.description || '',
                              contentHtml: item.contentHtml || '',
                              points: item.points || 10,
                              allowSecondChance: item.allowSecondChance === true,
                              secondChancePoints: item.secondChancePoints ?? '',
                              categoryId: item.categoryId || '',
                              challengeType: item.challengeType || 'text',
                              questionText: item.questionText || '',
                              questionOptionsText: (item.questionOptions || []).join('\n'),
                              fileTypes: item.fileTypes || '',
                              formFields: normalizeExistingFormFields(item.formSchema || []),
                              dueDate: item.dueDate ? String(item.dueDate).slice(0, 10) : '',
                              isActive: item.isActive !== false
                            };
                            setChallengeForm(nextChallengeForm);
                            setLessonEditorState(createEditorStateFromHtml(nextChallengeForm.contentHtml));
                            setChallengeOpen(true);
                          }}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton size="small" color="error" onClick={async () => { if (!window.confirm(`Remover desafio "${item.title}"?`)) return; try { await deleteBoardChallenge(item.id); setNotification('Desafio removido'); loadData(); } catch (error) { setNotification(error.message); } }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {!loading && tab === 'approvals' && hasBoardAdminPermission && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Aprovacoes pendentes</Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Categoria</InputLabel>
                    <Select value={approvalCategoryFilter} label="Categoria" onChange={(e) => setApprovalCategoryFilter(e.target.value)}>
                      <MenuItem value="all">Todas</MenuItem>
                      {categories.map((item) => (
                        <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Desafio</InputLabel>
                    <Select value={approvalChallengeFilter} label="Desafio" onChange={(e) => setApprovalChallengeFilter(e.target.value)}>
                      <MenuItem value="all">Todos</MenuItem>
                      {challenges.map((item) => (
                        <MenuItem key={item.id} value={item.id}>{item.title}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Usuario"
                    value={approvalUserFilter}
                    onChange={(e) => setApprovalUserFilter(e.target.value)}
                    placeholder="Filtrar por nome ou email"
                    fullWidth
                    size="small"
                  />
                </Grid>
              </Grid>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Desafio</TableCell>
                    <TableCell>Resposta</TableCell>
                    <TableCell align="right">Acoes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPendingSubmissions.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Typography variant="body2">{item.user?.name || '-'}</Typography>
                        <Typography variant="caption" color="textSecondary">{item.user?.email || '-'}</Typography>
                      </TableCell>
                      <TableCell>{item.challenge?.title}</TableCell>
                      <TableCell>{renderSubmissionSummary(item)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Ver resposta">
                          <IconButton size="small" onClick={() => openDetailDialog(item)}>
                            <VisibilityOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Aprovar">
                          <IconButton size="small" color="success" onClick={() => openReviewDialog(item, 'approve')}>
                            <CheckCircleOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Rejeitar">
                          <IconButton size="small" color="error" onClick={() => openReviewDialog(item, 'reject')}>
                            <CancelOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredPendingSubmissions.length === 0 && <TableRow><TableCell colSpan={4}>Nenhuma submissao encontrada para os filtros atuais.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {!loading && tab === 'badges' && (
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6">Badges</Typography>
                <Button variant="contained" onClick={() => { setBadgeForm({ ...emptyBadge, journalId: selectedJournalId || '' }); setBadgeOpen(true); }}>Novo</Button>
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Pontos</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Acoes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {badges.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.badgeType}</TableCell>
                      <TableCell>{item.pointsRequired ?? '-'}</TableCell>
                      <TableCell>{item.isActive ? 'Ativo' : 'Inativo'}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => {
                            setBadgeForm({
                              id: item.id, journalId: item.journalId || selectedJournalId || '', name: item.name || '', description: item.description || '', icon: item.icon || '', pointsRequired: item.pointsRequired ?? '', badgeType: item.badgeType || 'achievement', isActive: item.isActive !== false
                            }); setBadgeOpen(true);
                          }}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton size="small" color="error" onClick={async () => { if (!window.confirm(`Remover badge "${item.name}"?`)) return; try { await deleteBoardBadge(item.id); setNotification('Badge removido'); loadData(); } catch (error) { setNotification(error.message); } }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </PapperBlock>

      <Dialog open={journalOpen} onClose={resetJournal} fullWidth maxWidth="md">
        <DialogTitle>{journalForm.id ? 'Editar diario' : 'Novo diario'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Nome" value={journalForm.name} onChange={(e) => setJournalForm((prev) => ({ ...prev, name: e.target.value }))} fullWidth />
            <TextField label="Descricao breve" value={journalForm.description} onChange={(e) => setJournalForm((prev) => ({ ...prev, description: e.target.value }))} fullWidth multiline minRows={3} />
            <TextField label="Imagem de capa (URL)" value={journalForm.coverImageUrl} onChange={(e) => setJournalForm((prev) => ({ ...prev, coverImageUrl: e.target.value }))} fullWidth />
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Instrucoes do diario
                  </Typography>
                  <Box
                    sx={{
                      border: '1px solid rgba(21,48,74,0.12)',
                      borderRadius: 2,
                      backgroundColor: '#fff',
                      overflow: 'hidden',
                      '& .rdw-editor-toolbar': {
                        border: 'none',
                        borderBottom: '1px solid rgba(21,48,74,0.08)',
                        mb: 0
                      },
                      '& .rdw-editor-main': {
                        minHeight: 220,
                        padding: 2
                      }
                    }}
                  >
                    <Editor
                      editorState={journalInstructionsEditorState}
                      onEditorStateChange={(nextState) => {
                        setJournalInstructionsEditorState(nextState);
                        setJournalForm((prev) => ({
                          ...prev,
                          instructions: draftToHtml(convertToRaw(nextState.getCurrentContent()))
                        }));
                      }}
                      toolbar={{
                        options: ['inline', 'blockType', 'list', 'link', 'history'],
                        inline: { inDropdown: false },
                        list: { inDropdown: false },
                        link: { inDropdown: false },
                        history: { inDropdown: false }
                      }}
                      placeholder="Escreva as instrucoes formatadas do diario. Os usuarios visualizam esse conteudo em HTML."
                    />
                  </Box>
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    O editor salva automaticamente as instrucoes em HTML.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Preview</Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      Assim as instrucoes serao exibidas para o usuario no diario.
                    </Typography>
                    <Box
                      sx={{
                        minHeight: 220,
                        p: 2,
                        borderRadius: 1.5,
                        backgroundColor: '#FAF7F0',
                        border: '1px solid rgba(0,0,0,0.06)',
                        '& a': { color: 'primary.main' }
                      }}
                      dangerouslySetInnerHTML={sanitizeRichHtml(journalForm.instructions)}
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            <FormControl fullWidth>
              <InputLabel>Gestor do diario</InputLabel>
              <Select
                value={journalForm.managerUserId || ''}
                label="Gestor do diario"
                onChange={(e) => setJournalForm((prev) => ({ ...prev, managerUserId: e.target.value }))}
              >
                <MenuItem value="">Sem gestor definido</MenuItem>
                {eligibleManagerUsers.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {`${item.name || item.email || item.id}${extractUserProfileNames(item).length ? ` - ${extractUserProfileNames(item).join(', ')}` : ''}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {hasBoardAdminPermission && eligibleManagerUsers.length === 0 && (
              <Typography variant="caption" color="textSecondary">
                Nenhum usuario com perfil valido para gestor foi encontrado.
              </Typography>
            )}
            <FormControlLabel control={<Switch checked={journalForm.isActive} onChange={(e) => setJournalForm((prev) => ({ ...prev, isActive: e.target.checked }))} />} label="Diario ativo" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetJournal}>Cancelar</Button>
          <Button variant="contained" onClick={saveJournal}>Salvar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={categoryOpen} onClose={resetCategory} fullWidth maxWidth="sm">
        <DialogTitle>{categoryForm.id ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {hasBoardAdminPermission ? (
              <FormControl fullWidth>
                <InputLabel>Diario</InputLabel>
                <Select value={categoryForm.journalId || ''} label="Diario" onChange={(e) => setCategoryForm((prev) => ({ ...prev, journalId: e.target.value }))}>
                  {journals.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                </Select>
              </FormControl>
            ) : (
              <TextField label="Diario" value={selectedJournal?.name || ''} fullWidth InputProps={{ readOnly: true }} />
            )}
            <TextField label="Nome" value={categoryForm.name} onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))} fullWidth />
            <TextField label="Descricao" value={categoryForm.description} onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))} fullWidth multiline minRows={3} />
            <TextField label="Icone" value={categoryForm.icon} onChange={(e) => setCategoryForm((prev) => ({ ...prev, icon: e.target.value }))} fullWidth />
            {categoryForm.icon && (
              <Box sx={{
                p: 1.5,
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 1,
                backgroundColor: '#F7F4EC'
              }}>
                <Typography variant="caption" color="textSecondary" display="block">Preview do icone selecionado</Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <Box component="i" className={categoryForm.icon} sx={{ fontSize: 22 }} />
                  <Typography variant="body2">{categoryForm.icon}</Typography>
                </Stack>
              </Box>
            )}
            {renderIconSuggestions('Sugestoes para categoria', categoryForm.icon, CATEGORY_ICON_SUGGESTIONS, (icon) => setCategoryForm((prev) => ({
              ...prev,
              icon
            })))}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <TextField
                label="Cor"
                value={categoryForm.color}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, color: e.target.value }))}
                fullWidth
              />
              <Box>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 0.5 }}>
                  Seletor visual
                </Typography>
                <TextField
                  type="color"
                  value={categoryForm.color || '#D4AF37'}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, color: e.target.value }))}
                  inputProps={{ 'aria-label': 'Selecionar cor da categoria' }}
                  sx={{
                    minWidth: 88,
                    '& input': {
                      p: 0.5,
                      height: 42,
                      cursor: 'pointer'
                    }
                  }}
                />
              </Box>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetCategory}>Cancelar</Button>
          <Button variant="contained" onClick={saveCategory}>Salvar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={badgeOpen} onClose={resetBadge} fullWidth maxWidth="sm">
        <DialogTitle>{badgeForm.id ? 'Editar badge' : 'Novo badge'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {hasBoardAdminPermission ? (
              <FormControl fullWidth>
                <InputLabel>Diario</InputLabel>
                <Select value={badgeForm.journalId || ''} label="Diario" onChange={(e) => setBadgeForm((prev) => ({ ...prev, journalId: e.target.value }))}>
                  {journals.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                </Select>
              </FormControl>
            ) : (
              <TextField label="Diario" value={selectedJournal?.name || ''} fullWidth InputProps={{ readOnly: true }} />
            )}
            <TextField label="Nome" value={badgeForm.name} onChange={(e) => setBadgeForm((prev) => ({ ...prev, name: e.target.value }))} fullWidth />
            <TextField label="Descricao" value={badgeForm.description} onChange={(e) => setBadgeForm((prev) => ({ ...prev, description: e.target.value }))} fullWidth multiline minRows={3} />
            <TextField label="Icone" value={badgeForm.icon} onChange={(e) => setBadgeForm((prev) => ({ ...prev, icon: e.target.value }))} fullWidth />
            {badgeForm.icon && (
              <Box sx={{
                p: 1.5,
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 1,
                backgroundColor: '#F7F4EC'
              }}>
                <Typography variant="caption" color="textSecondary" display="block">Preview do icone selecionado</Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <Box component="i" className={badgeForm.icon} sx={{ fontSize: 22 }} />
                  <Typography variant="body2">{badgeForm.icon}</Typography>
                </Stack>
              </Box>
            )}
            {renderIconSuggestions('Sugestoes para badge', badgeForm.icon, BADGE_ICON_SUGGESTIONS, (icon) => setBadgeForm((prev) => ({
              ...prev,
              icon
            })))}
            <TextField label="Pontos minimos" type="number" value={badgeForm.pointsRequired} onChange={(e) => setBadgeForm((prev) => ({ ...prev, pointsRequired: e.target.value }))} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select value={badgeForm.badgeType} label="Tipo" onChange={(e) => setBadgeForm((prev) => ({ ...prev, badgeType: e.target.value }))}>
                {BADGE_TYPE_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControlLabel control={<Switch checked={badgeForm.isActive} onChange={(e) => setBadgeForm((prev) => ({ ...prev, isActive: e.target.checked }))} />} label="Badge ativo" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetBadge}>Cancelar</Button>
          <Button variant="contained" onClick={saveBadge}>Salvar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={challengeOpen} onClose={resetChallenge} fullWidth maxWidth="lg">
        <DialogTitle>{challengeForm.id ? 'Editar desafio' : 'Novo desafio'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              {hasBoardAdminPermission ? (
                <FormControl fullWidth>
                  <InputLabel>Diario</InputLabel>
                  <Select
                    value={challengeForm.journalId || ''}
                    label="Diario"
                    onChange={(e) => setChallengeForm((prev) => ({ ...prev, journalId: e.target.value, categoryId: '' }))}
                  >
                    {journals.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                  </Select>
                </FormControl>
              ) : (
                <TextField label="Diario" value={selectedJournal?.name || ''} fullWidth InputProps={{ readOnly: true }} />
              )}
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField label="Titulo" value={challengeForm.title} onChange={(e) => setChallengeForm((prev) => ({ ...prev, title: e.target.value }))} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Pontos" type="number" value={challengeForm.points} onChange={(e) => setChallengeForm((prev) => ({ ...prev, points: e.target.value }))} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={(
                  <Switch
                    checked={challengeForm.allowSecondChance}
                    onChange={(e) => setChallengeForm((prev) => ({
                      ...prev,
                      allowSecondChance: e.target.checked,
                      secondChancePoints: e.target.checked
                        ? (prev.secondChancePoints === '' ? Math.max(Number(prev.points || 0) - 1, 0) : prev.secondChancePoints)
                        : ''
                    }))}
                  />
                )}
                label="Permitir segunda chance"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Pontos na segunda chance"
                type="number"
                value={challengeForm.secondChancePoints}
                onChange={(e) => setChallengeForm((prev) => ({ ...prev, secondChancePoints: e.target.value }))}
                disabled={!challengeForm.allowSecondChance}
                helperText="Pontuacao concedida quando a aprovacao ocorrer na segunda tentativa."
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select value={challengeForm.categoryId} label="Categoria" onChange={(e) => setChallengeForm((prev) => ({ ...prev, categoryId: e.target.value }))}>
                  {challengeCategoryOptions.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select value={challengeForm.challengeType} label="Tipo" onChange={(e) => setChallengeForm((prev) => ({ ...prev, challengeType: e.target.value, formFields: ['form', 'lesson'].includes(e.target.value) && !(prev.formFields || []).length ? [buildFormField('text', 0)] : prev.formFields }))}>
                  {CHALLENGE_TYPE_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Descricao" value={challengeForm.description} onChange={(e) => setChallengeForm((prev) => ({ ...prev, description: e.target.value }))} fullWidth multiline minRows={3} />
            </Grid>
            {challengeForm.challengeType === 'lesson' && (
              <>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Conteudo da licao
                    </Typography>
                    <Box
                      sx={{
                        border: '1px solid rgba(21,48,74,0.12)',
                        borderRadius: 2,
                        backgroundColor: '#fff',
                        overflow: 'hidden',
                        '& .rdw-editor-toolbar': {
                          border: 'none',
                          borderBottom: '1px solid rgba(21,48,74,0.08)',
                          mb: 0
                        },
                        '& .rdw-editor-main': {
                          minHeight: 260,
                          padding: 2
                        }
                      }}
                    >
                      <Editor
                        editorState={lessonEditorState}
                        onEditorStateChange={(nextState) => {
                          setLessonEditorState(nextState);
                          setChallengeForm((prev) => ({
                            ...prev,
                            contentHtml: draftToHtml(convertToRaw(nextState.getCurrentContent()))
                          }));
                        }}
                        toolbar={{
                          options: ['inline', 'blockType', 'list', 'link', 'history'],
                          inline: { inDropdown: false },
                          list: { inDropdown: false },
                          link: { inDropdown: false },
                          history: { inDropdown: false }
                        }}
                        placeholder="Escreva a licao, destaque trechos importantes e adicione links externos."
                      />
                    </Box>
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                      O editor gera o HTML automaticamente para salvar no desafio.
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Preview da licao</Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        O usuario vera esse conteudo antes de responder a parte final.
                      </Typography>
                      <Box
                        sx={{
                          minHeight: 220,
                          p: 2,
                          borderRadius: 1.5,
                          backgroundColor: '#FAF7F0',
                          border: '1px solid rgba(0,0,0,0.06)',
                          '& a': { color: 'primary.main' }
                        }}
                        dangerouslySetInnerHTML={sanitizeRichHtml(challengeForm.contentHtml)}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              </>
            )}
            <Grid item xs={12} md={6}>
              <TextField label="Prazo" type="date" value={challengeForm.dueDate} InputLabelProps={{ shrink: true }} onChange={(e) => setChallengeForm((prev) => ({ ...prev, dueDate: e.target.value }))} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel control={<Switch checked={challengeForm.isActive} onChange={(e) => setChallengeForm((prev) => ({ ...prev, isActive: e.target.checked }))} />} label="Ativo" />
            </Grid>
            {challengeForm.challengeType === 'question' && <Grid item xs={12}><TextField label="Pergunta" value={challengeForm.questionText} onChange={(e) => setChallengeForm((prev) => ({ ...prev, questionText: e.target.value }))} fullWidth sx={{ mb: 2 }} /><TextField label="Opcoes (uma por linha)" value={challengeForm.questionOptionsText} onChange={(e) => setChallengeForm((prev) => ({ ...prev, questionOptionsText: e.target.value }))} fullWidth multiline minRows={4} /></Grid>}
            {challengeForm.challengeType === 'file' && <Grid item xs={12}><TextField label="Tipos de arquivo" value={challengeForm.fileTypes} onChange={(e) => setChallengeForm((prev) => ({ ...prev, fileTypes: e.target.value }))} helperText="Ex: pdf,jpg,png" fullWidth /></Grid>}
            {['form', 'lesson'].includes(challengeForm.challengeType) && <Grid item xs={12}><Card variant="outlined"><CardContent><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} sx={{ mb: 2 }}><Box><Typography variant="h6">{challengeForm.challengeType === 'lesson' ? 'Etapas finais da licao' : 'Construtor visual de formulario'}</Typography><Typography variant="body2" color="textSecondary">{challengeForm.challengeType === 'lesson' ? 'Monte o fechamento da licao com checklist e perguntas. Para concluir, o usuario precisa completar todas as etapas.' : 'Adicione campos, arraste para reordenar e o sistema salva tudo como JSON automaticamente.'}</Typography></Box><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>{FORM_FIELD_TYPES.map((typeOption) => <Button key={typeOption.value} variant="outlined" startIcon={<AddIcon />} onClick={() => addFormField(typeOption.value)}>{typeOption.label}</Button>)}</Stack></Stack><Grid container spacing={2}><Grid item xs={12} md={7}><DragDropContext onDragEnd={handleDragEnd}><Droppable droppableId="board-journal-form-fields">{(provided) => <Box ref={provided.innerRef} {...provided.droppableProps}>{(challengeForm.formFields || []).map((field, index) => <Draggable key={field.uiId} draggableId={field.uiId} index={index}>{(dragProvided) => <Card ref={dragProvided.innerRef} {...dragProvided.draggableProps} variant="outlined" sx={{ mb: 2 }}><CardContent><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}><Stack direction="row" spacing={1} alignItems="center"><Box {...dragProvided.dragHandleProps} sx={{
              display: 'flex', alignItems: 'center', color: 'text.secondary', cursor: 'grab'
            }}><DragIndicatorIcon /></Box><Typography variant="subtitle1">{challengeForm.challengeType === 'lesson' ? `Etapa ${index + 1}` : `Campo ${index + 1}`}</Typography></Stack><Stack direction="row" spacing={1}><IconButton size="small" onClick={() => duplicateFormField(field.uiId)}><ContentCopyIcon fontSize="small" /></IconButton><IconButton size="small" color="error" onClick={() => removeFormField(field.uiId)}><DeleteIcon fontSize="small" /></IconButton></Stack></Stack><Grid container spacing={2}><Grid item xs={12} md={8}><TextField label={challengeForm.challengeType === 'lesson' ? 'Etapa / pergunta' : 'Pergunta / rotulo'} value={field.label} onChange={(e) => updateFormField(field.uiId, { label: e.target.value })} fullWidth /></Grid><Grid item xs={12} md={4}><FormControl fullWidth><InputLabel>Tipo</InputLabel><Select value={field.type} label="Tipo" onChange={(e) => updateFormField(field.uiId, { type: e.target.value, options: e.target.value === 'select' ? (field.options.length ? field.options : ['Opcao 1']) : [] })}>{FORM_FIELD_TYPES.map((typeOption) => <MenuItem key={typeOption.value} value={typeOption.value}>{typeOption.label}</MenuItem>)}</Select></FormControl></Grid><Grid item xs={12} md={8}><TextField label="Identificador interno" value={field.name} onChange={(e) => updateFormField(field.uiId, { name: slugifyFieldName(e.target.value, index) })} helperText="Usado no JSON salvo" fullWidth /></Grid><Grid item xs={12} md={4}><FormControlLabel control={<Switch checked={field.required} onChange={(e) => updateFormField(field.uiId, { required: e.target.checked })} />} label={challengeForm.challengeType === 'lesson' ? 'Obrigatorio visual' : 'Obrigatorio'} /></Grid>{field.type === 'select' && <Grid item xs={12}><TextField label="Opcoes (uma por linha)" value={(field.options || []).join('\n')} onChange={(e) => handleFormFieldOptionsChange(field.uiId, e.target.value)} fullWidth multiline minRows={4} /></Grid>}</Grid></CardContent></Card>}</Draggable>)}{provided.placeholder}</Box>}</Droppable></DragDropContext></Grid><Grid item xs={12} md={5}><Card variant="outlined" sx={{ position: 'sticky', top: 0 }}><CardContent><Typography variant="h6" gutterBottom>Preview</Typography><Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>{challengeForm.challengeType === 'lesson' ? 'Assim as perguntas e checks finais serao apresentados ao usuario.' : 'Assim o formulario sera apresentado para o usuario.'}</Typography><Stack spacing={2}>{formPreviewFields.map((field, index) => <Box key={`${field.name}_${index}`}>{renderFormFieldPreview(field)}{field.required && challengeForm.challengeType !== 'lesson' && <Typography variant="caption" color="textSecondary">Obrigatorio</Typography>}{challengeForm.challengeType === 'lesson' && <Typography variant="caption" color="textSecondary">Na licao, todas as etapas precisam ser concluidas.</Typography>}</Box>)}{formPreviewFields.length === 0 && <Typography variant="body2">Nenhum campo adicionado.</Typography>}</Stack><Divider sx={{ my: 2 }} /><Typography variant="caption" color="textSecondary">Schema salvo automaticamente</Typography><Box component="pre" sx={{
              whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, backgroundColor: '#F7F4EC', p: 1.5, borderRadius: 1, mt: 1, maxHeight: 220, overflow: 'auto'
            }}>{JSON.stringify(formPreviewFields, null, 2)}</Box></CardContent></Card></Grid></Grid></CardContent></Card></Grid>}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetChallenge}>Cancelar</Button>
          <Button variant="contained" onClick={saveChallenge}>Salvar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reviewOpen} onClose={() => setReviewOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{reviewAction === 'approve' ? 'Aprovar submissao' : 'Rejeitar submissao'}</DialogTitle>
        <DialogContent>
          {reviewItem && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Resposta enviada</Typography>
              {renderSubmissionResponse(reviewItem)}
            </Box>
          )}
          <TextField label="Feedback" value={reviewFeedback} onChange={(e) => setReviewFeedback(e.target.value)} fullWidth multiline minRows={4} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewOpen(false)}>Cancelar</Button>
          <Button variant="contained" color={reviewAction === 'approve' ? 'success' : 'error'} onClick={submitReview}>{reviewAction === 'approve' ? 'Confirmar aprovacao' : 'Confirmar rejeicao'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Detalhes da resposta</DialogTitle>
        <DialogContent>
          {detailItem && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="subtitle2">Usuario</Typography>
                <Typography variant="body2">{detailItem.user?.name || '-'}</Typography>
                <Typography variant="caption" color="textSecondary">{detailItem.user?.email || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Desafio</Typography>
                <Typography variant="body2">{detailItem.challenge?.title || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" gutterBottom>Resposta enviada</Typography>
                {renderSubmissionResponse(detailItem)}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
}

export default BoardJournalAdminPage;
