'use strict';

import {
  NativeModules,
  NativeEventEmitter,
  EmitterSubscription,
} from 'react-native';

// Separated file for Native Clipboard to be ready to switch to Turbo Module when it becomes public
// TODO: uncomment when Turbo module is available
// export interface Spec extends TurboModule {
//   +getConstants: () => {||};
//   +getString: () => Promise<string>;
//   +setString: (content: string) => void;
//   +hasString: () => Promise<boolean>;
// }

export default NativeModules.RNCClipboard;

const EVENT_NAME = 'RNCClipboard_TEXT_CHANGED';
const eventEmitter = new NativeEventEmitter(NativeModules.RNCClipboard);

let listenerCount = eventEmitter.listenerCount;

// listenerCount is only available from RN 0.64
// Older versions only have `listeners`
if (!listenerCount) {
  listenerCount = (eventType: string) => {
    // @ts-ignore
    return eventEmitter.listeners(eventType).length;
  };
} else {
  listenerCount = eventEmitter.listenerCount.bind(eventEmitter);
}

const addListener = (callback: () => void): EmitterSubscription => {
  if (listenerCount(EVENT_NAME) === 0) {
    NativeModules.RNCClipboard.setListener();
  }

  let subscription = eventEmitter.addListener(EVENT_NAME, callback);

  // React Native 0.65+ altered EventEmitter:
  // - removeSubscription is gone
  // - addListener returns an unsubscriber instead of a more complex object with eventType etc

  // make sure eventType for backwards compatibility just in case
  subscription.eventType = EVENT_NAME;

  // New style is to return a remove function on the object, just in csae people call that,
  // we will modify it to do our native unsubscription then call the original
  let originalRemove = subscription.remove;
  let newRemove = () => {
    NativeModules.RNCClipboard.eventsRemoveListener(EVENT_NAME, false);
    if (eventEmitter.removeSubscription != null) {
      // This is for RN <= 0.64 - 65 and greater no longer have removeSubscription
      eventEmitter.removeSubscription(subscription);
    } else if (originalRemove != null) {
      // This is for RN >= 0.65
      originalRemove();
    }
  };

  subscription.remove = newRemove;
  return subscription;
};

const removeAllListeners = () => {
  eventEmitter.removeAllListeners(EVENT_NAME);
  NativeModules.RNCClipboard.removeListener();
};

export {addListener, removeAllListeners};
