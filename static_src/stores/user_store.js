
/*
 * Store for user data. Will store and update user data on changes from UI and
 * server.
 */

import Immutable from 'immutable';

import BaseStore from './base_store.js';
import cfApi from '../util/cf_api.js';
import { userActionTypes } from '../constants.js';

// TODO why is this role mapping needed?
const resourceToRole = {
  space: {
    managers: 'space_manager',
    developers: 'space_developer',
    auditors: 'space_auditor'
  },
  org: {
    managers: 'org_manager',
    billing_managers: 'billing_manager',
    auditors: 'org_auditor'
  }
};

export class UserStore extends BaseStore {
  constructor() {
    super();
    this.subscribe(() => this._registerToActions.bind(this));
    this._data = new Immutable.List();
    this._currentViewedType = 'space_users';
    this._currentUserGuid = null;
    this._currentUserIsAdmin = false;
    this._error = null;
    this._loading = {};
    this._inviteInputActive = true;
  }

  _registerToActions(action) {
    switch (action.type) {
      case userActionTypes.ORG_USERS_FETCH: {
        this.load([cfApi.fetchOrgUsers(action.orgGuid)]);
        this.emitChange();
        break;
      }

      case userActionTypes.ORG_USER_ROLES_FETCH: {
        this.load([cfApi.fetchOrgUserRoles(action.orgGuid)]);
        this.emitChange();
        break;
      }

      case userActionTypes.SPACE_USER_ROLES_FETCH: {
        this.load([cfApi.fetchSpaceUserRoles(action.spaceGuid)]);
        this.emitChange();
        break;
      }

      case userActionTypes.ORG_USER_ROLES_RECEIVED: {
        const updatedUsers = this.mergeRoles(action.orgUserRoles, action.orgGuid,
          'organization_roles');
        this.mergeMany('guid', updatedUsers, () => { });
        this.emitChange();
        break;
      }

      case userActionTypes.SPACE_USER_ROLES_RECEIVED: {
        const updatedUsers = this.mergeRoles(action.users, action.spaceGuid,
          'space_roles');

        this.mergeMany('guid', updatedUsers, () => { });
        this.emitChange();
        break;
      }

      case userActionTypes.USER_INVITE_FETCH: {
        this._inviteError = null;
        this.emitChange();
        break;
      }

      case userActionTypes.USER_ORG_ASSOCIATED: {
        const user = Object.assign({},
          { roles: { [action.orgGuid]: [] } },
          action.user);
        this._inviteInputActive = true;
        if (user.guid) {
          this.merge('guid', user, () => {});
        }
        this.emitChange();
        break;
      }

      case userActionTypes.USER_ROLES_ADD: {
        break;
      }

      case userActionTypes.USER_ROLES_ADDED: {
        const user = this.get(action.userGuid);
        const addedRole = action.roles;
        if (user) {
          if (!user.roles) user.roles = {};
          const updatedRoles = new Set(user.roles[action.entityGuid] || []);
          updatedRoles.add(addedRole);
          user.roles[action.entityGuid] = Array.from(updatedRoles);

          this.merge('guid', user, (changed) => {
            if (changed) this.emitChange();
          });
        }
        break;
      }

      case userActionTypes.USER_ROLES_DELETE: {
        break;
      }

      case userActionTypes.USER_ROLES_DELETED: {
        const user = this.get(action.userGuid);
        const deletedRole = action.roles;
        if (user) {
          const roles = user.roles && user.roles[action.entityGuid];
          if (roles) {
            const idx = deletedRole && roles.indexOf(deletedRole);
            if (idx > -1) {
              roles.splice(idx, 1);
            }
          }

          this.merge('guid', user, (changed) => {
            if (changed) this.emitChange();
          });
        }
        break;
      }

      case userActionTypes.ORG_USERS_RECEIVED: {
        const orgGuid = action.orgGuid;
        const orgUsers = action.users;

        const updatedUsers = orgUsers.map((orgUser) =>
          Object.assign({}, orgUser, { orgGuid })
        );

        this.mergeMany('guid', updatedUsers, (changed) => {
          if (changed) {
            this._error = null;
          }
          this.emitChange();
        });
        break;
      }

      case userActionTypes.USER_DELETE: {
        const orgPermissionsReq = cfApi.deleteOrgUserPermissions(
          action.userGuid,
          action.orgGuid,
          'users');

        orgPermissionsReq.then(() => {
          cfApi.deleteUser(action.userGuid, action.orgGuid);
        });

        break;
      }

      case userActionTypes.USER_DELETED: {
        this.delete(action.userGuid, (changed) => {
          if (changed) this.emitChange();
        });
        break;
      }

      case userActionTypes.ERROR_REMOVE_USER: {
        this._error = action.error;
        this.emitChange();
        break;
      }

      case userActionTypes.USER_INVITE_ERROR: {
        this._inviteError = Object.assign({}, action.err, {
          contextualMessage: action.contextualMessage
        });
        this.emitChange();
        break;
      }

      case userActionTypes.CURRENT_USER_INFO_RECEIVED: {
        const guid = action.currentUser.user_id;
        const userInfo = Object.assign(
          {},
          action.currentUser,
          { guid }
        );
        this.merge('guid', userInfo, () => {
          this._currentUserGuid = guid;

          // Always emit change
          this.emitChange();
        });
        break;
      }

      case userActionTypes.CURRENT_UAA_INFO_RECEIVED: {
        const uaaInfo = action.currentUaaInfo;
        this._currentUserIsAdmin = false;

        if (uaaInfo.groups) {
          // Check for UAA permissions here.
          // If the response does not have and object in the groups array
          // with a display key that equals 'cloud_controller.admin',
          // then return is false.
          // If there is a proper response, then the return is true.
          this._currentUserIsAdmin = !!(uaaInfo.groups.find((group) => (
            group.display === 'cloud_controller.admin'
          )));
        }

        // Always emit change
        this.emitChange();
        break;
      }

      case userActionTypes.USER_FETCH: {
        this.merge('guid', { guid: action.userGuid, fetching: true });
        break;
      }

      case userActionTypes.USER_RECEIVED: {
        const receivedUser = Object.assign({}, action.user, { fetching: false });
        if (action.user) {
          this.merge('guid', receivedUser);
        }
        break;
      }

      case userActionTypes.CURRENT_USER_FETCH: {
        this._loading.currentUser = true;
        this.emitChange();
        break;
      }

      case userActionTypes.CURRENT_USER_RECEIVED: {
        this._loading.currentUser = false;
        this.emitChange();
        break;
      }

      case userActionTypes.USER_CHANGE_VIEWED_TYPE: {
        if (this._currentViewedType !== action.userType) {
          this._currentViewedType = action.userType;
          this.emitChange();
        }
        break;
      }

      default:
        break;
    }
  }

