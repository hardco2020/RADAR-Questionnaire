import { animate, state, style, transition, trigger } from '@angular/animations'
import { Component, ElementRef, ViewChild } from '@angular/core'
import {
  AlertController,
  Content,
  NavController,
  NavParams,
  Platform
} from 'ionic-angular'

import { DefaultTask } from '../../../../assets/data/defaultConfig'
import { KafkaService } from '../../../core/services/kafka.service'
import { StorageService } from '../../../core/services/storage.service'
import { LocKeys } from '../../../shared/enums/localisations'
import { StorageKeys } from '../../../shared/enums/storage'
import { Task, TasksProgress } from '../../../shared/models/task'
import { TranslatePipe } from '../../../shared/pipes/translate/translate'
import { checkTaskIsNow } from '../../../shared/utilities/check-task-is-now'
import { ClinicalTasksPageComponent } from '../../clinical-tasks/containers/clinical-tasks-page.component'
import { QuestionsPageComponent } from '../../questions/containers/questions-page.component'
import { SettingsPageComponent } from '../../settings/containers/settings-page.component'
import { StartPageComponent } from '../../start/containers/start-page.component'
import { TasksService } from '../services/tasks.service'

@Component({
  selector: 'page-home',
  templateUrl: 'home-page.component.html',
  animations: [
    trigger('displayCalendar', [
      state('true', style({ transform: 'translateY(0%)', opacity: 1 })),
      state('false', style({ transform: 'translateY(100%)', opacity: 1 })),
      transition('*=>*', animate('300ms ease'))
    ])
  ]
})
export class HomePageComponent {
  @ViewChild('content')
  elContent: Content
  elContentHeight: number
  @ViewChild('progressBar')
  elProgress: ElementRef
  elProgressHeight: number
  @ViewChild('tickerBar')
  elTicker: ElementRef
  elTickerHeight: number
  @ViewChild('taskInfo')
  elInfo: ElementRef
  elInfoHeight: number
  @ViewChild('footer')
  elFooter: ElementRef
  elFooterHeight: number
  @ViewChild('taskCalendar')
  elCalendar: ElementRef

