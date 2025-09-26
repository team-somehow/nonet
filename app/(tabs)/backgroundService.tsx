import React, { useEffect, useState } from 'react';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';
// 1. Import the new background package
import BackgroundFetch from 'react-native-background-fetch';

const BACKGROUND_TASK_IDENTIFIER = 'com.yourcompany.BackgroundTask'; // Use a full package name
const SCHEDULED_TASK_ID = 'com.yourcompany.short-task';

// 2. Define the Headless JS Task (global scope)
// This is the function that runs when the OS triggers the background event
const myHeadlessTask = async (taskId) => {
  const now = new Date(Date.now()).toISOString();
  console.log(`[BackgroundFetch] Task ID: ${taskId} received at: ${now}`);

  // ✅ Your Ngrok URL is correct for external/physical device testing
  const SERVER_URL = 'https://ea2ea87b756d.ngrok-free.app/api/background-hit';

  try {
    const response = await fetch(SERVER_URL, {
      method: 'GET',
    });
    if (response.ok) {
      const result = await response.json();
      console.log('[BackgroundFetch] Server hit successful:', result);

      // 💡 Suggestion: Add a Local Notification here for clear user confirmation!
      // PushNotification.localNotification({...}); 

    } else {
      throw new Error(`Server returned status: ${response.status}`);
    }
  } catch (error) {
    console.log('[BackgroundFetch] Server hit failed:', error);
  }

  // ✅ CRITICAL: Signal task completion
  BackgroundFetch.finish(taskId);
};


// 3. Register the headless task
BackgroundFetch.registerHeadlessTask(myHeadlessTask);

// 4. Initialization function (similar to registerBackgroundTaskAsync)
async function initBackgroundFetch() {
  try {
    const status = await BackgroundFetch.configure(
      {
        stopOnTerminate: false,
        startOnBoot: true,
        requiredNetworkType: BackgroundFetch.NETWORK_TYPE_CELLULAR,
        enableHeadless: true,
      },
      myHeadlessTask,
      (error) => {
        console.error('[BackgroundFetch] Failed to configure:', error);
      },
    );

    console.log('[BackgroundFetch] Configuration Status:', status);

    try {
      await BackgroundFetch.scheduleTask({
        taskId: SCHEDULED_TASK_ID,
        delay: 60000,                          // 1 minute
        periodic: true,                        // Repeat
        forceAlarmManager: true,               // Force fast intervals (Android only)
      });
      console.log('[BackgroundFetch] Custom 1-minute task scheduled.');
    } catch (e) {
      console.warn('[BackgroundFetch] Custom task scheduling failed:', e);
    }

    // If successfully configured, this returns the initial status
    return status;
  } catch (error) {
    console.error('Failed to configure background fetch:', error);
    return BackgroundFetch.STATUS_DENIED;
  }
}



// 6. Stop the task (similar to unregisterBackgroundTaskAsync)
async function unregisterBackgroundTaskAsync() {
  // Use the ID of the task that was ACTUALLY scheduled
  await BackgroundFetch.stop(SCHEDULED_TASK_ID);
}

// Show help (mostly for iOS settings)
function showBackgroundTaskHelp() {
  Alert.alert(
    'Background Tasks Restricted',
    'Background tasks are restricted by the OS. Please check device settings:\n\n1. Enable "Background App Refresh" for the app (iOS)\n2. Disable "Low Power Mode" (iOS)\n3. Check Battery Optimization settings (Android)',
    [{ text: 'OK' }]
  );
}

// 7. React Component
export default function BackgroundTaskScreen() {
  const [status, setStatus] = useState<number | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);

  useEffect(() => {
    updateAsync();
  }, []);

  const updateAsync = async () => {
    // Check initial configuration status
    const fetchStatus = await BackgroundFetch.status;
    setStatus(fetchStatus);

    // Check if task is "registered" (we use status as a proxy for this task type)
    setIsRegistered(fetchStatus === BackgroundFetch.STATUS_AVAILABLE);
  };

  const toggle = async () => {
    if (status === BackgroundFetch.STATUS_DENIED || status === BackgroundFetch.STATUS_RESTRICTED) {
      showBackgroundTaskHelp();
      return;
    }

    if (!isRegistered) {
      // Start the task
      await initBackgroundFetch();
    } else {
      // Stop the task
      await unregisterBackgroundTaskAsync();
    }
    await updateAsync();
  };

  const getStatusText = (s: number) => {
    switch (s) {
      case BackgroundFetch.STATUS_AVAILABLE:
        return 'Available';
      case BackgroundFetch.STATUS_DENIED:
        return 'Denied';
      case BackgroundFetch.STATUS_RESTRICTED:
        return 'Restricted';
      default:
        return 'Unknown';
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.textContainer}>
        <Text>
          Background Fetch Status:{' '}
          <Text style={styles.boldText}>
            {status !== null ? getStatusText(status) : 'Loading...'}
          </Text>
        </Text>
        <Text>
          Task Registered:{' '}
          <Text style={styles.boldText}>
            {isRegistered ? 'YES' : 'NO'}
          </Text>
        </Text>
      </View>
      <Button
        title={
          status === BackgroundFetch.STATUS_DENIED || status === BackgroundFetch.STATUS_RESTRICTED
            ? 'Help - Tasks Restricted'
            : isRegistered
              ? 'Cancel Background Task'
              : 'Schedule Background Task'
        }
        onPress={toggle}
      />
      <Button title="Check Background Task Status" onPress={updateAsync} />
      <Text style={{ marginTop: 20, textAlign: 'center' }}>
        Note: The actual background task interval is controlled by the OS (min 15 mins).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  textContainer: {
    margin: 10,
  },
  boldText: {
    fontWeight: 'bold',
  },
});