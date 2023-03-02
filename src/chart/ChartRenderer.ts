import { Container, Point, Rectangle, Sprite, Texture } from "pixi.js"
import { Options } from "../util/Options"
import { ChartManager, EditMode } from "./ChartManager"
import { Notefield } from "./gameTypes/base/Notefield"
import { TimingWindow } from "./play/TimingWindow"
import { BarlineContainer } from "./renderer/BarlineContainer"
import { ComboNumber } from "./renderer/ComboNumber"
import { JudgmentSprite } from "./renderer/JudgmentSprite"
import { SelectionAreaContainer } from "./renderer/SelectionAreaContainer"
import { SnapContainer } from "./renderer/SnapContainer"
import { TimingAreaContainer } from "./renderer/TimingAreaContainer"
import { TimingBarContainer } from "./renderer/TimingBarContainer"
import { TimingTrackContainer } from "./renderer/TimingTrackContainer"
import { Waveform } from "./renderer/Waveform"
import { Chart } from "./sm/Chart"
import { NotedataEntry } from "./sm/NoteTypes"

interface SelectionBounds {
  start: Point
  end: Point
}

export class ChartRenderer extends Container {
  chartManager: ChartManager

  chart: Chart

  private speedMult = 1

  private lastMousePos?: Point
  private lastMouseBeat = -1
  private lastMouseCol = -1
  private lastNoteType = ""
  private editingCol = -1

  private waveform: Waveform
  private barlines: BarlineContainer
  private timingAreas: TimingAreaContainer
  private timingTracks: TimingTrackContainer
  private timingBar: TimingBarContainer
  notefield: Notefield
  private snapDisplay: SnapContainer
  private judgment: JudgmentSprite
  private combo: ComboNumber
  private selectionSprite: Sprite
  private selectionArea: SelectionAreaContainer

  private selectionBounds?: SelectionBounds

  constructor(chartManager: ChartManager) {
    super()
    this.chartManager = chartManager
    this.chart = chartManager.chart!

    this.waveform = new Waveform(this)
    this.barlines = new BarlineContainer(this)
    this.timingAreas = new TimingAreaContainer(this)
    this.timingTracks = new TimingTrackContainer(this)
    this.timingBar = new TimingBarContainer(this)
    this.notefield = new this.chart.gameType.notefield(this)
    this.snapDisplay = new SnapContainer(this)
    this.selectionArea = new SelectionAreaContainer(this)
    this.judgment = new JudgmentSprite()
    this.combo = new ComboNumber(this)
    this.selectionSprite = new Sprite(Texture.WHITE)
    this.selectionSprite.visible = false
    this.selectionSprite.alpha = 0.2

    this.addChild(this.waveform)
    this.addChild(this.barlines)
    this.addChild(this.timingAreas)
    this.addChild(this.selectionArea)
    this.addChild(this.timingTracks)
    this.addChild(this.timingBar)
    this.addChild(this.combo)
    this.addChild(this.notefield)
    this.addChild(this.snapDisplay)
    this.addChild(this.judgment)
    this.addChild(this.selectionSprite)

    this.chartManager.app.stage.addChild(this)

    this.x = this.chartManager.app.renderer.screen.width / 2
    this.y = this.chartManager.app.renderer.screen.height / 2

    this.interactive = true
    this.hitArea = new Rectangle(-1e5, -1e5, 2e5, 2e5)

    const keyHandler = (event: KeyboardEvent) => {
      if (this.editingCol != -1) {
        const snap = Options.chart.snap == 0 ? 1 / 48 : Options.chart.snap
        const snapBeat =
          Math.round(this.getBeatFromYPos(this.lastMousePos!.y) / snap) * snap
        this.chartManager.editHoldBeat(
          this.editingCol,
          snapBeat,
          event.shiftKey
        )
      }
    }

    let selectionSpeed = 0
    const tickHandler = () => {
      if (
        (!this.chartManager.selection.shift && !this.selectionBounds) ||
        selectionSpeed == 0
      )
        return
      const pos = this.getYPos(
        Math.max(0, this.chartManager.getBeat() + selectionSpeed)
      )
      this.chartManager.setBeat(
        Math.max(0, this.chartManager.getBeat() + selectionSpeed)
      )
      if (this.selectionBounds)
        this.selectionBounds.start.y +=
          Options.chart.receptorYPos / Options.chart.zoom - pos
    }

    this.chartManager.app.ticker.add(tickHandler)

    window.addEventListener("keydown", keyHandler)
    this.on("destroyed", () => {
      window.removeEventListener("keydown", keyHandler)
      this.removeAllListeners()
      this.chartManager.app.ticker.remove(tickHandler)
    })

    this.on("mousedown", event => {
      if (this.chartManager.getMode() == EditMode.Play) return
      if (
        Options.general.mousePlacement &&
        this.lastMouseBeat != -1 &&
        this.lastMouseCol != -1 &&
        !event.getModifierState("Shift")
      ) {
        this.chartManager.clearSelection()
        this.editingCol = this.lastMouseCol
        this.chartManager.setNote(
          this.lastMouseCol,
          "mouse",
          this.lastMouseBeat
        )
      } else {
        if (
          !event.getModifierState("Control") &&
          !event.getModifierState("Meta") &&
          !event.getModifierState("Shift")
        ) {
          this.chartManager.clearSelection()
        }
        this.chartManager.startDragSelection()
        this.selectionBounds = {
          start: this.toLocal(event.global),
          end: this.toLocal(event.global),
        }
      }
    })

    this.on("mousemove", event => {
      this.lastMousePos = this.toLocal(event.global)
      if (this.editingCol != -1) {
        const snap = Options.chart.snap == 0 ? 1 / 48 : Options.chart.snap
        const snapBeat =
          Math.round(this.getBeatFromYPos(this.lastMousePos.y) / snap) * snap
        this.chartManager.editHoldBeat(
          this.editingCol,
          snapBeat,
          event.shiftKey
        )
      }
      if (this.selectionBounds) {
        this.selectionBounds.end = this.toLocal(event.global)
      }
      selectionSpeed =
        Math.max(0, this.lastMousePos.y - this.getLowerBound() + 100) / 600
      if (this.lastMousePos.y < 0) {
        selectionSpeed =
          Math.min(0, this.lastMousePos.y - this.getUpperBound() - 100) / 600
      }
    })

    this.on("mouseup", () => {
      if (this.editingCol != -1) {
        this.chartManager.endEditing(this.editingCol)
        this.editingCol = -1
      }
      this.chartManager.endDragSelection()
      this.selectionBounds = undefined
      selectionSpeed = 0
    })
  }

