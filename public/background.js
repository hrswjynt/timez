/**
 * Background service worker for Timez extension
 * Handles alarms, notifications, and state persistence
 */

// Listen for alarm events
browser.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm fired:', alarm.name);

  // Determine alarm type and message
  let title = 'Timez';
  let message = '';

  if (alarm.name === 'timer') {
    message = 'Timer complete!';
  } else if (alarm.name.startsWith('alarm-')) {
    // Get alarm details from storage
    browser.storage.local.get('alarms').then((result) => {
      const alarms = result.alarms || [];
      const alarmId = alarm.name.replace('alarm-', '');
      const alarmData = alarms.find(a => String(a.id) === alarmId);

      if (alarmData) {
        message = alarmData.label || 'Alarm';
        showNotification(title, message);

        // Reschedule alarm for next day if it's a recurring alarm
        rescheduleAlarm(alarmData);
      } else {
        // Fallback if alarm data found (e.g. storage issue)
        showNotification(title, 'Alarm');
      }
    });
    return; // Exit early, notification will be shown after getting alarm data
  }

  if (message) {
    showNotification(title, message);
  }

  // Notify popup if open
  browser.runtime.sendMessage({
    type: 'alarm-fired',
    name: alarm.name
  }).catch(() => {
    // Popup might not be open, ignore error
  });
});

/**
 * Show a browser notification
 */
function showNotification(title, message) {
  browser.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title: title,
    message: message
  });
}

/**
 * Reschedule an alarm for the next occurrence (next day)
 */
function rescheduleAlarm(alarmData) {
  const [hours, minutes] = alarmData.time.split(':').map(Number);
  const now = new Date();
  const alarmDate = new Date();
  alarmDate.setHours(hours, minutes, 0, 0);

  // Always set for next day after firing
  alarmDate.setDate(alarmDate.getDate() + 1);

  const delayInMinutes = (alarmDate - now) / 60000;

  if (alarmData.enabled) {
    browser.alarms.create(`alarm-${alarmData.id}`, {
      delayInMinutes: delayInMinutes
    });
  }
}

// Listen for messages from popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);

  switch (message.type) {
    case 'create-timer':
      // Create a timer alarm
      browser.alarms.create('timer', {
        delayInMinutes: message.delayInMinutes
      });
      sendResponse({ success: true });
      break;

    case 'cancel-timer':
      browser.alarms.clear('timer');
      sendResponse({ success: true });
      break;

    case 'create-alarm':
      browser.alarms.create(`alarm-${message.alarmId}`, {
        delayInMinutes: message.delayInMinutes
      });
      sendResponse({ success: true });
      break;

    case 'cancel-alarm':
      browser.alarms.clear(`alarm-${message.alarmId}`);
      sendResponse({ success: true });
      break;

    case 'get-timer-state':
      // Get current timer alarm if exists
      browser.alarms.get('timer').then((alarm) => {
        sendResponse({ alarm: alarm || null });
      });
      return true; // Keep message channel open for async response

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  return false;
});

// Initialize extension on install
browser.runtime.onInstalled.addListener((details) => {
  console.log('Timez extension installed:', details.reason);

  // Initialize default storage values if needed
  browser.storage.local.get(['alarms', 'worldClockCities']).then((result) => {
    const updates = {};

    if (!result.alarms) {
      updates.alarms = [];
    }

    if (!result.worldClockCities) {
      updates.worldClockCities = [
        { id: 1, name: 'New York', timezone: 'America/New_York' },
        { id: 2, name: 'London', timezone: 'Europe/London' },
        { id: 3, name: 'Tokyo', timezone: 'Asia/Tokyo' }
      ];
    }

    if (Object.keys(updates).length > 0) {
      browser.storage.local.set(updates);
    }
  });
});