  /**
   * Get all users in a certain space
   */
  getAllInSpace(spaceGuid) {
    const usersInSpace = this._data.filter((user) =>
      !!user.get('roles') && !!user.get('roles').get(spaceGuid)
    );
    return usersInSpace.toJS();
  }

  getAllInOrg(orgGuid) {
    const usersInOrg = this._data.filter((user) =>
      !!user.get('roles') && !!user.get('roles').get(orgGuid)
    );
    return usersInOrg.toJS();
  }

  getError() {
    return this._error;
  }

  getResourceToRole(resource, entityType) {
    if (entityType !== 'space' && entityType !== 'org') {
      throw new Error(`unknown resource type ${entityType}`);
    }
    const role = resourceToRole[entityType][resource] || resource;
    return role;
  }

  get currentlyViewedType() {
    return this._currentViewedType;
  }

  get isLoadingCurrentUser() {
    return this._loading.currentUser === true;
  }

  mergeRoles(roles, entityGuid, entityType) {
    return roles.map((role) => {
      const user = Object.assign({}, this.get(role.guid) || { guid: role.guid });
      if (!user.roles) user.roles = {};
      const updatingRoles = role[entityType] || [];

      user.roles[entityGuid] = updatingRoles;
      return user;
    });
  }

  /*
   * Returns if a user with userGuid has ANY role within the enity of the
   * entityGuid.
   * @param {string} userGuid - The guid of the user.
   * @param {string} entityGuid - The guid of the entity (space or org) to
   * check roles for.
   * @param {string|array} roleToCheck - Either a single role as a string or
   * an array of roles to check if the user has ANY of the roles.
   * @return {boolean} Whether the user has the role.
   */
  hasRole(userGuid, entityGuid, roleToCheck) {
    if (this.isAdmin()) {
      return true;
    }

    let wrappedRoles = roleToCheck;
    if (!Array.isArray(roleToCheck)) {
      wrappedRoles = [roleToCheck];
    }

    const key = entityGuid;
    const user = this.get(userGuid);
    const roles = user && user.roles && user.roles[key] || [];
    return !!roles.find((role) => wrappedRoles.includes(role));
  }

  isAdmin() {
    return this._currentUserIsAdmin;
  }

  getInviteError() {
    return this._inviteError;
  }

  get currentUser() {
    return this.get(this._currentUserGuid);
  }

}

const _UserStore = new UserStore();

export default _UserStore;
