import React from 'react';
import PropTypes from 'prop-types';
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Stack,
  Box,
  Typography,
  Avatar,
  Chip,
  CircularProgress,
  Tooltip,
  IconButton,
  Switch,
  FormControlLabel
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SyncIcon from '@mui/icons-material/Sync';
import { calcCompletude, INACTIVE_STATUSES, isMemberRecent } from './membersHelpers';

const MembersTable = ({
  pagedMembers,
  totalCount,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  loading,
  updatingMemberId,
  notificandoMembro,
  notificandoCelulas,
  sincronizandoMembro,
  onToggleStatus,
  onNotifyIncomplete,
  onNotifyLeaderCells,
  onSyncMember,
  onOpenDetails,
  onOpenEdit,
  onDeleteMember,
  showLeaderColumns
}) => (
  <>
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell />
          <TableCell>Nome</TableCell>
          <TableCell>Email</TableCell>
          <TableCell>Telefone</TableCell>
          <TableCell>Status</TableCell>
          {showLeaderColumns && <TableCell>Células que lidera</TableCell>}
          <TableCell>Ações</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {pagedMembers.map((member) => {
          const isActive = !INACTIVE_STATUSES.includes(member.status);
          const completude = calcCompletude(member);
          const incompleto = completude < 70;
          const temContato = Boolean(member.phone || member.whatsapp);
          return (
            <TableRow hover key={member.id}>
              <TableCell>
                <Avatar
                  src={member.photoUrl || 'https://via.placeholder.com/40'}
                  alt={member.fullName}
                  sx={{ width: 32, height: 32 }}
                />
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                  <span>{member.fullName}</span>
                  {isMemberRecent(member) && (
                    <Chip label="Novo" size="small" color="success" sx={{ fontWeight: 700, height: 20 }} />
                  )}
                  {incompleto && (
                    <Tooltip title={`Dados incompletos: ${completude}% preenchido`}>
                      <WarningAmberIcon fontSize="small" color="warning" />
                    </Tooltip>
                  )}
                </Stack>
              </TableCell>
              <TableCell>{member.email || '-'}</TableCell>
              <TableCell>{member.phone || member.whatsapp || '-'}</TableCell>
              <TableCell>
                <Chip label={member.status || '-'} color={isActive ? 'primary' : 'default'} size="small" />
              </TableCell>
              {showLeaderColumns && (
                <TableCell sx={{ minWidth: 220 }}>
                  {(() => {
                    const qtd = member.qtdCelulasLideradas || 0;
                    const celulas = member.liderancaCelulas || [];
                    return (
                      <Stack spacing={0.5}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Chip
                            size="small"
                            color={qtd > 1 ? 'secondary' : 'default'}
                            label={`${qtd} ${qtd === 1 ? 'célula' : 'células'}`}
                            sx={{ width: 'fit-content' }}
                          />
                          {qtd > 0 && (
                            <Tooltip title={qtd > 1
                              ? 'Notificar líder: confirmar/atualizar e inativar células que não lidera mais'
                              : 'Notificar líder no WhatsApp para conferir/atualizar a célula'}
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  color="success"
                                  disabled={!!notificandoCelulas[member.id]}
                                  onClick={() => onNotifyLeaderCells(member)}
                                >
                                  {notificandoCelulas[member.id]
                                    ? <CircularProgress size={16} />
                                    : <WhatsAppIcon fontSize="small" />}
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </Stack>
                        {celulas.map((c) => (
                          <Typography key={c.id} variant="caption" color="textSecondary">
                            {[c.celula, c.rede, [c.dia, c.horario].filter(Boolean).join(' ')]
                              .filter(Boolean).join(' · ')}
                          </Typography>
                        ))}
                      </Stack>
                    );
                  })()}
                </TableCell>
              )}
              <TableCell>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FormControlLabel
                    sx={{ m: 0 }}
                    control={(
                      <Switch
                        size="small"
                        color="primary"
                        checked={isActive}
                        disabled={updatingMemberId === member.id}
                        onChange={(event) => onToggleStatus(member, event.target.checked)}
                      />
                    )}
                    label={updatingMemberId === member.id ? 'Salvando...' : isActive ? 'Ativo' : 'Inativo'}
                  />
                  {incompleto && (
                    <Tooltip title={temContato ? `Notificar para atualizar dados (${completude}%)` : 'Sem telefone para notificar'}>
                      <span>
                        <IconButton
                          size="small"
                          color="warning"
                          disabled={!temContato || !!notificandoMembro[member.id]}
                          onClick={() => onNotifyIncomplete(member)}
                        >
                          <NotificationsActiveIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  {member.userId && (
                    <Tooltip title="Sincronizar dados do usuário vinculado">
                      <span>
                        <IconButton
                          size="small"
                          color="info"
                          disabled={!!sincronizandoMembro[member.id]}
                          onClick={() => onSyncMember(member)}
                        >
                          {sincronizandoMembro[member.id]
                            ? <CircularProgress size={16} />
                            : <SyncIcon fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  <Tooltip title="Detalhes do membro">
                    <IconButton size="small" onClick={() => onOpenDetails(member)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Editar membro">
                    <IconButton size="small" onClick={() => onOpenEdit(member)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir membro">
                    <IconButton size="small" color="error" onClick={() => onDeleteMember(member)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          );
        })}
        {!pagedMembers.length && !loading && (
          <TableRow>
            <TableCell colSpan={showLeaderColumns ? 7 : 6}>
              <Typography color="textSecondary">Nenhum membro encontrado.</Typography>
            </TableCell>
          </TableRow>
        )}
        {loading && (
          <TableRow>
            <TableCell colSpan={showLeaderColumns ? 7 : 6}>
              <Box display="flex" justifyContent="center" py={2}>
                <CircularProgress size={24} />
              </Box>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
    <TablePagination
      component="div"
      count={totalCount}
      page={page}
      onPageChange={(_, newPage) => onPageChange(newPage)}
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={(event) => onRowsPerPageChange(parseInt(event.target.value, 10))}
      rowsPerPageOptions={[5, 10, 20]}
    />
  </>
);

MembersTable.propTypes = {
  pagedMembers: PropTypes.arrayOf(PropTypes.object).isRequired,
  totalCount: PropTypes.number.isRequired,
  page: PropTypes.number.isRequired,
  rowsPerPage: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onRowsPerPageChange: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  updatingMemberId: PropTypes.string,
  notificandoMembro: PropTypes.object,
  notificandoCelulas: PropTypes.object,
  sincronizandoMembro: PropTypes.object,
  onToggleStatus: PropTypes.func.isRequired,
  onNotifyIncomplete: PropTypes.func.isRequired,
  onNotifyLeaderCells: PropTypes.func,
  onSyncMember: PropTypes.func.isRequired,
  onOpenDetails: PropTypes.func.isRequired,
  onOpenEdit: PropTypes.func.isRequired,
  onDeleteMember: PropTypes.func.isRequired,
  showLeaderColumns: PropTypes.bool,
};

MembersTable.defaultProps = {
  loading: false,
  updatingMemberId: '',
  notificandoMembro: {},
  notificandoCelulas: {},
  sincronizandoMembro: {},
  onNotifyLeaderCells: () => {},
  showLeaderColumns: false,
};

export default MembersTable;
