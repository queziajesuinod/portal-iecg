import React, { Fragment, useState } from 'react';
import PropTypes from 'prop-types';

import { Field, reduxForm } from 'redux-form';
import Button from '@mui/material/Button';
import { connect } from 'react-redux';
import { NavLink } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import InputAdornment from '@mui/material/InputAdornment';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import ArrowForward from '@mui/icons-material/ArrowForward';
import Paper from '@mui/material/Paper';
import useMediaQuery from '@mui/material/useMediaQuery';
import brand from 'dan-api/dummy/brand';
import logo from 'dan-images/logo.png';
import { TextFieldRedux } from './ReduxFormMUI';
import useStyles from './user-jss';

// validation functions
const required = value => (value === null ? 'Required' : undefined);
const email = value => (
  value && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(value)
    ? 'Invalid email'
    : undefined
);

const LinkBtn = React.forwardRef(function LinkBtn(props, ref) { // eslint-disable-line
  return <NavLink to={props.to} {...props} innerRef={ref} />; // eslint-disable-line
});

function LoginForm(props) {
  const { classes, cx } = useStyles();
  const [showPassword, setShowPassword] = useState(false);

  // Recuperação de senha ("Esqueci a senha")
  const [showRecover, setShowRecover] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverMsg, setRecoverMsg] = useState('');
  const [recoverLoading, setRecoverLoading] = useState(false);
  const API_URL = (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.replace(/\/$/, ''))
    || 'https://portal.iecg.com.br';

  const handleClickShowPassword = () => {
    setShowPassword(show => !show);
  };

  const handleMouseDownPassword = event => {
    event.preventDefault();
  };

  const handleForgotPassword = async () => {
    setRecoverMsg('');
    const emailVal = recoverEmail.trim();
    if (!emailVal) {
      setRecoverMsg('Informe seu e-mail para receber uma nova senha.');
      return;
    }
    setRecoverLoading(true);
    // Mensagem genérica sempre (não revela se o e-mail existe)
    const genericMsg = 'Se o e-mail estiver cadastrado, enviaremos uma nova senha em instantes.';
    try {
      const resp = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal }),
      });
      let msg = genericMsg;
      try {
        const d = await resp.json();
        if (d && d.message) msg = d.message;
      } catch (e) { /* mantém mensagem genérica */ }
      setRecoverMsg(msg);
    } catch (e) {
      setRecoverMsg(genericMsg);
    } finally {
      setRecoverLoading(false);
    }
  };

  const mdUp = useMediaQuery(theme => theme.breakpoints.up('md'));
  const mdDown = useMediaQuery(theme => theme.breakpoints.down('md'));

  const {
    handleSubmit,
    pristine,
    submitting,
    deco,
    error,
  } = props;
  return (
    <Fragment>
      {!mdUp && (
        <NavLink to="/" className={cx(classes.brand, classes.outer)}>
          <img src={logo} alt={brand.name} />
          {brand.name}
        </NavLink>
      )}
      <Paper className={cx(classes.paperWrap, deco && classes.petal)}>
        {!mdDown && (
          <div className={classes.topBar}>
            <NavLink to="/" className={classes.brand}>
              <img src={logo} alt={brand.name} />
              {brand.name}
            </NavLink>
          </div>
        )}
        <Typography variant="h4" className={classes.title} gutterBottom>
          Sign In
        </Typography>
        <Typography variant="caption" className={classes.subtitle} gutterBottom align="center">
         Painel de controle IECG
        </Typography>
        <section className={classes.formWrap}>
          {error && (
            <Alert severity="error" style={{ marginBottom: 16 }}>
              {error}
            </Alert>
          )}

          {!showRecover ? (
            <Fragment>
              <form onSubmit={handleSubmit}>
                <div>
                  <FormControl variant="standard" className={classes.formControl}>
                    <Field
                      name="email"
                      component={TextFieldRedux}
                      placeholder="Your Email"
                      label="Your Email"
                      required
                      validate={[required, email]}
                      className={classes.field}
                    />
                  </FormControl>
                </div>
                <div>
                  <FormControl variant="standard" className={classes.formControl}>
                    <Field
                      name="password"
                      component={TextFieldRedux}
                      type={showPassword ? 'text' : 'password'}
                      label="Your Password"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="Toggle password visibility"
                              onClick={handleClickShowPassword}
                              onMouseDown={handleMouseDownPassword}
                              size="large">
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                      required
                      validate={required}
                      className={classes.field}
                    />
                  </FormControl>
                </div>
                <div className={classes.btnArea}>
                  <Button variant="contained" color="primary" size="large" type="submit">
                    Continue
                    <ArrowForward className={cx(classes.rightIcon, classes.iconSmall)} disabled={submitting || pristine} />
                  </Button>
                </div>
              </form>

              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <Button
                  size="small"
                  onClick={() => { setRecoverMsg(''); setShowRecover(true); }}
                  style={{ textTransform: 'none' }}
                >
                  Esqueci minha senha
                </Button>
              </div>
            </Fragment>
          ) : (
            <div>
              <Typography variant="body2" gutterBottom>
                Informe seu e-mail e enviaremos uma nova senha.
              </Typography>
              <TextField
                fullWidth
                type="email"
                label="Seu e-mail"
                value={recoverEmail}
                onChange={e => setRecoverEmail(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <div className={classes.btnArea}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={recoverLoading}
                  onClick={handleForgotPassword}
                >
                  {recoverLoading ? 'Enviando...' : 'Enviar nova senha'}
                </Button>
              </div>
              {recoverMsg && (
                <Typography variant="body2" style={{ marginTop: 8 }}>
                  {recoverMsg}
                </Typography>
              )}
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <Button
                  size="small"
                  onClick={() => { setRecoverMsg(''); setShowRecover(false); }}
                  style={{ textTransform: 'none' }}
                >
                  Voltar ao login
                </Button>
              </div>
            </div>
          )}
        </section>
      </Paper>
    </Fragment>
  );
}

LoginForm.propTypes = {

  handleSubmit: PropTypes.func.isRequired,
  pristine: PropTypes.bool.isRequired,
  submitting: PropTypes.bool.isRequired,
  deco: PropTypes.bool.isRequired,
  error: PropTypes.string,
};

LoginForm.defaultProps = {
  error: null,
};

const LoginFormReduxed = reduxForm({
  form: 'loginForm',
  enableReinitialize: true,
})(LoginForm);

const FormInit = connect(
  state => ({
    force: state,
    initialValues: state.login.usersLogin,
    deco: state.ui.decoration
  }),
)(LoginFormReduxed);

export default FormInit;
