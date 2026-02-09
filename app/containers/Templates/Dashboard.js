import React, { useState, useEffect, useRef } from 'react';
import { PropTypes } from 'prop-types';

import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import { GuideSlider } from 'dan-components';
import { toggleAction, openAction, playTransitionAction } from 'dan-redux/actions/uiActions';
import { getPageTitle } from '../../config/pageTitles';
import LeftSidebarLayout from './layouts/LeftSidebarLayout';
import RightSidebarLayout from './layouts/RightSidebarLayout';
import LeftSidebarBigLayout from './layouts/LeftSidebarBigLayout';
import DropMenuLayout from './layouts/DropMenuLayout';
import MegaMenuLayout from './layouts/MegaMenuLayout';
import useStyles from './appStyles-jss';

function Dashboard(props) {
  const { classes, cx } = useStyles();
  // Initial header style
  const [openGuide, setOpenGuide] = useState(false);
  const [appHeight, setAppHeight] = useState(0);
  const [previousRoute, setPreviousRoute] = useState(null);
  const [historyStack, setHistoryStack] = useState([]);
  const previousLocationRef = useRef(props.history.location);
  const maxHistoryEntries = 5;
  const getLocationPath = (location) => (
    location ? `${location.pathname}${location.search || ''}${location.hash || ''}` : ''
  );
  const getRouteKeyFromPath = (path) => {
    if (!path) return 'app';
    const [route] = path.split('?');
    const [base] = route.split('#');
    return base.replace(/^\/+/, '').replace(/\/+$/, '') || 'app';
  };
  const historyStackItems = historyStack.map(({ path, timestamp }) => ({
    path,
    timestamp,
    label: getPageTitle(getRouteKeyFromPath(path))
  }));

  useEffect(() => {
    const { history, loadTransition } = props;

    // Adjust min height
    setAppHeight(window.innerHeight + 112);

    // Set expanded sidebar menu
    const currentPath = history.location.pathname;
    props.initialOpen(currentPath);
    // Play page transition
    loadTransition(true);

    // Execute all arguments when page changes
    const unlisten = history.listen((location) => {
      window.scrollTo(0, 0);
      setTimeout(() => {
        loadTransition(true);
      }, 500);
      const latestPath = getLocationPath(location);
      const previousPath = getLocationPath(previousLocationRef.current);
      if (previousPath && previousPath !== latestPath) {
        setPreviousRoute(previousPath);
        setHistoryStack((prev) => {
          const withoutCurrent = prev.filter((entry) => entry.path !== previousPath);
          const newEntry = { path: previousPath, timestamp: Date.now() };
          return [newEntry, ...withoutCurrent].slice(0, maxHistoryEntries);
        });
      }
      previousLocationRef.current = location;
    });

    return () => {
      if (unlisten != null) {
        unlisten();
      }
    };
  }, []);

  const handleOpenGuide = () => {
    setOpenGuide(true);
  };
  const handleCloseGuide = () => {
    setOpenGuide(false);
  };

  const {
    children,
    toggleDrawer,
    sidebarOpen,
    loadTransition,
    pageLoaded,
    mode,
    history,
    gradient,
    deco,
    bgPosition,
    layout,
    changeMode
  } = props;
  const titleException = ['/app', '/app/crm-dashboard', '/app/crypto-dashboard'];
  const normalizedPath = history.location.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  const routeKey = normalizedPath || 'app';
  const pageTitle = getPageTitle(routeKey);


  return (
    <div
      style={{ minHeight: appHeight }}
      className={
        cx(
          classes.appFrameInner,
          layout === 'top-navigation' || layout === 'mega-menu' ? classes.topNav : classes.sideNav,
          mode === 'dark' ? 'dark-mode' : 'light-mode'
        )
      }
    >
      <GuideSlider openGuide={openGuide} closeGuide={handleCloseGuide} />
      { /* Left Sidebar Layout */
        layout === 'left-sidebar' && (
          <LeftSidebarLayout
            history={history}
            toggleDrawer={toggleDrawer}
            loadTransition={loadTransition}
            changeMode={changeMode}
            sidebarOpen={sidebarOpen}
            pageLoaded={pageLoaded}
            mode={mode}
            gradient={gradient}
            deco={deco}
            bgPosition={bgPosition}
            place={pageTitle}
            titleException={titleException}
            backRoute={previousRoute}
            historyStack={historyStackItems}
            handleOpenGuide={handleOpenGuide}
          >
            {children}
          </LeftSidebarLayout>
        )
      }
      { /* Left Big-Sidebar Layout */
        layout === 'big-sidebar' && (
         <LeftSidebarBigLayout
            history={history}
            toggleDrawer={toggleDrawer}
            loadTransition={loadTransition}
            changeMode={changeMode}
            sidebarOpen={sidebarOpen}
            pageLoaded={pageLoaded}
            gradient={gradient}
            deco={deco}
            bgPosition={bgPosition}
            mode={mode}
            place={pageTitle}
            titleException={titleException}
            backRoute={previousRoute}
            historyStack={historyStackItems}
            handleOpenGuide={handleOpenGuide}
          >
            {children}
          </LeftSidebarBigLayout>
        )
      }
      { /* Right Sidebar Layout */
        layout === 'right-sidebar' && (
         <RightSidebarLayout
            history={history}
            toggleDrawer={toggleDrawer}
            loadTransition={loadTransition}
            changeMode={changeMode}
            sidebarOpen={sidebarOpen}
            pageLoaded={pageLoaded}
            mode={mode}
            gradient={gradient}
            deco={deco}
            bgPosition={bgPosition}
            place={pageTitle}
            titleException={titleException}
            backRoute={previousRoute}
            historyStack={historyStackItems}
            handleOpenGuide={handleOpenGuide}
          >
            {children}
          </RightSidebarLayout>
        )
      }
      { /* Top Bar with Dropdown Menu */
        layout === 'top-navigation' && (
         <DropMenuLayout
            history={history}
            toggleDrawer={toggleDrawer}
            loadTransition={loadTransition}
            changeMode={changeMode}
            sidebarOpen={sidebarOpen}
            pageLoaded={pageLoaded}
            mode={mode}
            gradient={gradient}
            deco={deco}
            bgPosition={bgPosition}
            place={pageTitle}
            titleException={titleException}
            backRoute={previousRoute}
            historyStack={historyStackItems}
            handleOpenGuide={handleOpenGuide}
          >
            {children}
          </DropMenuLayout>
        )
      }
      { /* Top Bar with Mega Menu */
        layout === 'mega-menu' && (
         <MegaMenuLayout
            history={history}
            toggleDrawer={toggleDrawer}
            loadTransition={loadTransition}
            changeMode={changeMode}
            sidebarOpen={sidebarOpen}
            pageLoaded={pageLoaded}
            mode={mode}
            gradient={gradient}
            deco={deco}
            bgPosition={bgPosition}
            place={pageTitle}
            titleException={titleException}
            backRoute={previousRoute}
            historyStack={historyStackItems}
            handleOpenGuide={handleOpenGuide}
          >
            {children}
          </MegaMenuLayout>
        )
      }
    </div>
  );
}

