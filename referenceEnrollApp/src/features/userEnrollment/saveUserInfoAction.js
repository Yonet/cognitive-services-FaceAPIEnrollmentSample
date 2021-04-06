import * as constants from '../../shared/constants';
import {CONFIG} from '../../env/env.json';
var RNFS = require('react-native-fs');

export const saveUserInfoAction = (username) => {
  return async (dispatch, getState) => {
    let infoSaved = true;
    let personId;

    let path = RNFS.DocumentDirectoryPath + '/enrollment/' + username + '.txt';
    console.log('path', path);
    let fileExists = await RNFS.exists(path);
    if (fileExists) {
      console.log('exists');
      let mapping = await RNFS.readFile(path, 'utf8');
      console.log('mapping', mapping);

      if (mapping && mapping != '') {
        personId = mapping.split(',')[1];
      }
    }

    console.log('pid');

    if (!personId) {
      let createPersonRgbEndpoint =
        CONFIG.FACEAPI_ENDPOINT +
        constants.PERSON_ENDPOINT(CONFIG.PERSONGROUP_RGB);

      let requestBody = {name: 'person-name'};
      let response = await fetch(createPersonRgbEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Ocp-Apim-Subscription-Key': CONFIG.FACEAPI_KEY,
        },
        body: JSON.stringify(requestBody),
      });

      if (response.status == '200') {
        let result = await response.text();
        personId = JSON.parse(result).personId;
        console.log('new pid', personId);

        let mappingdata = CONFIG.PERSONGROUP_RGB + ',' + personId;

        RNFS.writeFile(path, mappingdata, 'utf8')
          .then((success) => {
            console.log('FILE WRITTEN!');
          })
          .catch((err) => {
            console.log(' ERRRR', err.message);
          });

        infoSaved = true;
      } else {
        console.log('Create person failure: ', response);
        infoSaved = false;
      }
    }

    let userInfo = {
      username: username,
      personIdRgb: personId,
      personidIr: '',
    };

    dispatch(setUserInfo(userInfo));
    return infoSaved;
  };
};

export const setUserInfo = (userInfo) => ({
  type: 'SAVE_USERINFO',
  payload: userInfo,
});