  doJudgment(note: NotedataEntry, error: number, judgment: TimingWindow) {
    if (this.chartManager.getMode() == EditMode.Play) {
      this.judgment.doJudge(error, judgment)
      this.timingBar.addBar(error, judgment)
    }
    this.notefield.doJudge(note.col, judgment)
  }

  activateHold(col: number) {
    this.notefield.activateHold(col)
  }

  keyDown(col: number) {
    this.notefield.keyDown(col)
  }

  keyUp(col: number) {
    this.notefield.keyUp(col)
  }

  endPlay() {
    this.notefield.reset()
    this.timingBar.reset()
    this.judgment.reset()
  }

  renderThis() {
    const beat = this.getBeatWithOffset()
    const time = this.getTimeWithOffset()

    this.speedMult = Options.chart.doSpeedChanges
      ? this.chart.timingData.getSpeedMult(beat, time)
      : 1

    let renderBeatLimit = beat + Options.chart.maxDrawBeats
    let renderBeatLowerLimit = beat - Options.chart.maxDrawBeatsBack
    // let renderSecondLimit = this.chart.getSeconds(renderBeatLimit)
    let renderSecondLowerLimit = this.chart.getSeconds(renderBeatLowerLimit)

    if (Options.chart.CMod) {
      renderBeatLimit = this.getBeatFromYPos(this.getLowerBound()) + 1
      renderBeatLowerLimit = this.getBeatFromYPos(this.getUpperBound())
      renderSecondLowerLimit = this.getTimeFromYPos(this.getUpperBound())
    }

    this.selectionSprite.visible = !!this.selectionBounds
    if (this.selectionBounds) {
      this.selectionSprite.position.x = Math.min(
        this.selectionBounds.start.x,
        this.selectionBounds.end.x
      )
      this.selectionSprite.position.y = Math.min(
        this.selectionBounds.start.y,
        this.selectionBounds.end.y
      )
      this.selectionSprite.width = Math.abs(
        this.selectionBounds.end.x - this.selectionBounds.start.x
      )
      this.selectionSprite.height = Math.abs(
        this.selectionBounds.end.y - this.selectionBounds.start.y
      )
    }

    this.scale.x = Options.chart.zoom
    this.scale.y = (Options.chart.reverse ? -1 : 1) * Options.chart.zoom

    this.barlines.renderThis(beat, renderBeatLowerLimit, renderBeatLimit)
    this.timingAreas.renderThis(
      beat,
      renderBeatLowerLimit,
      renderBeatLimit,
      renderSecondLowerLimit
    )
    this.timingTracks.renderThis(beat, renderBeatLowerLimit, renderBeatLimit)
    this.timingBar.renderThis()
    this.judgment.renderThis()
    this.combo.renderThis()
    this.snapDisplay.renderThis()
    this.selectionArea.renderThis()

    this.notefield.update(beat, renderBeatLowerLimit, renderBeatLimit)
    this.waveform.renderThis(beat, time)

    if (
      Options.general.mousePlacement &&
      this.lastMousePos &&
      this.chartManager.getMode() != EditMode.Play
    ) {
      const snap = Options.chart.snap == 0 ? 1 / 48 : Options.chart.snap
      const snapBeat =
        Math.round(this.getBeatFromYPos(this.lastMousePos.y) / snap) * snap
      const col = Math.round((this.lastMousePos.x + 96) / 64)
      if (
        snapBeat != this.lastMouseBeat ||
        col != this.lastMouseCol ||
        this.chartManager.getEditingNoteType() != this.lastNoteType
      ) {
        this.lastMouseBeat = snapBeat
        this.lastMouseCol = col
        this.lastNoteType = this.chartManager.getEditingNoteType()
        if (this.editingCol != -1) {
          this.chartManager.editHoldBeat(this.editingCol, snapBeat, false)
        }
        if (col > 3 || col < 0) {
          this.lastMouseBeat = -1
          this.lastMouseCol = -1
          this.notefield.setGhostNote()
        } else {
          this.notefield.setGhostNote({
            beat: snapBeat,
            col: this.lastMouseCol,
            type: this.chartManager.getEditingNoteType(),
          })
        }
      }
    }
  }