  tasks: Promise<Task[]>
  isOpenPageClicked: boolean = false
  nextTask: Task = DefaultTask
  showCalendar: boolean = false
  showCompleted: boolean = false
  showNoTasksToday: boolean = false
  tasksProgress: TasksProgress
  calendarScrollHeight: number = 0
  startingQuestionnaire: boolean = false
  hasClinicalTasks = false
  hasOnlyESMs = false
  taskIsNow = false
  elProgressOffset = 16
  nextTaskIsLoading = true

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public alertCtrl: AlertController,
    private tasksService: TasksService,
    private translate: TranslatePipe,
    public storage: StorageService,
    private platform: Platform,
    private kafka: KafkaService
  ) {
    this.platform.resume.subscribe(e => {
      this.kafka.sendAllAnswersInCache()
      this.updateCurrentTask()
    })
  }

  ionViewWillEnter() {
    this.tasks = this.tasksService.getTasksOfToday()
    this.tasks.then(
      tasks => (this.tasksProgress = this.tasksService.getTaskProgress(tasks))
    )
    this.getElementsAttributes()
    this.elProgressHeight += this.elProgressOffset
    // this.applyTransformations()
    this.showNoTasksToday = false
    this.startingQuestionnaire = false
  }

  ionViewDidLoad() {
    setInterval(() => {
      this.updateCurrentTask()
    }, 1000)
    this.evalHasClinicalTasks()
    this.checkIfOnlyESM()
    this.tasksService.sendNonReportedTaskCompletion()
  }

  updateCurrentTask() {
    this.checkForNextTask()
    this.taskIsNow = checkTaskIsNow(this.nextTask.timestamp)
  }

  checkForNextTask() {
    if (!this.showCalendar) {
      this.nextTaskIsLoading = true
      this.tasks.then(tasks =>
        this.checkForNextTaskGeneric(this.tasksService.getNextTask(tasks))
      )
    }
  }

  checkForNextTaskGeneric(task) {
    if (task && task.isClinical == false) {
      this.nextTask = task
      this.displayCompleted(false)
      this.taskIsNow = checkTaskIsNow(this.nextTask.timestamp)
    } else {
      this.tasksService.areAllTasksComplete().then(completed => {
        if (completed) {
          this.nextTask = DefaultTask
          this.displayCompleted(true)
          if (!this.tasksProgress) {
            this.showNoTasksToday = true
          }
        } else {
          this.nextTask = DefaultTask
        }
      })
    }
    this.nextTaskIsLoading = false
  }

  checkIfOnlyESM() {
    this.tasks.then(tasks => {
      let tmpHasOnlyESMs = true
      for (let i = 0; i < tasks.length; i++) {
        if (tasks[i].name !== 'ESM') {
          tmpHasOnlyESMs = false
          break
        }
      }
      this.hasOnlyESMs = tmpHasOnlyESMs
    })
  }

  evalHasClinicalTasks() {
    this.storage.get(StorageKeys.HAS_CLINICAL_TASKS).then(isClinical => {
      this.hasClinicalTasks = isClinical
    })
  }

  displayTaskCalendar() {
    this.showCalendar = !this.showCalendar
    this.setCalendarScrollHeight(this.showCalendar)
  }

  displayCompleted(requestDisplay: boolean) {
    this.showCompleted = requestDisplay
    this.getElementsAttributes()
    this.applyCompletedTransformations()
  }

  getElementsAttributes() {
    if (this.elContent) this.elContentHeight = this.elContent.contentHeight
    if (this.elProgress)
      this.elProgressHeight =
        this.elProgress.nativeElement.offsetHeight - this.elProgressOffset
    if (this.elTicker)
      this.elTickerHeight = this.elTicker.nativeElement.offsetHeight
    if (this.elInfo) this.elInfoHeight = this.elInfo.nativeElement.offsetHeight
    if (this.elFooter)
      this.elFooterHeight = this.elFooter.nativeElement.offsetHeight
  }

  setCalendarScrollHeight(show: boolean) {
    if (show) {
      this.calendarScrollHeight =
        this.elContentHeight - this.elTickerHeight - this.elInfoHeight
    } else {
      this.calendarScrollHeight = 0
    }
  }

  applyCompletedTransformations() {
    if (this.showCompleted) {
      this.elTicker.nativeElement.style.padding = `0`
      this.elTicker.nativeElement.style.transform = `translateY(${this
        .elInfoHeight + this.elFooterHeight}px)`
      this.elInfo.nativeElement.style.transform = `translateY(${this
        .elInfoHeight + this.elFooterHeight}px) scale(0)`
      this.elFooter.nativeElement.style.transform = `translateY(${this
        .elInfoHeight + this.elFooterHeight}px) scale(0)`
    } else {
      if (this.elTicker) {
        this.elTicker.nativeElement.style.padding = '0 0 2px 0'
        this.elTicker.nativeElement.style.transform = 'translateY(0px)'
      }
      if (this.elInfo)
        this.elInfo.nativeElement.style.transform = 'translateY(0px) scale(1)'
      if (this.elFooter)
        this.elFooter.nativeElement.style.transform = 'translateY(0px) scale(1)'
    }
  }

  openSettingsPage() {
    this.navCtrl.push(SettingsPageComponent)
  }

  openClinicalTasksPage() {
    this.navCtrl.push(ClinicalTasksPageComponent)
  }

  startQuestionnaire(taskCalendarTask: Task) {
    // NOTE: User can start questionnaire from task calendar or start button in home.
    let startQuestionnaireTask = this.nextTask
    if (taskCalendarTask) {
      if (taskCalendarTask.completed === false) {
        startQuestionnaireTask = taskCalendarTask
      }
    } else {
      this.startingQuestionnaire = true
    }
    const lang = this.storage.get(StorageKeys.LANGUAGE)
    const nextAssessment = this.tasksService.getAssessment(
      startQuestionnaireTask
    )
    Promise.all([lang, nextAssessment]).then(res => {
      const language = res[0].value
      const assessment = res[1]
      const params = {
        title: assessment.name,
        introduction: assessment.startText[language],
        endText: assessment.endText[language],
        questions: assessment.questions,
        associatedTask: startQuestionnaireTask,
        assessment: assessment,
        isLastTask: false
      }

      this.tasksService
        .isLastTask(startQuestionnaireTask, this.tasks)
        .then(lastTask => (params.isLastTask = lastTask))
        .then(() => {
          if (assessment.showIntroduction) {
            this.navCtrl.push(StartPageComponent, params)
          } else {
            this.navCtrl.push(QuestionsPageComponent, params)
          }
        })
    })
  }

  showCredits() {
    const buttons = [
      {
        text: this.translate.transform(LocKeys.BTN_OKAY.toString()),
        handler: () => {}
      }
    ]
    this.showAlert({
      title: this.translate.transform(LocKeys.CREDITS_TITLE.toString()),
      message: this.translate.transform(LocKeys.CREDITS_BODY.toString()),
      buttons: buttons
    })
  }

  showAlert(parameters) {
    const alert = this.alertCtrl.create({
      title: parameters.title,
      buttons: parameters.buttons
    })
    if (parameters.message) {
      alert.setMessage(parameters.message)
    }
    if (parameters.inputs) {
      for (let i = 0; i < parameters.inputs.length; i++) {
        alert.addInput(parameters.inputs[i])
      }
    }
    alert.present()
  }
}
