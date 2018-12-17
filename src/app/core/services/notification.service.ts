import 'rxjs/add/operator/map'

import { Injectable } from '@angular/core'
import { uuid } from 'uuid/v4'

import {
  DefaultNotificationType,
  DefaultNumberOfNotificationsToRescue,
  DefaultNumberOfNotificationsToSchedule,
  DefaultTask,
  FCMPluginProjectSenderId,
} from '../../../assets/data/defaultConfig'
import { LocKeys } from '../../shared/enums/localisations'
import { StorageKeys } from '../../shared/enums/storage'
import { Task } from '../../shared/models/task'
import { AlertService } from './alert.service'
import { LocalizationService } from './localization.service'
import { SchedulingService, TIME_UNIT_MILLIS } from './scheduling.service'
import { getMilliseconds, getSeconds } from '../../shared/utilities/time'
import { StorageService } from './storage.service'

declare var cordova
declare var FCMPlugin

@Injectable()
export class NotificationService {
  participantLogin
  localNotification

  constructor(
    private localization: LocalizationService,
    private alertService: AlertService,
    private schedule: SchedulingService,
    public storage: StorageService,
  ) {
    try {
      FCMPlugin.setSenderId(
        FCMPluginProjectSenderId,
        () => console.log('[NOTIFICATION SERVICE] Set sender id success'),
        error => {
          console.log(error)
          alert(error)
        },
      )

      FCMPlugin.getToken(() => console.log('[NOTIFICATION SERVICE] Refresh token success'))
    } catch (error) {
      console.error(error)
    }
    this.localNotification = (<any>cordova).plugins.notification.local
  }

  permissionCheck() {
    this.localNotification.hasPermission().then(p => {
      if (!p) {
        this.localNotification.registerPermission()
      }
    })
  }

  generateNotificationSubsetForXTasks(noOfNotifications) {
    const today = new Date().getTime()
    return this.schedule.getTasks().then(tasks => {
      const limitedTasks = {}
      for (let i = 0; i < tasks.length; i++) {
        if (tasks[i].timestamp > today) {
          const key = `${tasks[i].timestamp}-${tasks[i].name}`
          limitedTasks[key] = tasks[i]
        }
      }
      const ltdTasksIdx = Object.keys(limitedTasks)
      ltdTasksIdx.sort()

      let noOfLtdNotifications = noOfNotifications
      if (noOfNotifications >= ltdTasksIdx.length) {
        noOfLtdNotifications = ltdTasksIdx.length
      }

      const desiredSubset = []
      for (let i = 0; i < noOfLtdNotifications; i++) {
        desiredSubset.push(limitedTasks[ltdTasksIdx[i]])
      }
      return desiredSubset
    })
  }

  setNotifications(tasks: Task[]) {
    return this.storage.get(StorageKeys.PARTICIPANTLOGIN)
      .then(participantLogin => {
        if (!participantLogin) {
          return;
        }

        this.participantLogin = participantLogin
        const now = new Date().getTime()

        const futureTasks = tasks.filter(t => t.timestamp > now);

        if (DefaultNotificationType === 'LOCAL') {
          const localNotification = this.formatLocalNotification(
            futureTasks[0], futureTasks.length == 1, false)

          console.log('NOTIFICATIONS Scheduling LOCAL notifications')
          this.localNotification.on('click', notification =>
            this.evalTaskTiming(notification.data)
          )
          this.localNotification.on('trigger', notification =>
            this.evalLastTask(notification.data)
          )
          return this.localNotification.schedule(
            localNotification,
            () => Promise.resolve({}),
          )
        }
        if (DefaultNotificationType === 'FCM') {
          const fcmNotifications = tasks
            .filter(t => t.timestamp > now)
            .map(t => this.formatFCMNotification(t, participantLogin))

          console.log('NOTIFICATIONS Scheduling FCM notifications')
          console.log(fcmNotifications)
          fcmNotifications.forEach(this.sendFCMNotification)
        }
        this.storage.set(StorageKeys.LAST_NOTIFICATION_UPDATE, Date.now())
      })
  }

  sendFCMNotification(notification) {
    FCMPlugin.upstream(
      notification,
      succ => console.log(succ),
      err => console.log(err)
    )
  }

  testFCMNotifications() {
    const task = DefaultTask
    task.timestamp = new Date().getTime() + TIME_UNIT_MILLIS.min * 2
    const fcmNotification = this.formatFCMNotification(
      task,
      this.participantLogin
    )

    this.sendFCMNotification(fcmNotification)
  }

  formatNotificationMessage(task) {
    return this.localization.translateKey(LocKeys.NOTIFICATION_REMINDER_NOW_DESC_1)
      + ' ' + task.estimatedCompletionTime + ' '
      + this.localization.translateKey(LocKeys.NOTIFICATION_REMINDER_NOW_DESC_2)
  }

