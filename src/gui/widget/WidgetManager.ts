import { Container } from "pixi.js"
import { App } from "../../App"
import { ChartManager } from "../../chart/ChartManager"
import { NoteLayoutWidget } from "./NoteLayoutWidget"
import { PlayInfoWidget } from "./PlayInfoWidget"
import { StatusWidget } from "./StatusWidget"
import { Widget } from "./Widget"

export class WidgetManager extends Container {
  app: App
  chartManager: ChartManager
  children: Widget[] = []

  constructor(chartManager: ChartManager) {
    super()
    this.app = chartManager.app
    this.chartManager = chartManager
    this.addChild(new NoteLayoutWidget(this))
    // this.addChild(new InfoWidget(this))
    this.addChild(new PlayInfoWidget(this))
    this.addChild(new StatusWidget(this))
    this.zIndex = 2
  }

  update() {
    this.x = this.app.renderer.screen.width / 2
    this.y = this.app.renderer.screen.height / 2
    this.children.forEach(child => child.update())
  }

  startPlay() {
    this.children.forEach(child => child.startPlay())
  }

  endPlay() {
    this.children.forEach(child => child.endPlay())
  }
}
