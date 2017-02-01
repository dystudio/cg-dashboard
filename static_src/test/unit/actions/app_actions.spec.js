
import '../../global_setup.js';

import AppDispatcher from '../../../dispatcher.js';
import { assertAction, setupUISpy, setupViewSpy, setupServerSpy } from '../helpers.js';
import cfApi from '../../../util/cf_api.js';
import appActions from '../../../actions/app_actions.js';
import { appActionTypes } from '../../../constants.js';
import poll from '../../../util/poll.js';
import * as pollUtil from '../../../util/poll.js';

describe('appActions', function() {
  var sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('fetch()', function() {
    it('should dispatch a view event of type app fetch', function() {
      var expectedAppGuid = 'asdflkjz',
          expectedParams = {
            appGuid: expectedAppGuid
          };

      let spy = setupViewSpy(sandbox)

      appActions.fetch(expectedAppGuid);

      assertAction(spy, appActionTypes.APP_FETCH,
                   expectedParams);
    });
  });

  describe('fetchAll()', function () {
    it('should dispatch a view event of type app all fetch', function() {
      const expectedAppGuid = 'asdflkjzzz1';
      const expectedParams = {
        appGuid: expectedAppGuid
      };

      const spy = setupViewSpy(sandbox);

      appActions.fetchAll(expectedAppGuid);

      assertAction(spy, appActionTypes.APP_ALL_FETCH, expectedParams);
    });
  });

  describe('fetchStats()', function() {
    it('should dispatch a view event of type app stats fetch', function() {
      var expectedAppGuid = 'asdflkjzzz1',
          expectedParams = {
            appGuid: expectedAppGuid
          };

      let spy = setupViewSpy(sandbox)

      appActions.fetchStats(expectedAppGuid);

      assertAction(spy, appActionTypes.APP_STATS_FETCH,
                   expectedParams)
    });
  });

  describe('receivedApp()', function() {
    it('should dispatch a server event of type app resv with app data',
        function() {
      var expected = { guid: 'asdfa', service: [] },
          expectedParams = {
            app: expected
          };

      let spy = setupServerSpy(sandbox)

      appActions.receivedApp(expected);

      assertAction(spy, appActionTypes.APP_RECEIVED,
                   expectedParams)
    });
  });

  describe('receivedAppStats()', function() {
    it('should dispatch a server event of type app stat resv with app data',
        function() {
      var expected = { guid: 'asdfazzzb', service: [] },
          expectedParams = {
            appGuid: expected.guid,
            app: expected
          };

      let spy = setupServerSpy(sandbox);

      appActions.receivedAppStats(expected.guid, expected);

      assertAction(spy, appActionTypes.APP_STATS_RECEIVED,
                   expectedParams)
    });
  });

  describe('receivedAppAll()', function() {
    it('should dispatch a server event of type app all received', function() {
      const appGuid = 'testingAppGuid';
      const spy = setupServerSpy(sandbox);

      appActions.receivedAppAll(appGuid);

      assertAction(spy, appActionTypes.APP_ALL_RECEIVED, {});
    });
  });

  describe('changeCurrentApp()', function() {
    it('should dispatch a ui event of type app changed with guid', function() {
      const appGuid = 'testingAppGuid';
      const expectedParams = {
        appGuid
      };
      const spy = setupUISpy(sandbox);

      appActions.changeCurrentApp(appGuid);

      assertAction(spy, appActionTypes.APP_CHANGE_CURRENT, {}, expectedParams);
    });
  });

  describe('updateApp()', function () {
    let appGuid, appPartial, viewSpy;

    beforeEach(function (done) {
      appGuid = 'zxc,vnadsfj';
      appPartial = { mem: 123 };

      sandbox.spy(appActions, 'updatedApp');
      sandbox.stub(cfApi, 'putApp').returns(Promise.resolve({ guid: appGuid, mem: 123 }));
      sandbox.stub(cfApi, 'fetchAppStatus')
        .returns(Promise.resolve({ guid: appGuid, running_instances: 1 }));

      viewSpy = setupViewSpy(sandbox);

      appActions.updateApp(appGuid, appPartial).then(done, done.fail);
    });

    it('should dispatch a view event of type app update with partial and guid', function () {
      const expectedParams = {
        appGuid,
        appPartial
      };

      assertAction(viewSpy, appActionTypes.APP_UPDATE, expectedParams);
    });

    it('should call cf api put app endpoint with guid and app partial', function () {
      expect(cfApi.putApp).toHaveBeenCalledOnce();

      const [guid, partial] = cfApi.putApp.getCall(0).args;
      expect(guid).toEqual(appGuid);
      expect(partial).toEqual(appPartial);
    });

    it('should call updated app action with app on success', function () {
      const expectedApp = { ...appPartial, guid: appGuid };

      expect(appActions.updatedApp).toHaveBeenCalledOnce();

      const app = appActions.updatedApp.getCall(0).args[0];
      expect(app).toEqual(expectedApp);
    });
  });

  describe('start()', function() {
    it('should dispatch a view event of type app start with guid', function() {
      sandbox.stub(appActions, 'restarted').returns(Promise.resolve());
      sandbox.stub(cfApi, 'putApp').returns(Promise.resolve());
      const appGuid = 'zzcvxkadsf';
      const expectedParams = {
        appGuid
      };
      let spy = setupViewSpy(sandbox)

      appActions.start(appGuid);

      assertAction(spy, appActionTypes.APP_START, expectedParams);
    });

    it('should call cf api put app with state started to restart the app',
        function(done) {
      const spy = sandbox.stub(cfApi, 'putApp').returns(Promise.resolve());
      sandbox.stub(appActions, 'restarted').returns(Promise.resolve());
      const expectedGuid = 'asdfasd2vdamcdksa';

      appActions.start(expectedGuid).then(() => {
        expect(spy).toHaveBeenCalledOnce();
        let arg = spy.getCall(0).args[0];
        expect(arg).toEqual(expectedGuid);
        done();
      }).catch(done.fail);
    });

    it('should call restarted with guid on success of request', function(done) {
      const spy = sandbox.stub(appActions, 'restarted').returns(Promise.resolve());
      const expectedGuid = 'znxmcv23i4yzxvc';

      appActions.start(expectedGuid).then(() => {
        expect(spy).toHaveBeenCalledOnce();
        let arg = spy.getCall(0).args[0];
        expect(arg).toEqual(expectedGuid);
        done();
      }).catch(done.fail);
    });
  });

  describe('restart()', function () {
    let appGuid, viewSpy;

    beforeEach(function (done) {
      appGuid = 'zvmn3hkl';
      viewSpy = setupViewSpy(sandbox);
      sandbox.stub(cfApi, 'postAppRestart').returns(Promise.resolve());
      sandbox.stub(cfApi, 'fetchAppStatus').returns(Promise.resolve({ running_instances: 1 }));
      sandbox.spy(appActions, 'restarted');

      appActions.restart(appGuid).then(done, done.fail);
    });

    it('should dispatch a view event of type app restart with guid', function () {
      const expectedParams = {
        appGuid
      };


      expect(viewSpy).toHaveBeenCalledWith(sinon.match({
        ...expectedParams,
        type: appActionTypes.APP_RESTART
      }));
    });

    it('should call cf api post to restart the app', function () {
      expect(cfApi.postAppRestart).toHaveBeenCalledOnce();

      const guid = cfApi.postAppRestart.getCall(0).args[0];
      expect(guid).toEqual(appGuid);
    });

    it('should poll until running instances is greater then 0', function () {
      expect(cfApi.fetchAppStatus).toHaveBeenCalledOnce();
    });

    it('calls restarted action', function () {
      expect(appActions.restarted).toHaveBeenCalledOnce();
    });
  });

  describe('restarted()', function () {
    it('should dispatch a server event of type app restarted', function () {
      const appGuid = '230894dgvk2r';
      const expectedParams = {
        appGuid
      };
      const spy = setupServerSpy(sandbox);

      appActions.restarted(appGuid);

      assertAction(spy, appActionTypes.APP_RESTARTED, expectedParams);
    });
  });

  describe('error()', function() {
    it('should dispatch server event of type app error', function() {
      const appGuid = '230894dzcxv234';
      const error = { status_code: 123 };
      const expectedParams = {
        appGuid,
        error
      };
      let spy = setupServerSpy(sandbox)

      appActions.error(appGuid, error);

      assertAction(spy, appActionTypes.APP_ERROR, expectedParams);
    });
  });
});
