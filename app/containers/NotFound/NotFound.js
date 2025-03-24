import React from 'react';
import { Helmet } from 'react-helmet';
import brand from 'dan-api/dummy/brand';
import { Route } from 'react-router-dom';
import { ErrorWrap } from 'dan-components';

const title = brand.name + ' - Página Não Encontrada';
const description = brand.desc;

const NotFound = () => (
  <Route
    render={({ staticContext }) => {
      if (staticContext) {
        staticContext.status = 404; // eslint-disable-line
      }
      return (
        <div>
          <Helmet>
            <title>{title}</title>
            <meta name="description" content={description} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="twitter:title" content={title} />
            <meta property="twitter:description" content={description} />
          </Helmet>
          <ErrorWrap title="404" desc="Oops, Página não encontrada:(" />
        </div>
      );
    }}
  />
);

export default NotFound;
