// @ts-check
import Hammer from "hammerjs";

/**
 * @typedef {object} SmoothZoomable
 * @property {HTMLElement} $container
 * @property {HTMLElement} $visibleWorld
 * @property {number} scale
 * @property {function(): void} [attachScrollListeners]
 * @property {function(): void} [detachScrollListeners]
 * @property {function({ clientX: number, clientY: number}): void} updateScaleCenter
 * @property {{ x: number, y: number }} scaleCenter
 */

/** Manages pinch-zoom, ctrl-wheel, and trackpad pinch smooth zooming. */
export class ModeSmoothZoom {
  /** @param {SmoothZoomable} mode */
  constructor(mode) {
    /** @type {SmoothZoomable} */
    this.mode = mode;

    this.pinchMoveFrame = null;
    this.pinchMoveFramePromise = Promise.resolve();
    this.oldScale = 1;
    this.lastEvent = null;
  }

  attach() {
    this.attachCtrlZoom();

    // GestureEvents work only on Safari; they interfere with Hammer,
    // so block them.
    this.mode.$container.addEventListener('gesturestart', this._preventEvent);
    this.mode.$container.addEventListener('gesturechange', this._preventEvent);
    this.mode.$container.addEventListener('gestureend', this._preventEvent);
    this._attachHammer();
  }

  _attachHammer() {
    // Hammer.js by default set userSelect to None; we don't want that!
    // TODO: Is there any way to do this not globally on Hammer?
    delete Hammer.defaults.cssProps.userSelect;
    const hammer = new Hammer.Manager(this.mode.$container, {
      touchAction: "pan-x pan-y",
    });

    hammer.add(new Hammer.Pinch());

    hammer.on("pinchstart", this._pinchStart);
    hammer.on("pinchmove", this._pinchMove);
    hammer.on("pinchend", this._pinchEnd);
    hammer.on("pinchcancel", this._pinchCancel);
  }

  /** @param {Event} ev */
  _preventEvent = (ev) => {
    ev.preventDefault();
    return false;
  }

  _pinchStart = () => {
    // Do this in case the pinchend hasn't fired yet.
    this.oldScale = 1;
    this.mode.$visibleWorld.style.willChange = "transform";
    this.detachCtrlZoom();
    this.mode.detachScrollListeners?.();
  }

  /** @param {HammerInput} e */
  _pinchMove = async (e) => {
    this.lastEvent = e;
    if (!this.pinchMoveFrame) {
      let pinchMoveFramePromiseRes = null;
      this.pinchMoveFramePromise = new Promise(
        (res) => (pinchMoveFramePromiseRes = res)
      );

      // Buffer these events; only update the scale when request animation fires
      this.pinchMoveFrame = requestAnimationFrame(() => {
        this.mode.updateScaleCenter({
          clientX: this.lastEvent.center.x,
          clientY: this.lastEvent.center.y,
        });
        this.mode.scale *= this.lastEvent.scale / this.oldScale;
        this.oldScale = this.lastEvent.scale;
        this.pinchMoveFrame = null;
        pinchMoveFramePromiseRes();
      });
    }
  }

  _pinchEnd = async () => {
    // Want this to happen after the pinchMoveFrame,
    // if one is in progress; otherwise setting oldScale
    // messes up the transform.
    await this.pinchMoveFramePromise;
    this.mode.scaleCenter = { x: 0.5, y: 0.5 };
    this.oldScale = 1;
    this.mode.$visibleWorld.style.willChange = "auto";
    this.attachCtrlZoom();
    this.mode.attachScrollListeners?.();
  }

  _pinchCancel = async () => {
    // iOS fires pinchcancel ~randomly; it looks like it sometimes
    // thinks the pinch becomes a pan, at which point it cancels?
    await this._pinchEnd();
  }

  /** @private */
  attachCtrlZoom() {
    window.addEventListener("wheel", this.handleCtrlWheel, { passive: false });
  }

  /** @private */
  detachCtrlZoom() {
    window.removeEventListener("wheel", this.handleCtrlWheel);
  }

  /**
   * @private
   * @param {WheelEvent} ev
   **/
  handleCtrlWheel = (ev) => {
    if (!ev.ctrlKey) return;
    ev.preventDefault();
    const zoomMultiplier =
        // Zooming on macs was painfully slow; likely due to their better
        // trackpads. Give them a higher zoom rate.
        /Mac/i.test(navigator.platform)
          ? 0.045
          : // This worked well for me on Windows
          0.03;

    // Zoom around the cursor
    this.mode.updateScaleCenter(ev);
    this.mode.scale *= 1 - Math.sign(ev.deltaY) * zoomMultiplier;
  }
}
