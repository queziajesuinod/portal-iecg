import React, { useState } from 'react';
import PropTypes from 'prop-types';

import { Link } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import ExitToApp from '@mui/icons-material/ExitToApp';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import dummy from 'dan-api/dummy/dummyContents';
import link from 'dan-api/ui/link';
import useStyles from './header-jss';
import { useHistory } from "react-router-dom";

function UserMenu(props) {
  const { classes, cx } = useStyles();
  const [menuState, setMenuState] = useState({
    anchorEl: null,
    openMenu: null
  });

  const handleMenu = menu => (event) => {
    const { openMenu } = menuState;
    setMenuState({
      openMenu: openMenu === menu ? null : menu,
      anchorEl: event.currentTarget
    });
  };

  const history = useHistory();

  const handleClose = () => {
    localStorage.removeItem("isAuthenticated");
    history.push("/login");
  };

  const handleProfile = () => {
    setMenuState({ anchorEl: null, openMenu: null }); // fecha o menu
    history.push("/app/profile");
  };

  const { dark } = props;
  const { anchorEl, openMenu } = menuState;
  return (
    <div>
      <Button onClick={handleMenu('user-setting')}>
        <Avatar
          alt={dummy.user.name}
          src={dummy.user.avatar}
        />
      </Button>
      <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={openMenu === 'user-setting'}
        onClose={'#'}
      >
        <MenuItem onClick={handleProfile} component={Link} >Meu Perfil</MenuItem>
        <Divider />
        <MenuItem onClick={handleClose} component={Link} to="/">
          <ListItemIcon>
            <ExitToApp />
          </ListItemIcon>
          Log Out
        </MenuItem>
      </Menu>
    </div>
  );
}

UserMenu.propTypes = {

  dark: PropTypes.bool,
};

UserMenu.defaultProps = {
  dark: false
};

export default UserMenu;
