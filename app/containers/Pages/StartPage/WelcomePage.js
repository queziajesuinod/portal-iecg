import React from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock } from 'dan-components';

const WelcomePage = () => (
  <div>
    <Helmet>
      <title>Bem-vindo(a) ao Portal IECG</title>
      <meta name="description" content="Pagina inicial do sistema" />
    </Helmet>
    <PapperBlock title="Bem-vindo(a)!" desc="Portal administrativo IECG">
      <p>
        Utilize o menu lateral para acessar as funcionalidades do sistema.
      </p>
    </PapperBlock>
  </div>
);

export default WelcomePage;