  formatLocalNotification(
    task: Task,
    isLastScheduledNotification: boolean,
    isLastOfDay: boolean
  ) {
    return {
      id: task.index,
      title: this.localization.translateKey(LocKeys.NOTIFICATION_REMINDER_NOW),
      text: this.formatNotificationMessage(task),
      trigger: {at: new Date(task.timestamp)},
      foreground: true,
      vibrate: true,
      sound: 'file://assets/sounds/serious-strike.mp3',
      data: {
        task: task,
        isLastOfDay: isLastOfDay,
        isLastScheduledNotification: isLastScheduledNotification
      }
    }
  }

  formatFCMNotification(task: Task, participantLogin: string) {
    return {
      eventId: uuid(),
      action: 'SCHEDULE',
      notificationTitle: this.localization.translateKey(LocKeys.NOTIFICATION_REMINDER_NOW),
      notificationMessage: this.formatNotificationMessage(task),
      time: task.timestamp,
      subjectId: participantLogin,
      ttlSeconds: getSeconds({ milliseconds: task.completionWindow }),
    }
  }

  cancelNotificationPush(participantLogin: string) {
    return new Promise(function(resolve, reject) {
      FCMPlugin.upstream(
        {
          eventId: uuid(),
          action: 'CANCEL',
          cancelType: 'all',
          subjectId: participantLogin
        },
        resolve,
        reject
      )
    })
  }

  evalTaskTiming(data) {
    const task = data.task
    const scheduledTimestamp = task.timestamp
    const now = new Date().getTime()
    const endScheduledTimestamp = scheduledTimestamp + getMilliseconds({ minutes: 10 })
    if (now > endScheduledTimestamp && task.name === 'ESM') {
      this.showNotificationMissedInfo(task, data.isLastOfDay)
    }
    this.localNotification.clearAll()
  }

  evalLastTask(data) {
    if (data.isLastScheduledNotification) {
      this.scheduleNextNotification()
    }
  }

  scheduleNextNotification() {
    this.generateNotificationSubsetForXTasks(
      DefaultNumberOfNotificationsToSchedule +
        DefaultNumberOfNotificationsToRescue
    ).then(desiredSubset => {
      console.log('NOTIFICATION RESCHEDULE')
      const immediateNotification = [desiredSubset[0]]
      this.setNotifications(immediateNotification)
      const nextDate = new Date(
        desiredSubset[desiredSubset.length - 1].timestamp
      )
      this.schedule.getTasksForDate(nextDate)
        .then(([rescueTasks]) => this.setNotifications([rescueTasks]))
    })
  }

  consoleLogScheduledNotifications() {
    this.localNotification.getScheduled(notifications => {
      console.log(`\nNOTIFICATIONS NUMBER ${notifications.length}\n`)
      const dailyNotifies = {}
      for (let i = 0; i < notifications.length; i++) {
        const data = JSON.parse(notifications[i].data)
        const trigger = new Date(notifications[i].trigger.at).toString()
        const key = trigger.substr(4, 11)
        const name = data.task.name
        const id = notifications[i].id
        const rendered = `${i} ID ${id} TIME ${trigger.substr(
          15
        )} NAME ${name}\n`

        const tmp = dailyNotifies[key]
        if (tmp === undefined) {
          dailyNotifies[key] = `\nNOTIFICATIONS DATE ${key}\n` + rendered
        } else {
          dailyNotifies[key] += rendered
        }
      }
      const keys = Object.keys(dailyNotifies)
      keys.sort()
      console.log(
        `\n NOTIFICATIONS Scheduled Notifications (${notifications.length}):\n`
      )
      for (let i = 0; i < keys.length; i++) {
        console.log(dailyNotifies[keys[i]])
      }
      this.localNotification.cancelAll(() => {
        this.evalLastTask({ isLastScheduledNotification: true })
      })
    })
  }

  showNotificationMissedInfo(task: Task, isLastOfDay: boolean) {
    const msgDefault = this.localization.translateKey(
      LocKeys.NOTIFICATION_REMINDER_FORGOTTEN_ALERT_DEFAULT_DESC
    )
    const msgLastOfDay = this.localization.translateKey(
      LocKeys.NOTIFICATION_REMINDER_FORGOTTEN_ALERT_LASTOFNIGHT_DESC
    )
    return this.alertService.showAlert({
      title: this.localization.translateKey(LocKeys.NOTIFICATION_REMINDER_FORGOTTEN),
      message: isLastOfDay ? msgLastOfDay : msgDefault,
      buttons: [
        {
          text: this.localization.translateKey(LocKeys.BTN_OKAY),
          handler: () => {},
        }
      ]
    })
  }

  setNextXNotifications(noOfNotifications) {
    return this.generateNotificationSubsetForXTasks(noOfNotifications)
      .then(desiredSubset => {
        console.log(`NOTIFICATIONS desiredSubset: ${desiredSubset.length}`)
        try {
          return this.setNotifications(desiredSubset)
        } catch (e) {
          return Promise.reject(e)
        }
      })
  }

  cancelNotifications() {
    return this.storage.get(StorageKeys.PARTICIPANTLOGIN)
      .then(participantLogin => {
        if (participantLogin) {
          return this.cancelNotificationPush(participantLogin)
        }
      })
  }
}
