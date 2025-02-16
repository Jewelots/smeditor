import { App } from "../../App"
import { SM_PROPERTIES_WINDOW_DATA } from "../../data/SMPropertiesWindowData"
import { EventHandler } from "../../util/EventHandler"
import { Window } from "./Window"

export class SMPropertiesWindow extends Window {
  app: App

  private callback?: (success: boolean) => void
  private changeHandler = () => this.initView()

  constructor(
    app: App,
    isNewSM?: boolean,
    callback?: (success: boolean) => void
  ) {
    super({
      title: "Song Properties",
      width: 400,
      height: 365,
      disableClose: !!isNewSM,
      win_id: "sm_properties",
      blocking: !!isNewSM,
    })
    this.app = app
    this.callback = callback
    this.initView()
    EventHandler.on("smLoaded", this.changeHandler)
    EventHandler.on("undo", this.changeHandler)
    EventHandler.on("redo", this.changeHandler)
  }

  onClose(): void {
    EventHandler.off("smLoaded", this.changeHandler)
    EventHandler.off("undo", this.changeHandler)
    EventHandler.off("redo", this.changeHandler)
  }

  initView(): void {
    this.viewElement.replaceChildren()
    this.viewElement.classList.add("sm-properties")
    const padding = document.createElement("div")
    padding.classList.add("padding")

    const grid = document.createElement("div")
    grid.classList.add("property-grid")
    const songLabel = document.createElement("div")
    songLabel.classList.add("label")
    songLabel.innerText = "Apply to"

    Object.values(SM_PROPERTIES_WINDOW_DATA).forEach(entry => {
      const label = document.createElement("div")
      label.classList.add("label")
      label.innerText = entry.title

      const item = entry.element(this.app)

      grid.appendChild(label)
      grid.appendChild(item)
    })

    padding.appendChild(grid)

    //Menu Button Options
    const menu_options = document.createElement("div")
    menu_options.classList.add("menu-options")

    const menu_options_left = document.createElement("div")
    menu_options_left.classList.add("menu-left")
    const menu_options_right = document.createElement("div")
    menu_options_right.classList.add("menu-right")
    menu_options.appendChild(menu_options_left)
    menu_options.appendChild(menu_options_right)

    const cancel = document.createElement("button")
    cancel.innerText = "Cancel"
    cancel.onclick = () => {
      this.callback?.(false)
      this.closeWindow()
    }

    const create_btn = document.createElement("button")
    create_btn.innerText = "Create"
    create_btn.classList.add("confirm")
    create_btn.onclick = () => {
      this.callback?.(true)
      this.closeWindow()
    }
    menu_options_left.appendChild(cancel)
    menu_options_right.appendChild(create_btn)
    if (this.options.blocking) padding.appendChild(menu_options)
    this.viewElement.appendChild(padding)
  }
}
