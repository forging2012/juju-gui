/* Copyright (C) 2017 Canonical Ltd. */
'use strict';

const PropTypes = require('prop-types');
const React = require('react');

const ButtonDropdown = require('../button-dropdown/button-dropdown');
/**
  Provides a user menu to the header - shows Profile, Account and Logout links.
  If user is not logged in the user icon is replaced with a login button.
*/
class UserMenu extends React.Component {

  _toggleDropdown() {
    this.refs.buttonDropdown._toggleDropdown();
  }

  _handleProfileClick() {
    this.props.navigateUserProfile();
    this._toggleDropdown();
  }

  render() {
    const controllerAPI = this.props.controllerAPI;
    const showLogin = controllerAPI && !controllerAPI.userIsAuthenticated;
    return (
      <ButtonDropdown
        classes={['user-menu']}
        ref="buttonDropdown"
        icon={showLogin ? this.props.USSOLoginLink : 'user_16'}
        disableDropdown={showLogin}
        listItems={[
          <li className="dropdown-menu__list-item"
            role="menuitem" tabIndex="0" key="profile">
            <a className="dropdown-menu__list-item-link"
              role="button"
              onClick={this._handleProfileClick.bind(this)}>Profile</a>
          </li>,
          <li className="dropdown-menu__list-item"
            role="menuitem" tabIndex="0" key="help">
            <a className="dropdown-menu__list-item-link"
              role="button"
              onClick={this.props.showHelp.bind(this)}>GUI help</a>
          </li>,
          <li className="dropdown-menu__list-item"
            role="menuitem" tabIndex="0" key="logout">
            {this.props.LogoutLink}
          </li>
        ]}
        tooltip={showLogin ? '' : 'user'} />);
  }
};

UserMenu.propTypes = {
  LogoutLink: PropTypes.object,
  USSOLoginLink: PropTypes.object,
  controllerAPI: PropTypes.object,
  navigateUserProfile: PropTypes.func.isRequired,
  showHelp: PropTypes.func.isRequired
};

module.exports = UserMenu;