  getTimeWithOffset(): number {
    let time = this.chartManager.getTime()
    if (
      this.chartManager.getMode() == EditMode.Play ||
      this.chartManager.getMode() == EditMode.Record
    ) {
      time += Options.play.offset
    }
    return time
  }

  getBeatWithOffset(): number {
    let beat = this.chartManager.getBeat()
    if (
      this.chartManager.getMode() == EditMode.Play ||
      this.chartManager.getMode() == EditMode.Record
    ) {
      beat = this.chart.getBeat(this.getTimeWithOffset())
    }
    return beat
  }

  getYPos(beat: number): number {
    const currentTime = this.getTimeWithOffset()
    const currentBeat = this.getBeatWithOffset()
    if (Options.chart.CMod) {
      return (
        (((this.chart.getSeconds(beat) - currentTime) * Options.chart.speed) /
          100) *
          64 *
          4 +
        Options.chart.receptorYPos / Options.chart.zoom
      )
    }
    if (currentBeat == beat)
      return Options.chart.receptorYPos / Options.chart.zoom
    if (Options.chart.doSpeedChanges)
      return (
        (((this.chart.timingData.getEffectiveBeat(beat) -
          this.chart.timingData.getEffectiveBeat(currentBeat)) *
          Options.chart.speed) /
          100) *
          64 *
          this.speedMult +
        Options.chart.receptorYPos / Options.chart.zoom
      )
    return (
      (((beat - currentBeat) * Options.chart.speed) / 100) * 64 +
      Options.chart.receptorYPos / Options.chart.zoom
    )
  }

  getYPosFromTime(time: number): number {
    const currentTime = this.getTimeWithOffset()
    if (Options.chart.CMod) {
      return (
        (((time - currentTime) * Options.chart.speed) / 100) * 64 * 4 +
        Options.chart.receptorYPos / Options.chart.zoom
      )
    } else return this.getYPos(this.chart.timingData.getBeat(time))
  }

  getTimeFromYPos(yp: number): number {
    const currentTime = this.getTimeWithOffset()
    if (Options.chart.CMod) {
      const seconds =
        (((yp - Options.chart.receptorYPos / Options.chart.zoom) /
          Options.chart.speed) *
          100) /
          64 /
          4 +
        currentTime
      return seconds
    }
    return this.chart.getSeconds(this.getBeatFromYPos(yp))
  }

  getBeatFromYPos(yp: number, ignoreSpeeds?: boolean): number {
    const currentBeat = this.getBeatWithOffset()
    if (Options.chart.CMod) {
      return this.chart.getBeat(this.getTimeFromYPos(yp))
    }
    if (Options.chart.doSpeedChanges && !ignoreSpeeds)
      return this.chart.getBeatFromEffectiveBeat(
        (((yp - Options.chart.receptorYPos / Options.chart.zoom) / 64) * 100) /
          Options.chart.speed /
          this.speedMult +
          this.chart.timingData.getEffectiveBeat(currentBeat)
      )
    return (
      (((yp - Options.chart.receptorYPos / Options.chart.zoom) / 64) * 100) /
        Options.chart.speed +
      currentBeat
    )
  }

  isNegScroll(beat: number) {
    return (
      Options.chart.doSpeedChanges &&
      (this.speedMult < 0 ||
        (this.chart.timingData.getTimingEventAtBeat("SCROLLS", beat)?.value ??
          1) < 0 ||
        this.chart.timingData.getBPM(beat) < 0)
    )
  }

  getLowerBound(): number {
    return (
      (this.chartManager.app.renderer.screen.height - this.y) /
        Options.chart.zoom +
      32
    )
  }

  getUpperBound(): number {
    return -32 - this.y / Options.chart.zoom
  }

  selectionTest(object: Container): boolean {
    if (!this.selectionBounds) return false
    const ab = this.selectionSprite.getBounds()
    const bb = object.getBounds()
    return (
      ab.x + ab.width > bb.x &&
      ab.x < bb.x + bb.width &&
      ab.y + ab.height > bb.y &&
      ab.y < bb.y + bb.height
    )
  }
}
