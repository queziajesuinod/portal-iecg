import React, { Fragment } from 'react';
import { PropTypes } from 'prop-types';

import Fade from '@mui/material/Fade';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';

import { HeaderMenu, BreadCrumb } from 'dan-components';
import dataMenu from 'dan-api/ui/menu';
import { filterMenuByPermissions, getStoredPermissions } from '../../../utils/permissions.js';
import Decoration from '../Decoration';
import useStyles from '../appStyles-jss';
import HistoryStackButton from './HistoryStackButton';

function DropMenuLayout(props) {
  const { classes, cx } = useStyles();
  const {
    children,
    pageLoaded,
    mode,
    gradient,
    deco,
    bgPosition,
    changeMode,
    place,
    history,
    titleException,
    backRoute,
    historyStack,
    handleOpenGuide,
    toggleDrawer,
    sidebarOpen,
    loadTransition
  } = props;
  const permissions = getStoredPermissions();
  const filteredMenu = filterMenuByPermissions(dataMenu, permissions);
  return (
    <Fragment>
      <HeaderMenu
        type="top-navigation"
        dataMenu={filteredMenu}
        changeMode={changeMode}
        mode={mode}
        history={history}
        openGuide={handleOpenGuide}
        toggleDrawerOpen={toggleDrawer}
        openMobileNav={sidebarOpen}
        loadTransition={loadTransition}
        logoLink="/app"
      />
      <main
        className={
          cx(
            classes.content,
            classes.highMargin
          )
        }
        id="mainContent"
      >
        <Decoration
          mode={mode}
          gradient={gradient}
          decoration={deco}
          bgPosition={bgPosition}
          horizontalMenu
        />
        <section className={cx(classes.mainWrap, classes.topbarLayout)}>
          {titleException.indexOf(history.location.pathname) < 0 && (
            <div className={classes.pageTitle}>
              <div className={classes.pageTitleHeader}>
                <div className={classes.pageTitleActions}>
                  {backRoute && (
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<ArrowBackIosIcon />}
                      onClick={() => history.goBack()}
                    >
                      Voltar
                    </Button>
                  )}
                  <HistoryStackButton historyStack={historyStack} history={history} />
                </div>
                <Typography component="h4" className={bgPosition === 'header' ? classes.darkTitle : classes.lightTitle} variant="h4">{place}</Typography>
              </div>
              <BreadCrumb separator=" / " theme={bgPosition === 'header' ? 'dark' : 'light'} location={history.location} />
            </div>
          )}
          {!pageLoaded && (<img src="/images/spinner.gif" alt="spinner" className={classes.circularProgress} />)}
          <Fade
            in={pageLoaded}
            {...(pageLoaded ? { timeout: 700 } : {})}
          >
            <div className={!pageLoaded ? classes.hideApp : ''}>
              {/* Application content will load here */}
              { children }
            </div>
          </Fade>
        </section>
      </main>
    </Fragment>
  );
}

DropMenuLayout.propTypes = {

  children: PropTypes.node.isRequired,
  history: PropTypes.object.isRequired,
  changeMode: PropTypes.func.isRequired,
  toggleDrawer: PropTypes.func.isRequired,
  loadTransition: PropTypes.func.isRequired,
  sidebarOpen: PropTypes.bool.isRequired,
  pageLoaded: PropTypes.bool.isRequired,
  mode: PropTypes.string.isRequired,
  gradient: PropTypes.bool.isRequired,
  deco: PropTypes.bool.isRequired,
  bgPosition: PropTypes.string.isRequired,
  place: PropTypes.string.isRequired,
  titleException: PropTypes.array.isRequired,
  handleOpenGuide: PropTypes.func.isRequired,
  backRoute: PropTypes.string,
  historyStack: PropTypes.arrayOf(PropTypes.shape({
    path: PropTypes.string.isRequired,
    label: PropTypes.string
  }))
};

export default DropMenuLayout;
