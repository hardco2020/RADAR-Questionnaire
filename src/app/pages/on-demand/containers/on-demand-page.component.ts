import { Component } from '@angular/core'
import { NavController } from '@ionic/angular'

import { Assessment } from '../../../shared/models/assessment'
import { QuestionsPageComponent } from '../../questions/containers/questions-page.component'
import { OnDemandService } from '../services/on-demand.service'

@Component({
  selector: 'page-on-demand',
  templateUrl: 'on-demand-page.component.html'
})
export class OnDemandPageComponent {
  scrollHeight: number = 500
  assessments: Assessment[]
  title: Promise<String>

  constructor(
    public navCtrl: NavController,
    private onDemandService: OnDemandService
  ) {}

  ionViewDidLoad() {
    this.onDemandService.getAssessements().then(assessments => {
      this.assessments = assessments.sort((a, b) => a.order - b.order)
    })
    this.title = this.onDemandService.getOnDemandPageLabel()
  }

  clicked(task) {
    this.navCtrl.navigateForward('/questions', { state: task })
  }
}
