/*
This file is part of the Juju GUI, which lets users view and manage Juju
environments within a graphical interface (https://launchpad.net/juju-gui).
Copyright (C) 2017 Canonical Ltd.

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License version 3, as published by
the Free Software Foundation.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranties of MERCHANTABILITY,
SATISFACTORY QUALITY, or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero
General Public License for more details.

You should have received a copy of the GNU Affero General Public License along
with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';

YUI.add('deployment-payment', function() {

  juju.components.DeploymentPayment = React.createClass({
    displayName: 'DeploymentPayment',

    propTypes: {
      acl: React.PropTypes.object.isRequired,
      addNotification: React.PropTypes.func.isRequired,
      createToken: React.PropTypes.func,
      createUser: React.PropTypes.func,
      getCountries: React.PropTypes.func,
      getUser: React.PropTypes.func,
      paymentUser: React.PropTypes.object,
      setPaymentUser: React.PropTypes.func.isRequired,
      username: React.PropTypes.string.isRequired,
      validateForm: React.PropTypes.func.isRequired
    },

    getInitialState: function() {
      this.xhrs = [];
      return {
        billingAddressSame: true,
        business: false,
        cardAddressSame: true,
        countries: [],
        loading: false
      };
    },

    componentWillMount: function() {
      this._getUser();
      this._getCountries();
    },

    componentWillUnmount: function() {
      this.xhrs.forEach((xhr) => {
        xhr && xhr.abort && xhr.abort();
      });
    },

    /**
      Get the payment details for the user.

      @method _getUser
    */
    _getUser: function() {
      this.setState({loading: true}, () => {
        const xhr = this.props.getUser(this.props.username, (error, user) => {
          if (error && error !== 'not found') {
            const message = 'Could not load user info';
            this.props.addNotification({
              title: message,
              message: `${message}: ${error}`,
              level: 'error'
            });
            console.error(message, error);
            return;
          }
          this.setState({loading: false}, () => {
            this.props.setPaymentUser(user);
          });
        });
        this.xhrs.push(xhr);
      });
    },

    /**
      Get a list of countries.

      @method _getCountries
    */
    _getCountries: function() {
      const xhr = this.props.getCountries((error, countries) => {
        if (error) {
          const message = 'Could not load country info';
          this.props.addNotification({
            title: message,
            message: `${message}: ${error}`,
            level: 'error'
          });
          console.error(message, error);
          return;
        }
        this.setState({countries: countries || []});
      });
      this.xhrs.push(xhr);
    },

    /**
      Validate the form.

      @method _validateForm
      @returns {Boolean} Whether the form is valid.
    */
    _validateForm: function() {
      let fields = [
        'emailAddress',
        'userAddress',
        'cardExpiry',
        'cardNumber',
        'cardCVC',
        'cardName'
      ];
      if (this.state.business) {
        fields = fields.concat([
          'VATNumber',
          'businessName'
        ]);
      }
      if (!this.state.billingAddressSame) {
        fields.push('billingAddress');
      }
      if (!this.state.cardAddressSame) {
        fields.push('cardAddress');
      }
      return this.props.validateForm(fields, this.refs);
    },

    /**
      Get address data.

      @method _getAddress
      @param key {String} The identifier for the form instance.
    */
    _getAddress: function(key) {
      const address = this.refs[`${key}Address`].getValue();
      return {
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postcode: address.poscode,
        countryCode: address.countryCode,
        phones: address.phones
      };
    },

    /**
      Handle creating the card and user.

      @method _handleAddUser
    */
    _handleAddUser: function() {
      const valid = this._validateForm();
      if (!valid) {
        return;
      }
      const refs = this.refs;
      const cardAddress = this.refs[
        `${this.state.cardAddressSame ? 'user' : 'card'}Address`].getValue();
      const expiry = refs.cardExpiry.getValue().split('/');
      const expiryMonth = expiry[0];
      const expiryYear = expiry[1];
      const card = {
        number: refs.cardNumber.getValue().replace(/ /g, ''),
        cvc: refs.cardCVC.getValue(),
        expMonth: expiryMonth,
        expYear: expiryYear,
        name: refs.cardName.getValue(),
        addressLine1: cardAddress.line1,
        addressLine2: cardAddress.line2,
        addressCity: cardAddress.city,
        addressState: cardAddress.state,
        addressZip: cardAddress.postcode,
        addressCountry: cardAddress.countryCode
      };
      const xhr = this.props.createToken(card, (error, token) => {
        if (error) {
          const message = 'Could not create Stripe token';
          this.props.addNotification({
            title: message,
            message: `${message}: ${error}`,
            level: 'error'
          });
          console.error(message, error);
          return;
        }
        this._createUser(token.id);
      });
      this.xhrs.push(xhr);
    },

    /**
      Create a payment user.

      @method _createUser
      @param token {String} A Stripe token.
    */
    _createUser: function(token) {
      const refs = this.refs;
      const business = this.state.business;
      const address = this.refs.userAddress.getValue();
      let billingAddress;
      if (this.state.billingAddressSame) {
        billingAddress = address;
      } else {
        billingAddress = this.refs.billingAddress.getValue();
      }
      const user = {
        name: address.name,
        email: refs.emailAddress.getValue(),
        addresses: [address],
        vat: business && refs.VATNumber.getValue() || null,
        business: business,
        businessName: business && refs.businessName.getValue() || null,
        billingAddresses: [billingAddress],
        token: token,
        paymentMethodName: 'Default'
      };
      const xhr = this.props.createUser(user, (error, user) => {
        if (error) {
          const message = 'Could not create a payment user';
          this.props.addNotification({
            title: message,
            message: `${message}: ${error}`,
            level: 'error'
          });
          console.error(message, error);
          return;
        }
        // Reload the user as one should exist now.
        this._getUser();
      });
      this.xhrs.push(xhr);
    },

    /**
      Generate the details for the payment method.

      @method _generatePaymentMethods
    */
    _generatePaymentMethods: function() {
      const methods = this.props.paymentUser.paymentMethods.map((method, i) => {
        return (
          <li className="deployment-payment__method"
            key={method.name + i}>
            <juju.components.AccountPaymentMethodCard
              card={method} />
          </li>);
      });
      return (
        <ul className="deployment-payment__methods twelve-col">
          {methods}
        </ul>);
    },

    /**
      Handle updating the number with the correct spacing.

      @method _handleNumberChange
    */
    _handleNumberChange: function() {
      this.refs.cardNumber.setValue(
        this._formatCardNumber(this.refs.cardNumber.getValue()));
      // TODO: when we have card logos we should update the logo for the card
      // type here.
    },

    /**
      Format the credit card number. Stripe accepts Visa, MasterCard, American
      Express, JCB, Discover, and Diners Club, of which all are spaced in blocks
      four except American Express.

      @method _formatCardNumber
      @param number {String} A full or partial card number.
    */
    _formatCardNumber: function(number) {
      const provider = this._getCardProvider(number);
      if (!provider) {
        return number;
      }
      let parts = [];
      let position = 0;
      // Clean all the spaces from the card number.
      number = number.replace(/ /g, '');
      // Loop through the blocks.
      provider.blocks.forEach(block => {
        // Store the block of numbers.
        parts.push(number.slice(position, position + block));
        position += block;
      });
      // Join the new blocks with spaces.
      return parts.join(' ');
    },

    /**
      Get the details of the card provider from the card number.

      @method _getCardProvider
      @param number {String} A full or partial card number.
    */
    _getCardProvider: function(number) {
      // Clean all the spaces from the card number.
      number = number.replace(/ /g, '');
      // Define the blocks for the different card providers. Defaulting to the
      // most common.
      const providers = [{
        name: 'American Express',
        // Prefix: 34, 37
        numbers: /^(34|37)/,
        blocks: [4, 6, 5]
      }, {
        name: 'Visa',
        // Prefix: 4
        numbers: /^4/,
        blocks: [4, 4, 4, 4]
      }, {
        name: 'MasterCard',
        // Prefix: 50-55
        numbers: /^5[1-5]/,
        blocks: [4, 4, 4, 4]
      }, {
        name: 'Discover',
        // Prefix: 	6011, 622126-622925, 644-649, 65
        numbers: /^(65|6011|(64[4-9])|(622\d\d\d))/,
        blocks: [4, 4, 4, 4]
      }, {
        name: 'Diners Club',
        // Prefix: 300-305, 309, 36, 38-39
        numbers: /^((30[0-5])|309|36|(3[8-9]))/,
        blocks: [4, 4, 4, 4]
      }, {
        name: 'JCB',
        // Prefix: 3528-3589
        numbers: /^(35\d\d)/,
        blocks: [4, 4, 4, 4]
      }];
      let match;
      providers.some(provider => {
        if (provider.numbers.test(number)) {
          match = provider;
          return true;
        }
      });
      return match || null;
    },

    /**
      Generate the details for the payment method.

      @method _generatePaymentForm
    */
    _generatePaymentForm: function() {
      const disabled = this.props.acl.isReadOnly();
      const required = {
        regex: /\S+/,
        error: 'This field is required.'
      };
      return (
        <form className="deployment-payment__form">
          <div className="deployment-payment__form-content">
            <ul className="deployment-payment__form-type">
              <li className="deployment-payment__form-type-option">
                <label htmlFor="personal">
                  <input checked={!this.state.business}
                    id="personal"
                    name="formType"
                    onChange={this._setFormType.bind(this, false)}
                    type="radio" />
                  Personal use
                </label>
              </li>
              <li className="deployment-payment__form-type-option">
                <label htmlFor="business">
                  <input checked={this.state.business}
                    id="business"
                    name="formType"
                    onChange={this._setFormType.bind(this, true)}
                    type="radio" />
                  Business use
                </label>
              </li>
            </ul>
            {this._generateVATField()}
            <h2 className="deployment-payment__title">
              Name and address
            </h2>
            {this._generateBusinessNameField()}
            <juju.components.GenericInput
              disabled={disabled}
              label="Email address"
              ref="emailAddress"
              required={true}
              validate={[required]} />
            <juju.components.AddressForm
              acl={this.props.acl}
              addNotification={this.props.addNotification}
              getCountries={this.props.getCountries}
              ref="userAddress"
              validateForm={this.props.validateForm} />
            <h2 className="deployment-payment__title">
              Payment information
            </h2>
            <juju.components.GenericInput
              disabled={disabled}
              label="Card number"
              onChange={this._handleNumberChange}
              ref="cardNumber"
              required={true}
              validate={[required, {
                regex: /^[a-zA-Z0-9_-\s]{16,}/,
                error: 'The card number is too short.'
              }, {
                regex: /^[a-zA-Z0-9_-\s]{0,23}$/,
                error: 'The card number is too long.'
              }, {
                regex: /^[0-9\s]+$/,
                error: 'The card number can only contain numbers.'
              }]} />
            <div className="twelve-col no-margin-bottom">
              <div className="six-col no-margin-bottom">
                <juju.components.GenericInput
                  disabled={disabled}
                  label="Expiry MM/YY"
                  ref="cardExpiry"
                  required={true}
                  validate={[required, {
                    regex: /[\d]{2}\/[\d]{2}/,
                    error: 'The expiry must be in the format MM/YY'
                  }]} />
              </div>
              <div className="six-col last-col no-margin-bottom">
                <juju.components.GenericInput
                  disabled={disabled}
                  label="Security number (CVC)"
                  ref="cardCVC"
                  required={true}
                  validate={[required, {
                    regex: /^[0-9]{3}$/,
                    error: 'The CVC must be three characters long.'
                  }, {
                    regex: /^[0-9]+$/,
                    error: 'The CVC can only contain numbers.'
                  }]} />
              </div>
            </div>
            <div className="twelve-col">
              <juju.components.GenericInput
                disabled={disabled}
                label="Name on card"
                ref="cardName"
                required={true}
                validate={[required]} />
            </div>
            <label htmlFor="cardAddressSame">
              <input checked={this.state.cardAddressSame}
                id="cardAddressSame"
                name="cardAddressSame"
                onChange={this._handleCardSameChange}
                ref="cardAddressSame"
                type="checkbox" />
              Credit or debit card address is the same as above
            </label>
            <label htmlFor="billingAddressSame">
              <input checked={this.state.billingAddressSame}
                id="billingAddressSame"
                name="billingAddressSame"
                onChange={this._handleBillingSameChange}
                ref="billingAddressSame"
                type="checkbox" />
              Billing address is the same as above
            </label>
            {this._generateCardAddressFields()}
            {this._generateBillingAddressFields()}
          </div>
          <div className="deployment-payment__add">
            <juju.components.GenericButton
              action={this._handleAddUser}
              disabled={disabled}
              type="inline-neutral"
              title="Add payment details" />
          </div>
        </form>);
    },

    /**
      Generate the country values for a select box.

      @method _generateCountryOptions
      @returns {Array} The list of country options.
    */
    _generateCountryOptions: function() {
      return this.state.countries.map(country => {
        return {
          label: country.name,
          value: country.code
        };
      });
    },

    /**
      Generate the country code values for a select box.

      @method _generateCountryCodeOptions
      @returns {Array} The list of country code options.
    */
    _generateCountryCodeOptions: function() {
      return this.state.countries.map(country => {
        return {
          label: country.code,
          value: country.code
        };
      });
    },

    /**
      Update the state when the billing checkbox changes.

      @method _handleBillingSameChange
      @param {Object} The change event from the checkbox.
    */
    _handleBillingSameChange: function(e) {
      this.setState({billingAddressSame: e.currentTarget.checked});
    },

    /**
      Update the state when the card checkbox changes.

      @method _handleCardSameChange
      @param {Object} The change event from the checkbox.
    */
    _handleCardSameChange: function(e) {
      this.setState({cardAddressSame: e.currentTarget.checked});
    },

    /**
      Generate the fields for the card address.

      @method _generateCardAddressFields
    */
    _generateCardAddressFields: function() {
      if (this.state.cardAddressSame) {
        return null;
      }
      return (
        <div>
          <h2 className="deployment-payment__title">
            Card address
          </h2>
          <juju.components.AddressForm
            acl={this.props.acl}
            addNotification={this.props.addNotification}
            getCountries={this.props.getCountries}
            ref="cardAddress"
            validateForm={this.props.validateForm} />
        </div>);
    },

    /**
      Generate the fields for the billing address.

      @method _generateBillingAddressFields
    */
    _generateBillingAddressFields: function() {
      if (this.state.billingAddressSame) {
        return null;
      }
      return (
        <div>
          <h2 className="deployment-payment__title">
            Billing address
          </h2>
          <juju.components.AddressForm
            acl={this.props.acl}
            addNotification={this.props.addNotification}
            getCountries={this.props.getCountries}
            ref="billingAddress"
            validateForm={this.props.validateForm} />
        </div>);
    },

    /**
      Generate the VAT field if required.

      @method _generateVATField
    */
    _generateVATField: function() {
      if (!this.state.business) {
        return null;
      }
      return (
        <div className="deployment-payment__vat">
          <juju.components.GenericInput
            disabled={this.props.acl.isReadOnly()}
            label="VAT number (optional)"
            ref="VATNumber"
            required={false} />
        </div>);
    },

    /**
      Generate the business name field if required.

      @method _generateBusinessNameField
    */
    _generateBusinessNameField: function() {
      if (!this.state.business) {
        return null;
      }
      return (
        <juju.components.GenericInput
          disabled={this.props.acl.isReadOnly()}
          label="Business name"
          ref="businessName"
          required={true}
          validate={[{
            regex: /\S+/,
            error: 'This field is required.'
          }]} />);
    },

    /**
      Update the state with the form type.

      @method _setFormType
      @param {Boolean} Whether the form is for a business.
    */
    _setFormType: function(business) {
      this.setState({business: business});
    },

    render: function() {
      let content;
      if (this.state.loading) {
        content = (
          <juju.components.Spinner />);
      } else if (this.props.paymentUser) {
        content = this._generatePaymentMethods();
      } else {
        content = this._generatePaymentForm();
      }
      return (
        <div className="deployment-payment">
          {content}
        </div>
      );
    }

  });

}, '0.1.0', {
  requires: [
    'account-payment-method-card',
    'address-form',
    'generic-button',
    'generic-input',
    'inset-select',
    'loading-spinner'
  ]
});
