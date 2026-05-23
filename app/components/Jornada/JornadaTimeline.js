import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box, Button, Stack, Typography
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const DOT_COLOR_BY_TYPE = {
  milestone: 'primary.main',
  activity: 'success.main',
  default: 'primary.main'
};

function JornadaTimeline({ items, emptyText, initialCount }) {
  const [expanded, setExpanded] = useState(false);
  const total = items?.length || 0;

  if (total === 0) {
    return (
      <Box sx={{ py: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {emptyText}
        </Typography>
      </Box>
    );
  }

  const limit = initialCount > 0 ? initialCount : total;
  const visibleItems = expanded ? items : items.slice(0, limit);
  const hasMore = total > limit;
  const remaining = total - limit;

  return (
    <Box>
      <Stack spacing={0} role="list">
        {visibleItems.map((item, index) => {
          const hasNext = index < visibleItems.length - 1;
          const dotColor = item.dotColor || DOT_COLOR_BY_TYPE[item.type] || DOT_COLOR_BY_TYPE.default;
          return (
            <Box
              key={item.id}
              role="listitem"
              sx={{
                display: 'grid',
                gridTemplateColumns: '22px 1fr',
                columnGap: 1.5
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: dotColor,
                    mt: 0.75,
                    boxShadow: (theme) => `0 0 0 3px ${theme.palette.background.paper}, 0 0 0 4px ${theme.palette.divider}`
                  }}
                />
                {hasNext && (
                  <Box sx={{
                    width: 2, flex: 1, minHeight: 28, bgcolor: 'divider', my: 0.75
                  }}
                  />
                )}
              </Box>
              <Box sx={{
                pb: hasNext ? 2 : 0, display: 'flex', gap: 1, alignItems: 'flex-start'
              }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {item.date && (
                    <Typography variant="caption" color="text.secondary">
                      {item.date}
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item.title}
                  </Typography>
                  {item.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      {item.description}
                    </Typography>
                  )}
                </Box>
                {item.action && (
                  <Box sx={{ flexShrink: 0 }}>{item.action}</Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Stack>

      {hasMore && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{
            mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider'
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {expanded
              ? `Exibindo todos os ${total} registros`
              : `Exibindo ${limit} de ${total} registros`}
          </Typography>
          <Button
            size="small"
            onClick={() => setExpanded((prev) => !prev)}
            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            aria-expanded={expanded}
          >
            {expanded ? 'Ver menos' : `Ver mais (${remaining})`}
          </Button>
        </Stack>
      )}
    </Box>
  );
}

JornadaTimeline.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    date: PropTypes.string,
    title: PropTypes.node.isRequired,
    description: PropTypes.node,
    type: PropTypes.oneOf(['milestone', 'activity', 'default']),
    dotColor: PropTypes.string,
    action: PropTypes.node
  })),
  emptyText: PropTypes.string,
  initialCount: PropTypes.number
};

JornadaTimeline.defaultProps = {
  items: [],
  emptyText: 'Nenhum registro ainda.',
  initialCount: 5
};

export default JornadaTimeline;
