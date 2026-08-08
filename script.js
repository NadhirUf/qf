// ============================================================================
// CONFIG — edit this to personalize the site
// ============================================================================
const CONFIG = {
  girlfriendName: "Qf", // ganti dengan nama panggilan pacarmu
  sitePassword: "qfimoed", // ganti dengan kata sandi rahasia kalian berdua (tidak case-sensitive)
};

// Photos used in the "Our Photo" scrolling wall (scene-photo-wall).
// Add/remove filenames here — everything else (looping, duplication) is automatic.
const GALLERY_PHOTOS = [
  "assets/img/gallery/photo-01.png",
  "assets/img/gallery/photo-02.png",
  "assets/img/gallery/photo-03.png",
  "assets/img/gallery/photo-04.png",
  "assets/img/gallery/photo-05.png",
  "assets/img/gallery/photo-06.png",
  "assets/img/gallery/photo-07.png",
];

// ============================================================================
// Small helpers
// ============================================================================
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/** Create a floating particle (heart or sparkle) inside the ambient layer. */
function spawnParticle({ emoji, x, duration, size, drift = "rise" } = {}) {
  const layer = $("#particle-layer");
  if (!layer) return;
  const el = document.createElement("span");
  el.className = "particle";
  el.textContent = emoji;
  el.style.left = `${x}vw`;
  el.style.bottom = drift === "rise" ? "-5vh" : "auto";
  el.style.top = drift === "fall" ? "-5vh" : "auto";
  el.style.fontSize = `${size}px`;
  el.style.animation = `${drift === "rise" ? "rise-fade" : "drift-down"} ${duration}s ease-in forwards`;
  layer.appendChild(el);
  setTimeout(() => el.remove(), duration * 1000 + 200);
}

/** Burst of hearts, used as a celebratory hit when the girlfriend taps something. */
function heartBurst(count = 14) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      spawnParticle({
        emoji: ["🤍", "💗", "✨"][Math.floor(Math.random() * 3)],
        x: Math.random() * 100,
        duration: 3.2 + Math.random() * 2,
        size: 14 + Math.random() * 16,
        drift: "rise",
      });
    }, i * 70);
  }
}

/** Gentle continuous petal/sparkle drift, started once and left running softly. */
function startAmbientSparkles() {
  setInterval(() => {
    spawnParticle({
      emoji: Math.random() > 0.5 ? "✨" : "🌸",
      x: Math.random() * 100,
      duration: 5 + Math.random() * 3,
      size: 10 + Math.random() * 10,
      drift: Math.random() > 0.5 ? "rise" : "fall",
    });
  }, 1400);
}

// ============================================================================
// Photo wall — builds the looping "Our Photo" marquee rows
// ============================================================================
/**
 * Rotates an array so a row can show the photos in a different order than
 * the row above/below it (matches the layered, scattered-polaroid reference).
 */
function rotateArray(arr, offset) {
  const n = arr.length;
  return arr.map((_, i) => arr[(i + offset) % n]);
}

/** Small deterministic tilt per photo so the row feels hand-scattered, not robotic. */
const TILT_DEG = [-4, 2, -2, 3, -3, 1, 4];

function buildMarqueeRow({ order, direction, duration }) {
  const row = document.createElement("div");
  row.className = "marquee-row";

  const track = document.createElement("div");
  track.className = "marquee-track";
  track.style.animationDuration = `${duration}s`;
  track.style.animationDirection = direction === "right" ? "reverse" : "normal";

  // Repeat the (re-ordered) list 4x back-to-back. Combined with the
  // -25% keyframe this guarantees a seamless loop even on very wide
  // desktop viewports (there's always at least one extra copy waiting
  // off-screen before the animation resets).
  const REPEATS = 4;
  for (let r = 0; r < REPEATS; r++) {
    order.forEach((src, i) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "Kenangan bersama";
      img.loading = "lazy";
      img.style.transform = `rotate(${TILT_DEG[i % TILT_DEG.length]}deg)`;
      track.appendChild(img);
    });
  }

  row.appendChild(track);
  return row;
}

/**
 * Pause a row's scroll only when one of its photos is clicked/tapped
 * (never on hover/mouseover). Clicking the same photo again — or any other
 * photo in a different row — resumes that row. Delegated on the stack so it
 * keeps working for photos that get rebuilt or added later.
 */
function bindMarqueeClickToPause(stack) {
  stack.addEventListener("click", (e) => {
    const img = e.target.closest(".marquee-track img");
    if (!img) return;
    const row = img.closest(".marquee-row");
    if (!row) return;
    row.classList.toggle("is-paused");
  });
}

