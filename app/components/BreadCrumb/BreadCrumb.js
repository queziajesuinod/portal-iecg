import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import useStyles from './breadCrumb-jss';
import { getPageTitle } from '../../config/pageTitles';

const Breadcrumbs = (props) => {
  const { classes, cx } = useStyles();
  const {
    theme,
    separator,
    location
  } = props;

  const pathname = location.pathname.replace(/\/+$/, '');
  const normalizedPath = pathname.replace(/^\/+/, '');
  const segments = normalizedPath.split('/');
  const placeKey = normalizedPath || 'app';
  const currentPageTitle = location?.state?.pageTitle || getPageTitle(placeKey);
  const parts = segments.slice(0, -1);

  return (
    <section className={cx(theme === 'dark' ? classes.dark : classes.light, classes.breadcrumbs)}>
      <p>
        Você está em:
        <span>
          {
            parts.map((part, partIndex) => {
              const pathParts = parts.slice(0, partIndex + 1).join('/');
              const linkPath = `/${pathParts}`;
              const partTitle = getPageTitle(pathParts || 'app');
              return (
                <Fragment key={linkPath}>
                  <Link to={linkPath}>{partTitle}</Link>
                  { separator }
                </Fragment>
              );
            })
          }
          &nbsp;
          {currentPageTitle}
        </span>
      </p>
    </section>
  );
};

Breadcrumbs.propTypes = {
  location: PropTypes.object.isRequired,
  theme: PropTypes.string.isRequired,
  separator: PropTypes.string.isRequired,
};

export default Breadcrumbs;
