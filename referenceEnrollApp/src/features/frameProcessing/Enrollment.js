import React, {useEffect, useState} from 'react';
import {useDispatch} from 'react-redux';
import {
  processFrameForVerifyAction,
  processFrameForEnrollmentAction,
  trainAction,
} from './processFrameAction';
import {View, StyleSheet} from 'react-native';
import EnrollProgress from '../progress/EnrollProgress';
import {CONFIG} from '../../env/env.json';
import {CancellationToken, sleep} from '../../shared/helper';
import CustomButton from '../../styles/CustomButton';
import {ENROLL_RESULT} from '../../shared/constants';
import {deleteEnrollmentAction} from '../userEnrollment/newEnrollmentAction';

function Enrollment(props) {
  // State
  const [enrollStarted, setEnrollStarted] = useState(false);
  const [rgbProgress, setRgbProgress] = useState(0);
  const [cancelToken, setCancelToken] = useState(null);

  // Dispatch
  const dispatch = useDispatch();
  const dispatchForEnrollment = async (frame) =>
    dispatch(await processFrameForEnrollmentAction(frame));
  const dispatchForVerify = async (frame) =>
    dispatch(await processFrameForVerifyAction(frame));
  const dispatchDelete = async () => dispatch(await deleteEnrollmentAction());
  const dispatchTrain = async () => dispatch(await trainAction());

  useEffect(() => {
    /*
        Create cancellation token when component mounts
        token will cancel during cancel click or timeout
        */
    setCancelToken(new CancellationToken());
  }, []);

  // Dispatches action to enroll / verify an image blob
  const dispatchFrameActionAsync = (blob, dispatcher) =>
    new Promise(async (resolve) => {
      let result = await dispatcher(blob);
      resolve(result);
    });

  // Takes picture to Enroll
  async function takePictureAndEnroll() {
    let frameData = await props.takePicture();

    if (!frameData) {
      return false;
    }

    return await dispatchFrameActionAsync(frameData, dispatchForEnrollment);
  }

  // Takes picture to verify
  async function takePictureAndVerify() {
    let frameData = await props.takePicture();

    if (!frameData) {
      return false;
    }

    return await dispatchFrameActionAsync(frameData, dispatchForVerify);
  }

  // Runs entire enrollment flow
  const runEnrollment = async () => {
    /*
        sleep for a second before starting enrollment
        allows user and camera to get situated so first frame is good 
        */
    await sleep(500);

    const timeoutInMs = CONFIG.ENROLL_SETTINGS.TIMEOUT_SECONDS * 1000;

    var timer = setTimeout(() => {
      console.log('timeout triggers');
      cancelToken.timeoutCancel();
    }, timeoutInMs);

    // Enrollment flow begins
    let rgbEnrollProgress = 0;

    while (
      rgbEnrollProgress < CONFIG.ENROLL_SETTINGS.RGB_FRAMES_TOENROLL &&
      cancelToken.isCancellationRequested == false
    ) {
      let frameEnrollSucceeded = await takePictureAndEnroll();
      if (frameEnrollSucceeded) {
        // update enrollment progress
        setRgbProgress(++rgbEnrollProgress);
      }
    }

    // Verify
    let verified = false;

    while (verified == false && cancelToken.isCancellationRequested == false) {
      verified = await takePictureAndVerify();
      console.log('Verify result:', verified);

      if (verified) {
        // update enrollment progress
        setRgbProgress(++rgbEnrollProgress);
      }
    }

    console.log('Clearing timeout');
    clearTimeout(timer);

    if (verified == false) {
      console.log('Verify failed');
      /* 
            If the face cannot be verified
            Fail enrollment and delete all data
            */

      try {
        let deleteResult = await dispatchDelete();
        console.log('delete result', deleteResult);
      } catch (err) {
        console.log('delete failed', err);
      }

      // Determine type of failure result
      if (cancelToken.isTimeoutCancellation) {
        return ENROLL_RESULT.timeout;
      } else if (cancelToken.isCancellationRequested) {
        return ENROLL_RESULT.cancel;
      }

      return ENROLL_RESULT.error;
    }

    // Verify succeeded, dispatch train
    let trainResult = await dispatchTrain();
    console.log('train result:', trainResult);

    if (trainResult) {
      return ENROLL_RESULT.success;
    } else return ENROLL_RESULT.successNoTrain;
  };

  if (props.beginEnrollment && enrollStarted == false) {
    /* 
        Start Enrollment once parent component signals
        enrollment can begin and check enrollment hasn't aready started
        */

    setEnrollStarted(true);

    runEnrollment().then((enrollmentResult) => {
      console.log('Enrollment done', enrollmentResult);
      props.onCompleted(enrollmentResult);
    });
  }

  function cancelEnrollment() {
    console.log('Cancel clicked');
    cancelToken.cancel();
  }

  return (
    <View style={styles.root}>
      <View style={styles.overlay}>
        <EnrollProgress rgbProgressCount={rgbProgress} />
      </View>
      <CustomButton
        onPress={cancelEnrollment}
        title="Cancel"
        style={styles.cancelButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'absolute',
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  cancelButton: {
    margin: 40,
    backgroundColor: 'black',
    color: 'white',
    width: 100,
    fontSize: 20,
  },
});

export default Enrollment;
