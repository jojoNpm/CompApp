// =======================================
// TOAST.JS
// Notification visuelle moderne
// =======================================

let toastTimer = null

// ===============================
// Création / récupération du container
// ===============================
function createToastContainer() {
  let container = document.getElementById("appToast")
  if (container) return container

  container = document.createElement("div")
  container.id = "appToast"
  container.style.cssText = `
    position:fixed;
    top:20px;
    right:20px;
    z-index:9999;
    display:flex;
    flex-direction:column;
    gap:10px;
    pointer-events:none;
  `
  document.body.appendChild(container)
  return container
}

// ===============================
// Création d’un toast
// ===============================
function createToast(message, type = "info", duration = 3000) {
  const container = createToastContainer()
  const toast = document.createElement("div")

  toast.className = `app-toast ${type}`
  toast.innerText = message
  toast.style.cssText = `
    background:#32373d;
    color:white;
    padding:12px 18px;
    border-radius:8px;
    font-size:14px;
    opacity:0;
    transform:translateX(40px);
    transition:all .25s ease;
    pointer-events:auto;
    box-shadow:0 10px 25px rgba(0,0,0,.4);
  `

  if (type === "success") toast.style.background = "#4CAF50"
  if (type === "error") toast.style.background = "#f44336"
  if (type === "warning") toast.style.background = "#ff9800"

  container.appendChild(toast)

  requestAnimationFrame(() => {
    toast.style.opacity = "1"
    toast.style.transform = "translateX(0)"
  })

  startTimer(toast, duration)

  toast.addEventListener("mouseenter", () => clearTimeout(toastTimer))
  toast.addEventListener("mouseleave", () => startTimer(toast, duration))
}

// ===============================
// Timer pour disparition
// ===============================
function startTimer(toast, duration) {
  clearTimeout(toastTimer)

  toastTimer = setTimeout(() => {
    toast.style.opacity = "0"
    toast.style.transform = "translateX(40px)"
    setTimeout(() => toast.remove(), 300)
  }, duration)
}

// ===============================
// Export global
// ===============================
window.toast = {
  show: (msg, duration) => createToast(msg, "info", duration),
  success: (msg, duration) => createToast(msg, "success", duration),
  error: (msg, duration) => createToast(msg, "error", duration),
  warning: (msg, duration) => createToast(msg, "warning", duration),
}

// ===============================
// Alias direct pour compatibilité renderer.js
// ===============================
window.showToast = window.toast.show
window.showToast.success = window.toast.success
window.showToast.error = window.toast.error
window.showToast.warning = window.toast.warning

console.log("[TOAST] chargé")