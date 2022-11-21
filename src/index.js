import { createArrowTex } from "./note/NoteTexture.js";
import { createOptionsWindow } from "./gui/view/OptionsView.js";
import { FileSystem } from "./util/FileSystem.js";
import { getBrowser } from "./util/util.js";

if (getBrowser().includes("Safari")) {
  document.querySelector("body").innerHTML = "<div class='browser-unsupported'><div class='browser-unsupported-item'><h1>Safari is currently not supported!</h1><div>Please use another browser instead</div></div></div>"
}

export const app = new PIXI.Application(
  { 
    backgroundColor: 0x18191c, 
    antialias: true, 
    width: window.innerWidth, 
    height: window.innerHeight, 
    resolution: window.devicePixelRatio, 
    autoDensity: true,
    view: document.getElementById("pixi")
  });

window.app = app

setTimeout(()=>{
  PIXI.BitmapFont.from('Assistant', {
    fontFamily: 'Assistant',
    fontSize: 20,
    fill: 'white'
  }, { 
    chars: [['a','z'],['A','Z'],"!@#$%^&*()~{}[] :.-","0123456789"], 
    resolution: window.devicePixelRatio
  });
})

createArrowTex()

window.files = new FileSystem()
window.selected_sm = ""

createOptionsWindow("select_sm_initial")


window.addEventListener("resize", function(){
  onResize()
})

function onResize() {
  let screenWidth = window.innerWidth
  let screenHeight = window.innerHeight
  app.screen.width = screenWidth;
  app.screen.height = screenHeight;
  app.view.width = screenWidth * app.renderer.resolution;
  app.view.height = screenHeight * app.renderer.resolution;
  app.view.style.width = `${screenWidth}px`;
  app.view.style.height = `${screenHeight}px`;
  app.render()
}
onResize()

window.addEventListener("keydown", function(e) {
  if (e.code == "Tab") {
    e.preventDefault()
  }
  if (e.code == "Enter") {
    if (e.target instanceof HTMLButtonElement) {e.preventDefault()}
  }
})

window.addEventListener("dragstart", function(e) {
  if (e.target instanceof HTMLImageElement) {
    e.preventDefault()
  }
})


