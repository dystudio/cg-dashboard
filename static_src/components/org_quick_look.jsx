
import React from 'react';

import style from 'cloudgov-style/css/cloudgov-style.css';
import createStyler from '../util/create_styler';

import AppCountStatus from './app_count_status.jsx';
import EntityIcon from './entity_icon.jsx';
import SpaceCountStatus from './space_count_status.jsx';
import orgActions from '../actions/org_actions.js';
import spaceActions from '../actions/space_actions.js';

const propTypes = {
  org: React.PropTypes.object.isRequired,
  spaces: React.PropTypes.array
};

const defaultProps = {
  spaces: []
};

// TODO rename org_quicklook and org_quick_look to remain consistent with store.
export default class OrgQuickLook extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.styler = createStyler(style);

    this.onRowClick = this.onRowClick.bind(this);
    this.onOrgClick = this.onOrgClick.bind(this);
  }

  onRowClick(ev) {
    ev.preventDefault();
    if (!this.props.org.quicklook_open) {
      spaceActions.fetchAllForOrg(this.props.org.guid);
    }
    orgActions.toggleQuicklook(this.props.org.guid);
  }

  onOrgClick(ev) {
    ev.preventDefault();
    window.location.href = this.orgHref();
  }

  orgHref() {
    return `/#/org/${this.props.org.guid}`;
  }

  totalAppCount(spaces) {
    return spaces.reduce((sum, space) => sum + space.app_count, 0);
  }

  allApps() {
    return this.props.spaces.reduce((all, space) => {
      if (space.apps && space.apps.length) {
        return all.concat(space.apps);
      }
      return all;
    }, []);
  }

  render() {
    const props = this.props;
    const panelStyle = props.org.quicklook_open ? { marginBottom: '1rem' } : null;

    return (
    <div style={ panelStyle } onClick={ this.onRowClick }
      className={ this.styler('panel-row-is_clickable') }
    >
      <div className={ this.styler('panel-column') }>
        <h2 className={ this.styler('sans-s6') } onClick={ this.onOrgClick }>
          <EntityIcon entity="org" />
          <a href={ this.orgHref() }>{ props.org.name }</a>
        </h2>
      </div>
      <div className={ this.styler('panel-column') }>
        <SpaceCountStatus spaces={ props.org.spaces } />
        <AppCountStatus appCount={ this.totalAppCount(props.org.spaces) }
          apps={ this.allApps() }
        />
      </div>
    </div>
    );
  }
}

OrgQuickLook.propTypes = propTypes;
OrgQuickLook.defaultProps = defaultProps;