Dashboard.propTypes = {

  children: PropTypes.node.isRequired,
  history: PropTypes.object.isRequired,
  initialOpen: PropTypes.func.isRequired,
  toggleDrawer: PropTypes.func.isRequired,
  loadTransition: PropTypes.func.isRequired,
  changeMode: PropTypes.func.isRequired,
  sidebarOpen: PropTypes.bool.isRequired,
  pageLoaded: PropTypes.bool.isRequired,
  mode: PropTypes.string.isRequired,
  gradient: PropTypes.bool.isRequired,
  deco: PropTypes.bool.isRequired,
  bgPosition: PropTypes.string.isRequired,
  layout: PropTypes.string.isRequired
};

const mapStateToProps = state => ({
  sidebarOpen: state.ui.sidebarOpen,
  pageLoaded: state.ui.pageLoaded,
  mode: state.ui.type,
  gradient: state.ui.gradient,
  deco: state.ui.decoration,
  layout: state.ui.layout,
  bgPosition: state.ui.bgPosition,
});

const mapDispatchToProps = dispatch => ({
  toggleDrawer: () => dispatch(toggleAction()),
  initialOpen: bindActionCreators(openAction, dispatch),
  loadTransition: bindActionCreators(playTransitionAction, dispatch),
});

const DashboardMaped = connect(
  mapStateToProps,
  mapDispatchToProps
)(Dashboard);

export default DashboardMaped;