function buildPhotoWall() {
  const stack = $("#marquee-stack");
  if (!stack || stack.childElementCount > 0) return; // build once

  const rows = [
    { order: GALLERY_PHOTOS, direction: "left", duration: 34 },
    { order: rotateArray(GALLERY_PHOTOS, 3), direction: "right", duration: 30 },
    { order: rotateArray(GALLERY_PHOTOS, 5), direction: "left", duration: 38 },
  ];

  rows.forEach((config) => stack.appendChild(buildMarqueeRow(config)));
  bindMarqueeClickToPause(stack);
}

// ============================================================================
// Scene manager — swaps the full-viewport panels
// ============================================================================
class SceneManager {
  constructor() {
    this.cover = $("#scene-cover");
    this.gifts = $("#scene-gifts");
    this.photoWall = $("#scene-photo-wall");
  }

  showGifts() {
    this.cover.hidden = true;
    this.gifts.hidden = false;
    this.photoWall.hidden = true;
    window.scrollTo({ top: 0 });
    // stagger the three gift-cards in: left, center(flower), right
    // (the "flower" is the visual center even though it's the 2nd DOM item)
    const cards = $$(".gift-card", this.gifts);
    cards.forEach((card, i) => {
      requestAnimationFrame(() => {
        setTimeout(() => card.classList.add("in-view"), i * 220);
      });
    });
  }

  showPhotoWall() {
    buildPhotoWall();
    this.gifts.hidden = true;
    this.photoWall.hidden = false;
    window.scrollTo({ top: 0 });
  }
}

// ============================================================================
// Modal manager — one reusable open/close system for the three surprises
// ============================================================================
class ModalManager {
  constructor() {
    this.modals = {
      message: $("#modal-message"),
      flower: $("#modal-flower"),
      cake: $("#modal-cake"),
    };
    this.activeKey = null;
    this._bindCloseHandlers();
  }

  _bindCloseHandlers() {
    $$("[data-close]").forEach((btn) => {
      btn.addEventListener("click", () => this.close());
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
  }

  open(key) {
    const modal = this.modals[key];
    if (!modal) return;
    this.activeKey = key;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    document.getElementById("particle-layer").style.display = "none";

    // Replay entrance animations every time it's opened
    this._replayAnimations(modal);

    if (key === "cake") {
      heartBurst(18);
    }
  }

  close() {
    if (!this.activeKey) return;
    const modal = this.modals[this.activeKey];
    modal.hidden = true;
    document.body.style.overflow = "";
    document.getElementById("particle-layer").style.display = "";
    this.activeKey = null;
  }

  /** Force CSS entrance keyframes to restart on repeated opens. */
  _replayAnimations(modal) {
    const animated = $$(
      ".letter-frame, .finale-photo-frame, .bouquet-item",
      modal,
    );
    animated.forEach((el) => {
      el.style.animation = "none";
      // eslint-disable-next-line no-unused-expressions
      el.offsetHeight; // force reflow
      el.style.animation = "";
    });
  }
}

// ============================================================================
// Lock gate — simple client-side password check with animated unlock
// ============================================================================
class LockGate {
  constructor(onUnlock) {
    this.scene = $("#scene-lock");
    this.card = $(".lock-card", this.scene);
    this.form = $("#lock-form");
    this.input = $("#lock-input");
    this.error = $("#lock-error");
    this.onUnlock = onUnlock;

    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this._attempt();
    });

    // Focus the input shortly after load so the person can start typing right away
    setTimeout(() => this.input.focus(), 400);
  }

  _attempt() {
    const value = this.input.value.trim().toLowerCase();
    const answer = CONFIG.sitePassword.trim().toLowerCase();

    if (value.length > 0 && value === answer) {
      this._unlock();
    } else {
      this._shake();
    }
  }

  _shake() {
    this.error.hidden = false;
    this.card.classList.remove("shake");
    // eslint-disable-next-line no-unused-expressions
    this.card.offsetWidth; // force reflow so the animation can replay
    this.card.classList.add("shake");
    this.input.value = "";
    this.input.focus();
  }

  _unlock() {
    this.scene.classList.add("unlocking");
    setTimeout(() => {
      this.scene.hidden = true;
      this.onUnlock();
    }, 600);
  }
}

// ============================================================================
// App bootstrap
// ============================================================================
function init() {
  $("#girlfriend-name").textContent = CONFIG.girlfriendName;

  const scenes = new SceneManager();
  const modals = new ModalManager();

  new LockGate(() => {
    $("#scene-cover").hidden = false;
  });

  $("#cake-trigger").addEventListener("click", () => {
    heartBurst(10);
    setTimeout(() => scenes.showGifts(), 350);
  });

  $$(".gift-card").forEach((card) => {
    card.addEventListener("click", () => modals.open(card.dataset.gift));
  });

  $("#our-photo-trigger").addEventListener("click", () => {
    scenes.showPhotoWall();
  });

  $("#photo-wall-back").addEventListener("click", () => {
    scenes.showGifts();
  });

  startAmbientSparkles();
}

document.addEventListener("DOMContentLoaded", init);
